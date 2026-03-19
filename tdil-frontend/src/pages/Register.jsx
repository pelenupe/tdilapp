import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { register } from '../services/authService';

// ── Per-type config ───────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  member: {
    label: '🎓 tDIL Member',
    color: 'blue',
    accent: 'bg-blue-600',
    ring: 'focus:ring-blue-500 focus:border-blue-500',
    badge: 'bg-blue-100 text-blue-800',
    title: 'Join the Community',
    subtitle: 'Connect with Indianapolis leaders',
    cta: 'Create Member Account',
    showCohort: true,
    fields: {
      firstNameLabel: 'First Name',
      lastNameLabel: 'Last Name',
      companyLabel: 'Company (optional)',
      jobTitleLabel: 'Job Title (optional)',
      companyRequired: false,
      jobTitleRequired: false,
    }
  },
  partner_school: {
    label: '🏫 Partner School',
    color: 'purple',
    accent: 'bg-purple-600',
    ring: 'focus:ring-purple-500 focus:border-purple-500',
    badge: 'bg-purple-100 text-purple-800',
    title: 'Partner School Registration',
    subtitle: 'Join tDIL as a partner educational institution',
    cta: 'Create School Account',
    showCohort: false,
    fields: {
      firstNameLabel: 'Primary Contact — First Name',
      lastNameLabel: 'Last Name',
      companyLabel: 'School / Institution Name',
      jobTitleLabel: 'Department or Program',
      websiteLabel: 'School Website (optional)',
      companyRequired: true,
      jobTitleRequired: false,
    }
  },
  sponsor: {
    label: '🤝 Sponsor',
    color: 'emerald',
    accent: 'bg-emerald-600',
    ring: 'focus:ring-emerald-500 focus:border-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800',
    title: 'Sponsor Registration',
    subtitle: 'Partner with tDIL and engage our community',
    cta: 'Create Sponsor Account',
    showCohort: false,
    fields: {
      firstNameLabel: 'Sponsorship Contact — First Name',
      lastNameLabel: 'Last Name',
      companyLabel: 'Organization / Company Name',
      jobTitleLabel: 'Industry or Category (optional)',
      websiteLabel: 'Company Website (optional)',
      companyRequired: true,
      jobTitleRequired: false,
    }
  },
  employer: {
    label: '💼 Employer',
    color: 'orange',
    accent: 'bg-orange-600',
    ring: 'focus:ring-orange-500 focus:border-orange-500',
    badge: 'bg-orange-100 text-orange-800',
    title: 'Employer Registration',
    subtitle: 'Connect with diverse talent in the tDIL community',
    cta: 'Create Employer Account',
    showCohort: false,
    fields: {
      firstNameLabel: 'HR / Recruiting Contact — First Name',
      lastNameLabel: 'Last Name',
      companyLabel: 'Company Name',
      jobTitleLabel: 'Industry (optional)',
      websiteLabel: 'Company Website (optional)',
      companyRequired: true,
      jobTitleRequired: false,
    }
  }
};

