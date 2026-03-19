const express = require('express');
const https = require('https');
const { query, isPostgreSQL } = require('../config/database');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

const p = (n) => isPostgreSQL ? `$${n}` : '?';

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://tdilapp.com';
const SQUARE_ENV = process.env.SQUARE_ENV || 'production'; // 'sandbox' or 'production'

const SQUARE_BASE = SQUARE_ENV === 'sandbox'
  ? 'connect.squareupsandbox.com'
  : 'connect.squareup.com';

// Helper: Square API call
function squareRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: SQUARE_BASE,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// Ensure orders table exists
const ensureOrdersTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS square_orders (
      id ${isPostgreSQL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      user_id INTEGER,
      square_order_id TEXT,
      square_payment_id TEXT,
      payment_link_id TEXT,
      payment_link_url TEXT,
      status TEXT DEFAULT 'pending',
      total_amount INTEGER,
      items_json TEXT,
      buyer_email TEXT,
      created_at ${isPostgreSQL ? 'TIMESTAMP DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
      updated_at ${isPostgreSQL ? 'TIMESTAMP DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
    )
  `);
};

// POST /api/square/checkout
// Body: { items: [{ id, name, price, quantity, size? }] }
router.post('/checkout', protect, async (req, res) => {
  try {
    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
      return res.status(503).json({ error: 'Square payment not configured. Please contact support.' });
    }

    await ensureOrdersTable();

    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const userId = req.user.id;
    const idempotencyKey = `tdil-${userId}-${Date.now()}`;

    // Build Square line items (amounts in cents)
    const lineItems = items.map(item => ({
      name: item.size ? `${item.name} (${item.size})` : item.name,
      quantity: String(item.quantity || 1),
      base_price_money: {
        amount: Math.round(parseFloat(item.price) * 100),
        currency: 'USD'
      }
    }));

    const totalCents = lineItems.reduce((sum, li, i) =>
      sum + li.base_price_money.amount * parseInt(li.quantity), 0);

    // Create Square payment link
    const squareBody = {
      idempotency_key: idempotencyKey,
      checkout_options: {
        redirect_url: `${APP_BASE_URL}/merch-store?payment=success`,
        ask_for_shipping_address: true,
        merchant_support_email: process.env.SUPPORT_EMAIL || 'info@tdilapp.com'
      },
      order: {
        location_id: SQUARE_LOCATION_ID,
        line_items: lineItems,
        metadata: {
          tdil_user_id: String(userId),
          idempotency_key: idempotencyKey
        }
      },
      payment_note: `tDIL Merch Order — User ${userId}`
    };

    const squareRes = await squareRequest('POST', '/v2/online-checkout/payment-links', squareBody);

    if (squareRes.status !== 200 && squareRes.status !== 201) {
      console.error('Square error:', squareRes.body);
      return res.status(502).json({
        error: 'Failed to create payment link',
        details: squareRes.body?.errors?.[0]?.detail || 'Square API error'
      });
    }

    const paymentLink = squareRes.body.payment_link;

    // Save pending order to DB
    await query(
      `INSERT INTO square_orders
        (user_id, square_order_id, payment_link_id, payment_link_url, status, total_amount, items_json)
       VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, 'pending', ${p(5)}, ${p(6)})`,
      [
        userId,
        paymentLink.order_id || null,
        paymentLink.id,
        paymentLink.url,
        totalCents,
        JSON.stringify(items)
      ]
    );

    res.json({
      checkoutUrl: paymentLink.url,
      orderId: paymentLink.order_id,
      paymentLinkId: paymentLink.id
    });

  } catch (err) {
    console.error('Square checkout error:', err);
    res.status(500).json({ error: 'Checkout failed', details: err.message });
  }
});

// POST /api/square/webhook — Square sends payment completion events here
// Configure in Square Dashboard: https://developer.squareup.com/apps → Webhooks
// Event types to subscribe: payment.completed, order.fulfillment.updated
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const payload = req.body;
    const eventType = payload?.type;

    if (!eventType) {
      return res.status(200).json({ received: true });
    }

    // Handle payment completion
    if (eventType === 'payment.completed' || eventType === 'payment.updated') {
      const payment = payload.data?.object?.payment;
      if (payment && payment.status === 'COMPLETED') {
        const orderId = payment.order_id;
        if (orderId) {
          await ensureOrdersTable();
          // Mark order as paid
          await query(
            `UPDATE square_orders SET status = 'paid', square_payment_id = ${p(1)}, updated_at = ${isPostgreSQL ? 'NOW()' : "datetime('now')"}
             WHERE square_order_id = ${p(2)}`,
            [payment.id, orderId]
          );

          // Optionally deduct stock for each item
          const orders = await query(
            `SELECT items_json, user_id FROM square_orders WHERE square_order_id = ${p(1)}`,
            [orderId]
          );
          if (orders.length > 0 && orders[0].items_json) {
            try {
              const items = JSON.parse(orders[0].items_json);
              for (const item of items) {
                if (item.id) {
                  await query(
                    `UPDATE merch SET stock_quantity = MAX(0, stock_quantity - ${p(1)}) WHERE id = ${p(2)}`,
                    [item.quantity || 1, item.id]
                  ).catch(() => {});
                }
              }
            } catch (_) {}
          }
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Square webhook error:', err);
    res.status(200).json({ received: true }); // Always 200 to Square
  }
});

// POST /api/square/donate — create a Square payment link for a donation
router.post('/donate', protect, async (req, res) => {
  try {
    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
      return res.status(503).json({ error: 'Square payment not configured. Please contact support.' });
    }

    const { amount, note } = req.body;
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 1) {
      return res.status(400).json({ error: 'Minimum donation is $1.00' });
    }

    const userId = req.user.id;
    const idempotencyKey = `tdil-donate-${userId}-${Date.now()}`;
    const amountCents = Math.round(amountNum * 100);

    const squareBody = {
      idempotency_key: idempotencyKey,
      checkout_options: {
        redirect_url: `${APP_BASE_URL}/donate?payment=success&amount=${amountNum}`,
        ask_for_shipping_address: false,
        merchant_support_email: process.env.SUPPORT_EMAIL || 'info@tdilapp.com'
      },
      order: {
        location_id: SQUARE_LOCATION_ID,
        line_items: [{
          name: 'tDIL Community Donation',
          quantity: '1',
          note: note || 'Thank you for supporting tDIL!',
          base_price_money: {
            amount: amountCents,
            currency: 'USD'
          }
        }],
        metadata: {
          tdil_user_id: String(userId),
          donation: 'true'
        }
      },
      payment_note: `tDIL Donation — $${amountNum.toFixed(2)} — User ${userId}`
    };

    const squareRes = await squareRequest('POST', '/v2/online-checkout/payment-links', squareBody);

    if (squareRes.status !== 200 && squareRes.status !== 201) {
      console.error('Square donate error:', squareRes.body);
      return res.status(502).json({
        error: 'Failed to create donation link',
        details: squareRes.body?.errors?.[0]?.detail || 'Square API error'
      });
    }

    const paymentLink = squareRes.body.payment_link;

    // Save donation record
    await ensureOrdersTable();
    await query(
      `INSERT INTO square_orders
        (user_id, square_order_id, payment_link_id, payment_link_url, status, total_amount, items_json)
       VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, 'pending', ${p(5)}, ${p(6)})`,
      [
        userId,
        paymentLink.order_id || null,
        paymentLink.id,
        paymentLink.url,
        amountCents,
        JSON.stringify([{ name: 'Donation', amount: amountNum, quantity: 1 }])
      ]
    );

    res.json({ checkoutUrl: paymentLink.url });

  } catch (err) {
    console.error('Square donate error:', err);
    res.status(500).json({ error: 'Donation failed', details: err.message });
  }
});

// GET /api/square/orders — user's own order history
router.get('/orders', protect, async (req, res) => {
  try {
    await ensureOrdersTable();
    const userId = req.user.id;
    const orders = await query(
      `SELECT id, square_order_id, status, total_amount, items_json, created_at
       FROM square_orders WHERE user_id = ${p(1)} ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );
    res.json(orders.map(o => ({
      ...o,
      items: (() => { try { return JSON.parse(o.items_json); } catch { return []; } })(),
      total: (o.total_amount / 100).toFixed(2)
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
  }
});

module.exports = router;
