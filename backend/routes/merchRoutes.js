const express = require('express');
const { query } = require('../config/database');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Get all active merch items
router.get('/', async (req, res) => {
  try {
    const items = await query(
      `SELECT m.*, u.firstname || ' ' || u.lastname as "addedByName"
       FROM merch m
       LEFT JOIN users u ON m.created_by = u.id
       WHERE m.is_active = true
       ORDER BY m.created_at DESC`
    );

    const formatted = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      pointsCost: item.points_cost,
      imageUrl: item.image_url,
      category: item.category,
      stockQuantity: item.stock_quantity,
      addedByName: item.addedByName,
      createdAt: item.created_at
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching merch:', err);
    res.status(500).json({ error: 'Failed to fetch merch', details: err.message });
  }
});

// Get single merch item
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const items = await query('SELECT * FROM merch WHERE id = $1', [id]);
    
    if (items.length === 0) {
      return res.status(404).json({ error: 'Merch item not found' });
    }

    const item = items[0];
    res.json({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      pointsCost: item.points_cost,
      imageUrl: item.image_url,
      category: item.category,
      stockQuantity: item.stock_quantity,
      isActive: item.is_active,
      createdAt: item.created_at
    });
  } catch (err) {
    console.error('Error fetching merch item:', err);
    res.status(500).json({ error: 'Failed to fetch merch item', details: err.message });
  }
});

// Add merch item (admin/founder only)
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, price, pointsCost, imageUrl, category, stockQuantity } = req.body;
    const userType = req.user.userType;

    // Only admin/founder can add merch
    if (userType !== 'admin' && userType !== 'founder') {
      return res.status(403).json({ error: 'Only admins can add merch items' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await query(
      `INSERT INTO merch (name, description, price, points_cost, image_url, category, stock_quantity, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name, description || null, price || null, pointsCost || null, imageUrl || null, category || null, stockQuantity || 0, req.user.id]
    );

    res.status(201).json({
      message: 'Merch item added successfully',
      merchId: result[0]?.id
    });
  } catch (err) {
    console.error('Error adding merch:', err);
    res.status(500).json({ error: 'Failed to add merch item', details: err.message });
  }
});

// Update merch item (admin/founder only)
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, pointsCost, imageUrl, category, stockQuantity, isActive } = req.body;
    const userType = req.user.userType;

    if (userType !== 'admin' && userType !== 'founder') {
      return res.status(403).json({ error: 'Only admins can update merch items' });
    }

    const existing = await query('SELECT id FROM merch WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Merch item not found' });
    }

    await query(
      `UPDATE merch SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        points_cost = COALESCE($4, points_cost),
        image_url = COALESCE($5, image_url),
        category = COALESCE($6, category),
        stock_quantity = COALESCE($7, stock_quantity),
        is_active = COALESCE($8, is_active)
       WHERE id = $9`,
      [name, description, price, pointsCost, imageUrl, category, stockQuantity, isActive, id]
    );

    res.json({ message: 'Merch item updated successfully' });
  } catch (err) {
    console.error('Error updating merch:', err);
    res.status(500).json({ error: 'Failed to update merch item', details: err.message });
  }
});

// Delete merch item (admin/founder only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userType = req.user.userType;

    if (userType !== 'admin' && userType !== 'founder') {
      return res.status(403).json({ error: 'Only admins can delete merch items' });
    }

    const existing = await query('SELECT id FROM merch WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Merch item not found' });
    }

    await query('DELETE FROM merch WHERE id = $1', [id]);
    res.json({ message: 'Merch item deleted successfully' });
  } catch (err) {
    console.error('Error deleting merch:', err);
    res.status(500).json({ error: 'Failed to delete merch item', details: err.message });
  }
});

module.exports = router;
