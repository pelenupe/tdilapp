import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logoImg from '../assets/tdil-LOGO.png';
import { Save, Video, Monitor, BookOpen, Mail, User as UserIcon, Calendar, CheckCircle } from 'lucide-react';

function StatCard({ icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-3xl font-bold">{value ?? '—'}</div>
      <div className="font-medium text-sm mt-1">{label}</div>
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
    </div>
  );
}

function Initials({ name }) {
  const parts = (name || '').split(' ');
  const init = parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
      {init || '?'}
    </div>
  );
}

export default function PartnerPortal() {
  const navigate = useNavigate();
  const [portalUser, setPortalUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [topVisitors, setTopVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [ciPage, setCiPage] = useState(1);
  const [ciTotal, setCiTotal] = useState(0);
  const [ciTotalPages, setCiTotalPages] = useState(1);
  const [adminCompany, setAdminCompany] = useState('');
  const [adminInput, setAdminInput] = useState('');
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const isAdmin = ['admin', 'founder'].includes(JSON.parse(localStorage.getItem('user') || '{}').userType);
  const isSchool = JSON.parse(localStorage.getItem('user') || '{}').userType === 'partner_school';

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { navigate('/portal/login'); return; }
    loadAll('');
    if (isSchool || isAdmin) loadSchoolProfile();
  }, []);

  const loadSchoolProfile = async () => {
    try {
      const res = await fetch('/api/portal/school-profile', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSchoolProfile(data.school);
      }
    } catch (_) {}
  };

  const handleProfileFieldChange = (field, value) => {
    setSchoolProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const res = await fetch('/api/portal/school-profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: schoolProfile.bio,
          jobTitle: schoolProfile.jobTitle,
          calendly_url: schoolProfile.calendly_url,
          school_intro_video_url: schoolProfile.school_intro_video_url,
          school_zoom_url: schoolProfile.school_zoom_url,
          school_contact_name: schoolProfile.school_contact_name,
          school_contact_email: schoolProfile.school_contact_email,
          school_materials_url: schoolProfile.school_materials_url,
        })
      });
      if (res.ok) {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      }
    } catch (_) {}
    finally { setProfileSaving(false); }
  };

  const buildCompanyParam = (company) => company ? `&company=${encodeURIComponent(company)}` : '';

  const loadAll = async (companyOverride) => {
    setLoading(true);
    const cp = buildCompanyParam(companyOverride);
    try {
      const [meRes, statsRes, topRes] = await Promise.all([
        fetch('/api/portal/me', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/portal/stats?_=1${cp}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/portal/top-visitors?_=1${cp}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (meRes.status === 401 || meRes.status === 403) {
        navigate('/portal/login'); return;
      }

      const meData = await meRes.json();
      const statsData = await statsRes.json();
      const topData = await topRes.json();

      setPortalUser(meData.user);
      setStats(statsData);
      setTopVisitors(topData);
      await loadCheckins(1, companyOverride);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSearch = (e) => {
    e.preventDefault();
    setAdminCompany(adminInput);
    loadAll(adminInput);
  };

  const loadCheckins = async (page, companyOverride) => {
    const cp = buildCompanyParam(companyOverride !== undefined ? companyOverride : adminCompany);
    const res = await fetch(`/api/portal/checkins?page=${page}&limit=20${cp}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setCheckins(data.checkins || []);
    setCiTotal(data.total || 0);
    setCiTotalPages(data.totalPages || 1);
    setCiPage(page);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/portal/login');
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <img src={logoImg} alt="tDIL" className="h-10 mx-auto mb-3 animate-pulse" />
        <div className="text-gray-500 text-sm">Loading portal...</div>
      </div>
    </div>
  );

  const typeLabel = portalUser?.userType === 'employer' ? 'Employer' : 'Partner School';
  const typeIcon = portalUser?.userType === 'employer' ? '💼' : '🏫';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="tDIL" className="h-8 object-contain" />
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">tDIL Partner Portal</div>
              <div className="text-xs text-gray-500">{typeIcon} {typeLabel}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">{portalUser?.firstName} {portalUser?.lastName}</div>
              <div className="text-xs text-gray-500">{portalUser?.company}</div>
            </div>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-red-200 transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Admin org picker */}
        {isAdmin && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">🛡 Admin Mode</span>
              <form onSubmit={handleAdminSearch} className="flex gap-2 flex-1 min-w-0">
                <input
                  value={adminInput}
                  onChange={e => setAdminInput(e.target.value)}
                  placeholder="Enter org / school name to view their data..."
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white"
                />
                <button type="submit" className="px-3 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors">
                  View →
                </button>
              </form>
              {adminCompany && (
                <button onClick={() => { setAdminCompany(''); setAdminInput(''); loadAll(''); }}
                  className="text-xs text-amber-600 hover:underline">Clear</button>
              )}
            </div>
            {adminCompany && (
              <div className="mt-1.5 text-xs text-amber-700">Viewing data for: <strong>{adminCompany}</strong></div>
            )}
          </div>
        )}

        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{typeIcon} {adminCompany || portalUser?.company || 'Your Organization'}</h1>
          <p className="text-gray-500 text-sm mt-1">Member engagement & check-in analytics</p>
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon="📍" label="Total Check-Ins" value={stats.totalCheckins.toLocaleString()} color="blue" />
            <StatCard icon="👥" label="Unique Visitors" value={stats.uniqueVisitors.toLocaleString()} color="green" />
            <StatCard icon="📅" label="This Month" value={stats.thisMonth.toLocaleString()} sub={`${stats.thisWeek} this week`} color="purple" />
            <StatCard icon="⭐" label="Points Awarded" value={stats.totalPointsAwarded.toLocaleString()} color="orange" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200 overflow-x-auto">
          {[
            { key: 'overview', label: '📊 Top Visitors' },
            { key: 'checkins', label: `📋 Check-In Log (${ciTotal})` },
            ...(isSchool || isAdmin ? [{ key: 'profile', label: '🏫 School Profile' }] : []),
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Top Visitors */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">🏆 Top Visitors at {portalUser?.company}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Ranked by number of check-ins at your location</p>
            </div>
            {topVisitors.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                <p>No check-ins recorded yet at your location.</p>
                <p className="text-xs mt-1">Check-in data will appear once members check in here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {topVisitors.map((visitor, i) => (
                  <div key={visitor.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'}`}>
                      {i + 1}
                    </div>
                    {visitor.profileImage ? (
                      <img src={visitor.profileImage} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" onError={e => e.target.style.display='none'} />
                    ) : (
                      <Initials name={`${visitor.firstName} ${visitor.lastName}`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">{visitor.firstName} {visitor.lastName}</div>
                      <div className="text-xs text-gray-500 truncate">{visitor.jobTitle || visitor.user_company || ''}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-blue-600">{visitor.visit_count} visits</div>
                      <div className="text-xs text-gray-500">+{visitor.points_earned_here} pts here</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Check-In Log */}
        {activeTab === 'checkins' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">📋 Check-In Log</h2>
              <p className="text-xs text-gray-500 mt-0.5">All member check-ins at {portalUser?.company}</p>
            </div>
            {checkins.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                <p>No check-ins yet.</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {checkins.map(ci => (
                    <div key={ci.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                      {ci.profileImage ? (
                        <img src={ci.profileImage} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <Initials name={`${ci.firstName || ''} ${ci.lastName || ''}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm">{ci.firstName} {ci.lastName}</div>
                        <div className="text-xs text-gray-500 truncate">{ci.jobTitle || ci.user_company || ''}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-gray-400">{new Date(ci.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div className="text-xs text-green-600 font-medium">+{ci.points_awarded || 0} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Pagination */}
                {ciTotalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                    <button onClick={() => loadCheckins(ciPage - 1)} disabled={ciPage <= 1}
                      className="text-sm text-blue-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed">← Previous</button>
                    <span className="text-xs text-gray-500">Page {ciPage} of {ciTotalPages}</span>
                    <button onClick={() => loadCheckins(ciPage + 1)} disabled={ciPage >= ciTotalPages}
                      className="text-sm text-blue-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* School Profile Editor */}
        {activeTab === 'profile' && schoolProfile && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">🏫 School Profile</h2>
                <p className="text-xs text-gray-500 mt-0.5">This information is shown to tDIL members on the Partner Schools page</p>
              </div>
              {profileSaved && (
                <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                  <CheckCircle size={14} /> Saved!
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* Program Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Program Description / Bio</label>
                <textarea
                  value={schoolProfile.bio || ''}
                  onChange={e => handleProfileFieldChange('bio', e.target.value)}
                  rows={4}
                  placeholder="Describe your program, mission, and what you offer to students and professionals…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Department / Tagline */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Department / Tagline</label>
                <input
                  value={schoolProfile.jobTitle || ''}
                  onChange={e => handleProfileFieldChange('jobTitle', e.target.value)}
                  placeholder="e.g. Career Services & Professional Development"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 2-col grid for links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Calendar size={11} /> Calendly / Booking Link
                  </label>
                  <input
                    value={schoolProfile.calendly_url || ''}
                    onChange={e => handleProfileFieldChange('calendly_url', e.target.value)}
                    placeholder="https://calendly.com/your-school"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Monitor size={11} /> Zoom Meeting Link
                  </label>
                  <input
                    value={schoolProfile.school_zoom_url || ''}
                    onChange={e => handleProfileFieldChange('school_zoom_url', e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Video size={11} /> Intro Video URL (YouTube / Vimeo)
                  </label>
                  <input
                    value={schoolProfile.school_intro_video_url || ''}
                    onChange={e => handleProfileFieldChange('school_intro_video_url', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <BookOpen size={11} /> Program Materials Link
                  </label>
                  <input
                    value={schoolProfile.school_materials_url || ''}
                    onChange={e => handleProfileFieldChange('school_materials_url', e.target.value)}
                    placeholder="https://drive.google.com/… or website URL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <UserIcon size={11} /> Contact Name
                  </label>
                  <input
                    value={schoolProfile.school_contact_name || ''}
                    onChange={e => handleProfileFieldChange('school_contact_name', e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Mail size={11} /> Contact Email
                  </label>
                  <input
                    type="email"
                    value={schoolProfile.school_contact_email || ''}
                    onChange={e => handleProfileFieldChange('school_contact_email', e.target.value)}
                    placeholder="contact@school.edu"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button onClick={handleSaveProfile} disabled={profileSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                  <Save size={14} /> {profileSaving ? 'Saving…' : 'Save School Profile'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-6 text-center text-xs text-gray-400">
          Data updates in real time as tDIL members check in. Questions?{' '}
          <a href="mailto:info@tdilapp.com" className="text-blue-500 hover:underline">Contact us</a>
        </div>
      </div>
    </div>
  );
}
