import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '../assets/tdil-LOGO.png';

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
    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
      {init || '?'}
    </div>
  );
}

export default function SponsorPortal() {
  const navigate = useNavigate();
  const [portalUser, setPortalUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [topVisitors, setTopVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [orgProfile, setOrgProfile] = useState(null);
  const [sponsorProfile, setSponsorProfile] = useState({
    name: '', description: '', linkedin_url: '', website: '', contact_name: '', contact_email: '', phone: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const token = localStorage.getItem('token');

  const loadOrgProfile = async () => {
    try {
      const res = await fetch('/api/portal/org-profile', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const org = data.org || {};
        setOrgProfile(org);
        setSponsorProfile({
          name: org.name || '',
          description: org.description || '',
          linkedin_url: org.linkedin_url || '',
          website: org.website || '',
          contact_name: org.contact_name || '',
          contact_email: org.contact_email || '',
          phone: org.phone || ''
        });
      }
    } catch (_) {}
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch('/api/portal/org-profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(sponsorProfile)
      });
      if (res.ok) {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      }
    } catch (_) {}
    setSavingProfile(false);
  };
  const [ciPage, setCiPage] = useState(1);
  const [ciTotal, setCiTotal] = useState(0);
  const [ciTotalPages, setCiTotalPages] = useState(1);
  const [adminCompany, setAdminCompany] = useState('');
  const [adminInput, setAdminInput] = useState('');
  const isAdmin = ['admin', 'founder'].includes(JSON.parse(localStorage.getItem('user') || '{}').userType);

  useEffect(() => {
    if (!token) { navigate('/portal/login'); return; }
    loadAll('');
  }, []);

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

      const [meData, statsData, topData] = await Promise.all([
        meRes.json(), statsRes.json(), topRes.json()
      ]);

      setPortalUser(meData.user);
      setStats(statsData);
      setTopVisitors(topData);
      await loadCheckins(1, companyOverride);
      await loadOrgProfile();
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
        <div className="text-gray-500 text-sm">Loading sponsor portal...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="tDIL" className="h-8 object-contain" />
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">tDIL Sponsor Portal</div>
              <div className="text-xs text-gray-500">🤝 Sponsor Dashboard</div>
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
                  placeholder="Enter sponsor / business name to view their data..."
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

        {/* Welcome + impact callout */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🤝 {adminCompany || portalUser?.company || 'Your Business'}</h1>
            <p className="text-gray-500 text-sm mt-1">Member check-in analytics & community impact</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
            <div className="font-semibold mb-0.5">Your Sponsorship Impact</div>
            <div>Every check-in at your location awards members community points and builds engagement.</div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon="📍" label="Total Check-Ins" value={stats.totalCheckins.toLocaleString()} color="blue" />
            <StatCard icon="👥" label="Unique Members" value={stats.uniqueVisitors.toLocaleString()} color="green" />
            <StatCard icon="📅" label="This Month" value={stats.thisMonth.toLocaleString()} sub={`${stats.thisWeek} this week`} color="purple" />
            <StatCard icon="⭐" label="Points Awarded" value={stats.totalPointsAwarded.toLocaleString()} sub="to members at your location" color="orange" />
          </div>
        )}

        {/* Engagement banner */}
        {stats && stats.totalCheckins > 0 && (
          <div className="mb-6 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-4">
            <div className="text-3xl">🎉</div>
            <div>
              <div className="font-semibold text-gray-900">
                {stats.uniqueVisitors} tDIL member{stats.uniqueVisitors !== 1 ? 's' : ''} have visited {portalUser?.company}!
              </div>
              <div className="text-sm text-gray-600 mt-0.5">
                Your sponsorship has helped award {stats.totalPointsAwarded.toLocaleString()} points to the tDIL community.
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          {[
            { key: 'overview', label: '🏆 Top Members' },
            { key: 'checkins', label: `📋 Check-In Log (${ciTotal})` },
            { key: 'profile', label: '🏢 Sponsor Profile' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Top Members */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">🏆 Most Frequent Visitors</h2>
              <p className="text-xs text-gray-500 mt-0.5">tDIL members who visit {portalUser?.company} most often</p>
            </div>
            {topVisitors.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                <p>No check-ins recorded yet at your location.</p>
                <p className="text-xs mt-1">Make sure your business name in tDIL matches how members search when checking in.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {topVisitors.map((visitor, i) => (
                  <div key={visitor.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
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
                    <div className="text-right flex-shrink-0 space-y-0.5">
                      <div className="text-sm font-bold text-emerald-600">{visitor.visit_count} visits</div>
                      <div className="text-xs text-yellow-600">+{visitor.points_earned_here} pts</div>
                      <div className="text-xs text-gray-400">
                        Last: {visitor.last_visit ? new Date(visitor.last_visit).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </div>
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
              <p className="text-xs text-gray-500 mt-0.5">All tDIL member check-ins at {portalUser?.company}</p>
            </div>
            {checkins.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                <p>No check-ins yet.</p>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="hidden sm:grid grid-cols-4 gap-4 px-5 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="col-span-2">Member</div>
                  <div className="text-center">Points</div>
                  <div className="text-right">Date</div>
                </div>
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
                      <div className="text-center flex-shrink-0 w-16">
                        <span className="inline-block bg-yellow-50 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">+{ci.points_awarded || 0}</span>
                      </div>
                      <div className="text-right flex-shrink-0 w-20">
                        <div className="text-xs text-gray-400">{new Date(ci.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {ciTotalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                    <button onClick={() => loadCheckins(ciPage - 1)} disabled={ciPage <= 1}
                      className="text-sm text-emerald-600 hover:underline disabled:opacity-40">← Previous</button>
                    <span className="text-xs text-gray-500">Page {ciPage} of {ciTotalPages}</span>
                    <button onClick={() => loadCheckins(ciPage + 1)} disabled={ciPage >= ciTotalPages}
                      className="text-sm text-emerald-600 hover:underline disabled:opacity-40">Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Sponsor Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">🏢 Sponsor Profile</h2>
                <p className="text-xs text-gray-500 mt-0.5">This information may be displayed to tDIL members</p>
              </div>
              {profileSaved && <span className="text-green-600 text-sm font-medium">✅ Saved!</span>}
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Company / Organization Name</label>
                  <input value={sponsorProfile.name} onChange={e => setSponsorProfile(p => ({...p, name: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Phone / Contact Number (optional)</label>
                  <input value={sponsorProfile.phone} onChange={e => setSponsorProfile(p => ({...p, phone: e.target.value}))}
                    placeholder="(317) 555-0100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">About Your Organization</label>
                <textarea rows={4} value={sponsorProfile.description} onChange={e => setSponsorProfile(p => ({...p, description: e.target.value}))}
                  placeholder="Tell the tDIL community about your company, mission, and why you support tDIL..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Primary Contact Name</label>
                  <input value={sponsorProfile.contact_name} onChange={e => setSponsorProfile(p => ({...p, contact_name: e.target.value}))}
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Contact Email</label>
                  <input value={sponsorProfile.contact_email} onChange={e => setSponsorProfile(p => ({...p, contact_email: e.target.value}))}
                    placeholder="partnerships@company.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">LinkedIn Company Page</label>
                  <input value={sponsorProfile.linkedin_url} onChange={e => setSponsorProfile(p => ({...p, linkedin_url: e.target.value}))}
                    placeholder="https://linkedin.com/company/your-company"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Website</label>
                  <input value={sponsorProfile.website} onChange={e => setSponsorProfile(p => ({...p, website: e.target.value}))}
                    placeholder="https://yourcompany.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button onClick={handleSaveProfile} disabled={savingProfile}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                  {savingProfile ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-xs text-gray-400">
          Data updates in real time as members check in. Questions?{' '}
          <a href="mailto:info@tdilapp.com" className="text-emerald-500 hover:underline">Contact us</a>
        </div>
      </div>
    </div>
  );
}
