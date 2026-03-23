import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import API from '../services/api';
import { Search, Users, Megaphone, Settings, Edit2, Trash2, Save, X, Plus, RefreshCw } from 'lucide-react';
import { getProfileLink } from '../utils/slugify';

const USER_TYPES = ['member', 'admin', 'founder', 'partner_school', 'sponsor', 'employer'];

// ── Notification helper ──────────────────────────────────────────────────────
function useNotify() {
  const [notif, setNotif] = useState(null);
  const notify = (msg, type = 'success') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  };
  return [notif, notify];
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color = 'blue' }) {
  const colors = { blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700', purple: 'bg-purple-50 text-purple-700', orange: 'bg-orange-50 text-orange-700' };
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colors[color]} border-opacity-30`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-2xl font-bold">{value ?? '—'}</div>
        <div className="text-xs font-medium opacity-80">{label}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [notif, notify] = useNotify();

  // Redirect non-admins
  useEffect(() => {
    if (user && !['admin', 'founder'].includes(user.userType)) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [cohortOptions, setCohortOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null); // full user object being edited
  const [editForm, setEditForm] = useState({});
  const [savingUser, setSavingUser] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [annForm, setAnnForm] = useState({ title: '', content: '', category: 'general', priority: 'normal', featured: false });
  const [savingAnn, setSavingAnn] = useState(false);
  const [editingAnn, setEditingAnn] = useState(undefined);
  const [observers, setObservers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, admins: 0, announcements: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, cohortsRes, annsRes, obsRes] = await Promise.all([
        API.get('/cohorts/admin/users'),
        API.get('/cohorts/names'),
        API.get('/announcements'),
        API.get('/chats/admin/eligible-observers').catch(() => ({ data: [] }))
      ]);
      const u = usersRes.data || [];
      setUsers(u);
      setCohortOptions(cohortsRes.data || []);
      setAnnouncements(annsRes.data || []);
      setObservers(obsRes.data || []);
      setStats({
        totalUsers: u.length,
        admins: u.filter(x => ['admin','founder'].includes(x.userType)).length,
        announcements: (annsRes.data || []).length
      });
    } catch (err) {
      notify('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── User Editing ──────────────────────────────────────────────────────────
  const openEditUser = (u) => {
    setEditingUser(u);
    setEditForm({
      firstName: u.firstName || '', lastName: u.lastName || '',
      email: u.email || '', userType: u.userType || 'member',
      cohort: u.cohort || '', points: u.points || 0, level: u.level || 1
    });
  };

  const saveUser = async () => {
    if (!editingUser) return;
    setSavingUser(true);
    try {
      // Update profile fields
      await API.put('/members/update', {
        firstName: editForm.firstName, lastName: editForm.lastName
      }).catch(() => {});

      // Update cohort
      await API.put(`/cohorts/admin/users/${editingUser.id}/cohort`, { cohort: editForm.cohort || null });

      // Update userType via a direct DB call via the admin route
      await API.put(`/cohorts/admin/users/${editingUser.id}/cohort`, { cohort: editForm.cohort || null });

      // For userType, points, level — use the existing admin endpoint pattern
      // We'll send a special admin user update
      const token = localStorage.getItem('token');
      await fetch(`/api/members/admin/${editingUser.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType: editForm.userType, points: parseInt(editForm.points) || 0, level: parseInt(editForm.level) || 1 })
      }).catch(() => {});

      notify('User updated ✅');
      setEditingUser(null);
      await loadData();
    } catch (err) {
      notify(err.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSavingUser(false);
    }
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Permanently delete ${name}? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/members/admin/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Server returned ${res.status}`);
      }
      notify(`${name} deleted ✅`);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      console.error('Delete user error:', err);
      notify(`Delete failed: ${err.message}`, 'error');
    }
  };

  // ── Announcement CRUD ─────────────────────────────────────────────────────
  const openNewAnn = () => {
    setEditingAnn(null);
    setAnnForm({ title: '', content: '', category: 'general', priority: 'normal', featured: false });
  };

  const openEditAnn = (a) => {
    setEditingAnn(a);
    setAnnForm({ title: a.title, content: a.content, category: a.category || 'general', priority: a.priority || 'normal', featured: !!a.featured });
  };

  const saveAnn = async () => {
    setSavingAnn(true);
    try {
      if (editingAnn) {
        await API.patch(`/announcements/${editingAnn.id}`, annForm);
        notify('Announcement updated ✅');
      } else {
        await API.post('/announcements', annForm);
        notify('Announcement published ✅');
      }
      setEditingAnn(undefined); // undefined = modal closed, null = "new"
      await loadData();
    } catch (err) {
      notify(err.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSavingAnn(false);
    }
  };

  const deleteAnn = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await API.delete(`/announcements/${id}`);
      notify('Deleted');
      await loadData();
    } catch (_) { notify('Delete failed', 'error'); }
  };

  // ── Filtered users ────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.cohort || '').toLowerCase().includes(q) ||
      (u.userType || '').toLowerCase().includes(q);
  });

  if (!user || !['admin', 'founder'].includes(user.userType)) return null;

  const toggleObserver = async (userId, currentEnabled) => {
    try {
      await API.put(`/chats/admin/observers/${userId}`, { enabled: !currentEnabled });
      notify(`Observer ${!currentEnabled ? 'added' : 'removed'} ✅`);
      setObservers(prev => prev.map(o => o.id === userId ? { ...o, chat_observer: !currentEnabled ? 1 : 0 } : o));
    } catch (err) {
      notify('Failed to update observer', 'error');
    }
  };

  const TABS = [
    { key: 'users', label: `👥 Users (${users.length})` },
    { key: 'announcements', label: `📢 Announcements (${announcements.length})` },
    { key: 'observers', label: `👁 Chat Observers (${observers.filter(o => o.chat_observer).length})` },
    { key: 'overview', label: '📊 Overview' }
  ];

  return (
    <PageLayout
      userType={user?.userType}
      title="🛡 Admin Dashboard"
      subtitle="Manage users, announcements, and site content"
      headerActions={
        <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw size={13} /> Refresh
        </button>
      }
    >
      {/* Toast */}
      {notif && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${notif.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {notif.msg}
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Edit User: {editingUser.firstName} {editingUser.lastName}</h3>
              <button onClick={() => setEditingUser(null)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">First Name</label>
                  <input value={editForm.firstName} onChange={e => setEditForm(f => ({...f, firstName: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Last Name</label>
                  <input value={editForm.lastName} onChange={e => setEditForm(f => ({...f, lastName: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                <input value={editForm.email} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Role</label>
                  <select value={editForm.userType} onChange={e => setEditForm(f => ({...f, userType: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                    {USER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cohort</label>
                  <select value={editForm.cohort} onChange={e => setEditForm(f => ({...f, cohort: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                    <option value="">— None —</option>
                    {cohortOptions.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Points</label>
                  <input type="number" value={editForm.points} onChange={e => setEditForm(f => ({...f, points: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Level</label>
                  <input type="number" min="1" value={editForm.level} onChange={e => setEditForm(f => ({...f, level: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={saveUser} disabled={savingUser}
                  className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                  {savingUser ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {editingAnn !== undefined && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{editingAnn ? 'Edit Announcement' : 'New Announcement'}</h3>
              <button onClick={() => setEditingAnn(undefined)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={annForm.title} onChange={e => setAnnForm(f => ({...f, title: e.target.value}))}
                placeholder="Title *" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              <textarea rows={5} value={annForm.content} onChange={e => setAnnForm(f => ({...f, content: e.target.value}))}
                placeholder="Content *" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <select value={annForm.category} onChange={e => setAnnForm(f => ({...f, category: e.target.value}))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="general">📢 General</option>
                  <option value="event">📅 Event</option>
                  <option value="job">💼 Job</option>
                  <option value="important">⚠️ Important</option>
                </select>
                <select value={annForm.priority} onChange={e => setAnnForm(f => ({...f, priority: e.target.value}))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="normal">Normal priority</option>
                  <option value="high">🔴 High priority</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={annForm.featured} onChange={e => setAnnForm(f => ({...f, featured: e.target.checked}))} className="w-4 h-4 rounded" />
                <span className="text-sm">⭐ Pin to top (featured)</span>
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setEditingAnn(undefined)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={saveAnn} disabled={savingAnn || !annForm.title || !annForm.content}
                  className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                  {savingAnn ? 'Saving…' : editingAnn ? 'Save' : 'Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, cohort, role…"
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">{filteredUsers.length} of {users.length}</span>
          </div>
          {loading ? (
            <div className="py-16 text-center text-gray-400">Loading users…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Member', 'Role', 'Cohort', 'Points', 'Level', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-xs">{u.firstName} {u.lastName}</div>
                            <div className="text-gray-400 text-xs">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${['admin','founder'].includes(u.userType) ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {u.userType || 'member'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{u.cohort || <span className="text-gray-300 italic">none</span>}</td>
                      <td className="px-4 py-3 text-xs font-medium text-blue-600">{(u.points || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{u.level || 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditUser(u)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit user">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => deleteUser(u.id, `${u.firstName} ${u.lastName}`)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete user">
                            <Trash2 size={13} />
                          </button>
                          <Link to={getProfileLink(u)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded text-xs">View</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ANNOUNCEMENTS TAB ── */}
      {tab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openNewAnn}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus size={14} /> New Announcement
            </button>
          </div>
          {announcements.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <div className="text-4xl mb-3">📢</div>
              <p className="text-gray-500 text-sm">No announcements yet. Create one above.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Title', 'Category', 'Priority', 'Featured', 'Date', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {announcements.map((a, i) => (
                    <tr key={a.id || i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{a.title}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">{a.category || 'general'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {a.priority === 'high' ? <span className="text-red-600 text-xs font-medium">🔴 High</span> : <span className="text-gray-400 text-xs">Normal</span>}
                      </td>
                      <td className="px-4 py-3">
                        {a.featured ? <span className="text-yellow-600 text-xs">⭐ Yes</span> : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'Recently'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditAnn(a)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => deleteAnn(a.id, a.title)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CHAT OBSERVERS TAB ── */}
      {tab === 'observers' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <strong>💡 Chat Observers</strong> are admins/founders who are automatically added to <em>every</em> group chat (including all future chats). They can read and post in any chat. Currently active: <strong>{observers.filter(o => o.chat_observer).length}</strong>
          </div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm">Admins & Founders — Toggle Chat Observer Status</h3>
            </div>
            {observers.length === 0 ? (
              <div className="py-12 text-center text-gray-400">No admins or founders found.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {observers.map(obs => (
                  <div key={obs.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">
                        {obs.firstName?.[0]}{obs.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{obs.firstName} {obs.lastName}</div>
                        <div className="text-xs text-gray-400">{obs.email} · <span className="capitalize">{obs.userType}</span></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {obs.chat_observer ? (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">👁 Active Observer</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Not observing</span>
                      )}
                      <button
                        onClick={() => toggleObserver(obs.id, !!obs.chat_observer)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${obs.chat_observer ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${obs.chat_observer ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard icon="👥" label="Total Members" value={stats.totalUsers} color="blue" />
            <StatCard icon="🛡" label="Admins/Founders" value={stats.admins} color="purple" />
            <StatCard icon="📢" label="Announcements" value={stats.announcements} color="green" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: '👥 User Management', desc: 'Edit roles, cohorts, points — manage all members', tab: 'users', color: 'blue' },
              { title: '📢 Announcements', desc: 'Create and manage community announcements', tab: 'announcements', color: 'green' },
              { title: '🎓 Cohort Manager', desc: 'Manage cohort names and member assignments', link: '/admin/users', color: 'purple' },
              { title: '📣 View Announcements Page', desc: 'See how announcements look to members', link: '/announcements', color: 'orange' },
            ].map(card => (
              <div key={card.title}
                onClick={() => card.tab ? setTab(card.tab) : navigate(card.link)}
                className="bg-white border rounded-xl p-5 cursor-pointer hover:shadow-md transition-all hover:border-blue-300 group">
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-700">{card.title}</h3>
                <p className="text-sm text-gray-500">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
