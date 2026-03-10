import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logoImg from '../assets/tdil-LOGO.png';

export default function PortalLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [portalType, setPortalType] = useState('partner'); // 'partner' | 'sponsor'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Invalid credentials.');
        setLoading(false);
        return;
      }

      const { token, user } = data;
      const allowed = ['partner_school', 'employer', 'sponsor', 'admin', 'founder'];

      if (!allowed.includes(user.userType)) {
        setError('This portal is for partner schools, employers, and sponsors only. Members should log in at the main site.');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Route based on user type
      if (user.userType === 'sponsor') {
        navigate('/portal/sponsor');
      } else if (user.userType === 'employer') {
        navigate('/portal/employer');
      } else {
        navigate('/portal/partner');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex flex-col items-center justify-center p-4">

      {/* Logo + header */}
      <div className="text-center mb-8">
        <img src={logoImg} alt="tDIL" className="h-12 object-contain mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-white">tDIL Partner Portal</h1>
        <p className="text-blue-200 text-sm mt-1">Analytics & insights for partners, schools & sponsors</p>
      </div>

      {/* Portal type selector */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setPortalType('partner')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${portalType === 'partner' ? 'bg-white text-blue-900 shadow' : 'bg-blue-700 text-blue-100 hover:bg-blue-600'}`}>
          🏫 Partner School / Employer
        </button>
        <button onClick={() => setPortalType('sponsor')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${portalType === 'sponsor' ? 'bg-white text-blue-900 shadow' : 'bg-blue-700 text-blue-100 hover:bg-blue-600'}`}>
          🤝 Sponsor
        </button>
      </div>

      {/* Login card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {portalType === 'partner' ? '🏫 Partner School / Employer Login' : '🤝 Sponsor Login'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {portalType === 'partner'
            ? 'View member check-ins, visit data, and engagement at your institution.'
            : 'View check-ins at your location, points awarded, and member activity.'}
        </p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your@organization.com" autoComplete="email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••" autoComplete="current-password" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60">
            {loading ? 'Signing in...' : 'Sign In to Portal'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center text-sm text-gray-500">
          Are you a tDIL member?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">Member login →</Link>
        </div>
      </div>

      <p className="text-blue-300 text-xs mt-6">
        Need access? Contact <a href="mailto:info@tdilapp.com" className="underline">info@tdilapp.com</a>
      </p>
    </div>
  );
}