const PORTAL_REDIRECTS = {
  partner_school: '/portal/partner',
  sponsor: '/portal/sponsor',
  employer: '/portal/employer',
  admin: '/admin',
  founder: '/admin',
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '',
    company: '', jobTitle: '', website: '', cohort: '',
    inviteToken: ''
  });

  const [detectedType, setDetectedType] = useState(null); // null = not validated yet
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenChecking, setTokenChecking] = useState(false);
  const [tokenError, setTokenError] = useState('');

  const [cohortOptions, setCohortOptions] = useState([]);
  const [cohortLoading, setCohortLoading] = useState(false);
  const [customCohort, setCustomCohort] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tokenDebounce = useRef(null);

  // Load cohorts when needed
  useEffect(() => {
    if (detectedType === 'member') {
      setCohortLoading(true);
      fetch('/api/cohorts/names')
        .then(r => r.ok ? r.json() : [])
        .then(data => setCohortOptions(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setCohortLoading(false));
    }
  }, [detectedType]);

  // Validate token on input (debounced)
  const validateToken = async (token) => {
    if (!token || token.trim().length < 6) {
      setDetectedType(null);
      setTokenValid(false);
      setTokenError('');
      return;
    }
    setTokenChecking(true);
    setTokenError('');
    try {
      const res = await fetch(`/api/invites/validate/${encodeURIComponent(token.trim())}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setDetectedType(data.userType || 'member');
        setTokenValid(true);
        setTokenError('');
      } else {
        setDetectedType(null);
        setTokenValid(false);
        setTokenError(data.message || 'Invalid or expired invite token');
      }
    } catch (_) {
      setDetectedType(null);
      setTokenValid(false);
      setTokenError('Could not validate token. Check your connection.');
    } finally {
      setTokenChecking(false);
    }
  };

  const handleTokenChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, inviteToken: val }));
    clearTimeout(tokenDebounce.current);
    tokenDebounce.current = setTimeout(() => validateToken(val), 500);
  };

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

    if (!tokenValid) {
      setError('Please enter a valid invite token first.');
      setLoading(false);
      return;
    }

    const cfg = TYPE_CONFIG[detectedType] || TYPE_CONFIG.member;
    if (cfg.fields.companyRequired && !formData.company.trim()) {
      setError(`${cfg.fields.companyLabel} is required.`);
      setLoading(false);
      return;
    }

    const cohortValue = detectedType === 'member'
      ? (showCustomInput ? customCohort.trim() : formData.cohort)
      : null;

    try {
      const response = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        company: formData.company || null,
        jobTitle: formData.jobTitle || null,
        website: formData.website || null,
        cohort: cohortValue || null,
        inviteToken: formData.inviteToken.trim()
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      const dest = PORTAL_REDIRECTS[response.data.user?.userType] || '/dashboard';
      navigate(dest);
      window.location.reload();
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const cfg = detectedType ? (TYPE_CONFIG[detectedType] || TYPE_CONFIG.member) : null;
  const inputBase = `appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 text-sm focus:outline-none ${cfg?.ring || 'focus:ring-blue-500 focus:border-blue-500'}`;
  const labelBase = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${cfg?.accent || 'bg-blue-600'} text-white text-2xl font-black mb-4 shadow-lg transition-all duration-300`}>
            {cfg ? cfg.label.split(' ')[0] : '🎓'}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            {cfg?.title || 'Create Your Account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {cfg?.subtitle || 'Enter your invite token to get started'}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleRegister}>

          {/* ── Step 1: Invite Token ─────────────────────────────────── */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <label className={labelBase}>
              🔑 Invite Token <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                name="inviteToken"
                type="text"
                required
                value={formData.inviteToken}
                onChange={handleTokenChange}
                className={`${inputBase} pr-8 ${tokenValid ? 'border-green-400' : tokenError ? 'border-red-400' : ''}`}
                placeholder="Your invite token (e.g. TDIL-MEMBER-2024)"
                autoFocus
              />
              {tokenChecking && (
                <span className="absolute right-2 top-2.5 text-gray-400 text-sm">…</span>
              )}
              {tokenValid && !tokenChecking && (
                <span className="absolute right-2 top-2.5 text-green-500">✓</span>
              )}
              {tokenError && !tokenChecking && (
                <span className="absolute right-2 top-2.5 text-red-500 text-xs">✗</span>
              )}
            </div>
            {tokenError && <p className="mt-1 text-xs text-red-600">{tokenError}</p>}
            {tokenValid && detectedType && (
              <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg?.badge}`}>
                {cfg?.label} — token accepted
              </div>
            )}
            {!tokenValid && !tokenError && (
              <p className="mt-1 text-xs text-gray-500">Contact an administrator if you need an invite token.</p>
            )}
          </div>

          {/* ── Step 2: Account details (only shown once token validated) ── */}
          {tokenValid && cfg && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 space-y-4 animate-fade-in">

              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {detectedType === 'member' ? 'Your Details' : 'Organization & Contact'}
              </h3>

              {/* First + Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>{cfg.fields.firstNameLabel} <span className="text-red-500">*</span></label>
                  <input name="firstName" type="text" required value={formData.firstName} onChange={handleChange}
                    className={inputBase} placeholder="First name" />
                </div>
                <div>
                  <label className={labelBase}>{cfg.fields.lastNameLabel} <span className="text-red-500">*</span></label>
                  <input name="lastName" type="text" required value={formData.lastName} onChange={handleChange}
                    className={inputBase} placeholder="Last name" />
                </div>
              </div>

              {/* Organization/Company name — for non-members, show prominently */}
              {detectedType !== 'member' && (
                <div>
                  <label className={labelBase}>
                    {cfg.fields.companyLabel}
                    {cfg.fields.companyRequired && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <input name="company" type="text" required={cfg.fields.companyRequired}
                    value={formData.company} onChange={handleChange}
                    className={inputBase}
                    placeholder={cfg.fields.companyLabel.replace(' (optional)', '')} />
                </div>
              )}

              {/* Email */}
              <div>
                <label className={labelBase}>Email Address <span className="text-red-500">*</span></label>
                <input name="email" type="email" required value={formData.email} onChange={handleChange}
                  className={inputBase} placeholder="you@example.com" />
              </div>

              {/* Password */}
              <div>
                <label className={labelBase}>Password <span className="text-red-500">*</span></label>
                <input name="password" type="password" required value={formData.password} onChange={handleChange}
                  className={inputBase} placeholder="Choose a strong password" />
              </div>

              {/* For members: company + job title */}
              {detectedType === 'member' && (
                <>
                  <div>
                    <label className={labelBase}>{cfg.fields.companyLabel}</label>
                    <input name="company" type="text" value={formData.company} onChange={handleChange}
                      className={inputBase} placeholder="Your company or organization" />
                  </div>
                  <div>
                    <label className={labelBase}>{cfg.fields.jobTitleLabel}</label>
                    <input name="jobTitle" type="text" value={formData.jobTitle} onChange={handleChange}
                      className={inputBase} placeholder="Your role or title" />
                  </div>
                </>
              )}

              {/* For non-members: job title = role/industry */}
              {detectedType !== 'member' && (
                <div>
                  <label className={labelBase}>{cfg.fields.jobTitleLabel}</label>
                  <input name="jobTitle" type="text" value={formData.jobTitle} onChange={handleChange}
                    className={inputBase} placeholder={cfg.fields.jobTitleLabel.replace(' (optional)', '')} />
                </div>
              )}

              {/* Website — for non-members */}
              {detectedType !== 'member' && cfg.fields.websiteLabel && (
                <div>
                  <label className={labelBase}>{cfg.fields.websiteLabel}</label>
                  <input name="website" type="url" value={formData.website} onChange={handleChange}
                    className={inputBase} placeholder="https://yoursite.com" />
                </div>
              )}

              {/* Cohort — only for members */}
              {cfg.showCohort && (
                <div>
                  <label className={labelBase}>
                    🎓 Cohort
                    <span className="ml-1 text-gray-400 font-normal text-xs">(optional — you can add this later)</span>
                  </label>
                  {cohortLoading ? (
                    <div className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-400">Loading cohorts…</div>
                  ) : (
                    <select name="cohort"
                      value={showCustomInput ? '__other__' : formData.cohort}
                      onChange={handleChange}
                      className={`${inputBase} bg-white`}>
                      <option value="">— Skip for now —</option>
                      {cohortOptions.map(c => (
                        <option key={c.name} value={c.name}>
                          {c.name}{c.memberCount > 0 ? ` (${c.memberCount} ${c.memberCount === 1 ? 'member' : 'members'})` : ''}
                        </option>
                      ))}
                      <option value="__other__">Other / Not listed…</option>
                    </select>
                  )}
                  {showCustomInput && (
                    <div className="mt-2">
                      <input type="text" value={customCohort} onChange={e => setCustomCohort(e.target.value)}
                        className={`${inputBase} border-blue-300`} placeholder="Type your cohort name…" autoFocus />
                      <p className="mt-1 text-xs text-gray-500">Your cohort will be reviewed and added to the list.</p>
                    </div>
                  )}
                  {!showCustomInput && (
                    <p className="mt-1 text-xs text-gray-500">
                      Don't see yours?{' '}
                      <button type="button" onClick={() => setShowCustomInput(true)} className="text-blue-600 hover:underline">
                        Enter it manually.
                      </button>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !tokenValid}
            className={`w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-lg text-white ${cfg?.accent || 'bg-blue-600'} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all`}
          >
            {loading ? 'Creating Account…' : (cfg?.cta || 'Create Account')}
          </button>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Sign in</Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
