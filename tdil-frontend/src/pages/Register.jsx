import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { register } from '../services/authService';

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    company: '',
    jobTitle: '',
    cohort: '',
    inviteToken: ''
  });
  const [cohortOptions, setCohortOptions] = useState([]);
  const [cohortLoading, setCohortLoading] = useState(true);
  const [customCohort, setCustomCohort] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Load cohort options from the public API (no auth required)
  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const res = await fetch('/api/cohorts/names');
        if (res.ok) {
          const data = await res.json();
          setCohortOptions(Array.isArray(data) ? data : []);
        }
      } catch (_) {
        // Silently fail — cohort selection just won't be pre-populated
      } finally {
        setCohortLoading(false);
      }
    };
    fetchCohorts();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cohort') {
      if (value === '__other__') {
        setShowCustomInput(true);
        setFormData(prev => ({ ...prev, cohort: '' }));
      } else {
        setShowCustomInput(false);
        setCustomCohort('');
        setFormData(prev => ({ ...prev, cohort: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.inviteToken) {
        setError('Please fill in all required fields, including the invite token.');
        return;
      }

      // Use custom cohort input if "Other" was selected
      const cohortValue = showCustomInput ? customCohort.trim() : formData.cohort;

      const response = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        company: formData.company,
        jobTitle: formData.jobTitle,
        cohort: cohortValue || null,
        inviteToken: formData.inviteToken
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      navigate('/dashboard');
      window.location.reload();
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xl">
              tDIL
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join the Directory
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect with Indianapolis leaders
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <div className="space-y-4">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="sr-only">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="First Name"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="sr-only">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Last Name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Email address"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Password"
              />
            </div>

            {/* Company */}
            <div>
              <label htmlFor="company" className="sr-only">Company</label>
              <input
                id="company"
                name="company"
                type="text"
                value={formData.company}
                onChange={handleChange}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Company (optional)"
              />
            </div>

            {/* Job Title */}
            <div>
              <label htmlFor="jobTitle" className="sr-only">Job Title</label>
              <input
                id="jobTitle"
                name="jobTitle"
                type="text"
                value={formData.jobTitle}
                onChange={handleChange}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Job Title (optional)"
              />
            </div>

            {/* ── Cohort Dropdown ── */}
            <div>
              <label htmlFor="cohort" className="block text-sm font-medium text-gray-700 mb-1">
                🎓 Cohort
                <span className="ml-1 text-gray-400 font-normal">(optional — you can add this later)</span>
              </label>

              {cohortLoading ? (
                <div className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-400">
                  Loading cohorts…
                </div>
              ) : (
                <select
                  id="cohort"
                  name="cohort"
                  value={showCustomInput ? '__other__' : formData.cohort}
                  onChange={handleChange}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
                >
                  <option value="">— Skip for now —</option>
                  {cohortOptions.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.name}{c.memberCount > 0 ? ` (${c.memberCount} ${c.memberCount === 1 ? 'member' : 'members'})` : ''}
                    </option>
                  ))}
                  <option value="__other__">Other / Not listed…</option>
                </select>
              )}

              {/* Custom cohort text input (shown when "Other" is selected) */}
              {showCustomInput && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={customCohort}
                    onChange={e => setCustomCohort(e.target.value)}
                    className="appearance-none rounded-lg block w-full px-3 py-2 border border-blue-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Type your cohort name…"
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Your cohort will be reviewed and added to the official list.
                  </p>
                </div>
              )}

              {!showCustomInput && (
                <p className="mt-1 text-xs text-gray-500">
                  Select the cohort you belong to. Don't see yours?{' '}
                  <button
                    type="button"
                    onClick={() => { setShowCustomInput(true); }}
                    className="text-blue-600 hover:underline"
                  >
                    Enter it manually.
                  </button>
                </p>
              )}
            </div>

            {/* Invite Token */}
            <div>
              <label htmlFor="inviteToken" className="sr-only">Invite Token</label>
              <input
                id="inviteToken"
                name="inviteToken"
                type="text"
                required
                value={formData.inviteToken}
                onChange={handleChange}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Invite Token (required)"
              />
              <p className="mt-1 text-xs text-gray-500">
                Contact an administrator to get your invite token.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
