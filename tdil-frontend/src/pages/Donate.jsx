import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';

const PRESET_AMOUNTS = [100, 500, 1000];

// ── Zeffy donation form embed URL ──────────────────────────────────────────
// Set your Zeffy form ID here — found in your Zeffy dashboard under Share/Embed
// e.g. "https://www.zeffy.com/en-US/embed/donation-form/your-form-id-here"
const ZEFFY_EMBED_URL = 'https://www.zeffy.com/en-US/embed/donation-form/tdil-community-fund';
// Set to null to hide the Zeffy section until you have a real form ID
const SHOW_ZEFFY = true;

export default function Donate() {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedAmount, setSelectedAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success' | null
  const [paidAmount, setPaidAmount] = useState(null);

  // Handle Square redirect return
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'success') {
      const amt = params.get('amount');
      setPaymentStatus('success');
      setPaidAmount(amt ? parseFloat(amt).toFixed(2) : null);
      navigate('/donate', { replace: true });
    }
  }, [location.search]);

  const finalAmount = useCustom
    ? parseFloat(customAmount) || 0
    : selectedAmount;

  const handleDonate = async () => {
    if (finalAmount < 1) {
      alert('Please enter a donation amount of at least $1.00');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/square/donate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalAmount, note: note || undefined })
      });

      const data = await res.json();
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || data.details || 'Donation failed. Please try again.');
      }
    } catch {
      alert('Donation failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      userType={user?.userType || 'member'}
      title="Support Our Mission"
      subtitle="Your donation helps us continue to provide valuable resources and networking opportunities"
      showPointsInHeader={true}
      userPoints={user?.points || 0}
    >
      <div className="max-w-2xl mx-auto">

        {/* Success banner */}
        {paymentStatus === 'success' && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">✅</span>
            <div>
              <div className="font-semibold text-green-800 text-lg">
                Thank you for your donation{paidAmount ? ` of $${paidAmount}` : ''}!
              </div>
              <div className="text-sm text-green-700 mt-1">
                Your generosity helps us provide resources, networking opportunities, and support to our community. You've also earned <strong>+100 points</strong>!
              </div>
            </div>
          </div>
        )}

        {/* ── Zeffy Donation Form (Primary) ── */}
        {SHOW_ZEFFY && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💚</span>
                <div>
                  <h2 className="font-bold text-gray-900">Donate with Zeffy</h2>
                  <p className="text-xs text-gray-500">100% of your donation goes to tDIL — Zeffy charges us nothing</p>
                </div>
              </div>
            </div>
            <div className="relative" style={{ minHeight: 500 }}>
              <iframe
                title="tDIL Donation Form"
                allowTransparency="true"
                allow="payment"
                src={ZEFFY_EMBED_URL}
                className="w-full border-0"
                style={{ minHeight: 500, height: 600 }}
              />
            </div>
          </div>
        )}

        {/* Divider */}
        {SHOW_ZEFFY && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Or donate via Square</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        )}

        {/* ── Square Hero card ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">❤️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Support Our Mission</h2>
            <p className="text-gray-600 max-w-lg mx-auto text-sm leading-relaxed">
              Your donation helps us continue to provide valuable resources, networking opportunities,
              and support to our community members. Every contribution makes a difference.
            </p>
          </div>

          {/* Preset amounts */}
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-3">Select an amount</div>
            <div className="grid grid-cols-3 gap-3">
              {PRESET_AMOUNTS.map(amt => (
                <button
                  key={amt}
                  onClick={() => { setSelectedAmount(amt); setUseCustom(false); setCustomAmount(''); }}
                  className={`py-4 rounded-xl border-2 text-center font-bold transition-all ${
                    !useCustom && selectedAmount === amt
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="text-2xl">${amt.toLocaleString()}</div>
                  <div className="text-xs font-normal text-gray-500 mt-1">
                    {amt === 100 ? 'Supporter' : amt === 500 ? 'Advocate' : 'Champion'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-2">Or enter a custom amount</div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Enter amount"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setUseCustom(!!e.target.value); }}
                onFocus={() => setUseCustom(true)}
                className={`w-full pl-9 pr-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                  useCustom ? 'border-blue-600 bg-blue-50' : 'border-gray-200 focus:border-blue-400'
                }`}
              />
            </div>
          </div>

          {/* Optional note */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add a note <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., In honor of my cohort..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Recurring note */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-blue-500 text-lg flex-shrink-0 mt-0.5">🔁</span>
            <div className="text-sm text-blue-800">
              <strong>Recurring donations</strong> — After completing your donation, Square will email you a receipt with options to manage future giving. Full recurring/subscription support coming soon.
            </div>
          </div>

          {/* Donate button */}
          <button
            onClick={handleDonate}
            disabled={loading || finalAmount < 1}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><span className="animate-spin">⏳</span> Redirecting to Square...</>
            ) : (
              <><span>💳</span> Donate ${finalAmount >= 1 ? finalAmount.toLocaleString() : '—'} with Square</>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">Secure payment powered by Square</p>
        </div>

        {/* Why donate */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Why Donate?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: '📅', title: 'Community Events', desc: 'Fund networking events and meetups' },
              { icon: '📚', title: 'Educational Resources', desc: 'Support workshops and training programs' },
              { icon: '🤝', title: 'Mentorship Programs', desc: 'Connect members with industry professionals' },
              { icon: '🖥️', title: 'Platform Maintenance', desc: 'Keep our platform running and improving' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{icon}</span>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{title}</div>
                  <div className="text-sm text-gray-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
