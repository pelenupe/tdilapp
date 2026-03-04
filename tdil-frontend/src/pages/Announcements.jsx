import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import API from '../services/api';
import { Plus, Edit2, Trash2, X, Star } from 'lucide-react';

const CATEGORY_ICONS = { event: '📅', job: '💼', important: '⚠️', general: '📢' };
const CATEGORY_LABELS = { event: 'Event', job: 'Job', important: 'Important', general: 'General' };

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // announcement object to edit
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'general', featured: false, priority: 'normal' });
  const { user } = useUser();
  const isAdmin = ['admin', 'founder'].includes(user?.userType);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await API.get('/announcements');
      setAnnouncements(res.data || []);
    } catch (err) {
      console.error(err);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const filtered = filter === 'all' ? announcements
    : filter === 'important' ? announcements.filter(a => a.priority === 'high' || a.category === 'important')
    : announcements.filter(a => a.category === filter);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', content: '', category: 'general', featured: false, priority: 'normal' });
    setShowModal(true);
  };

  const openEdit = (ann) => {
    setEditing(ann);
    setForm({
      title: ann.title || '',
      content: ann.content || '',
      category: ann.category || 'general',
      featured: !!ann.featured,
      priority: ann.priority || 'normal'
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await API.patch(`/announcements/${editing.id}`, form);
        notify('Announcement updated ✅');
      } else {
        await API.post('/announcements', form);
        notify('Announcement created ✅');
      }
      setShowModal(false);
      await fetchAnnouncements();
    } catch (err) {
      notify(err.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await API.delete(`/announcements/${id}`);
      notify('Announcement deleted');
      await fetchAnnouncements();
    } catch (err) {
      notify('Delete failed', 'error');
    }
  };

  if (loading) {
    return (
      <PageLayout userType={user?.userType} title="Community Announcements" subtitle="Loading..." showPointsInHeader userPoints={user?.points || 0}>
        <div className="text-center py-12 text-gray-400">Loading announcements…</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      userType={user?.userType || 'member'}
      title="Community Announcements"
      subtitle="Stay updated with the latest news and updates from tDIL"
      showPointsInHeader
      userPoints={user?.points || 0}
      headerActions={
        isAdmin ? (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus size={14} /> New Announcement
          </button>
        ) : null
      }
    >
      {/* Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${
          notification.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>{notification.msg}</div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{editing ? 'Edit Announcement' : 'New Announcement'}</h3>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Announcement title…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Content *</label>
                <textarea required rows={5} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Announcement content…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                    <option value="general">📢 General</option>
                    <option value="event">📅 Event</option>
                    <option value="job">💼 Job</option>
                    <option value="important">⚠️ Important</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                    <option value="normal">Normal</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600" />
                <span className="text-sm text-gray-700">⭐ Pin to top (featured)</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-5 flex gap-2 flex-wrap">
        {[['all', 'All'], ['important', '⚠️ Important'], ['event', '📅 Events'], ['job', '💼 Jobs'], ['general', '📢 General']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}>
            {label} {key === 'all' ? `(${announcements.length})` : ''}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <div className="text-5xl mb-3">📢</div>
            <h3 className="font-semibold text-gray-900 mb-1">No announcements yet</h3>
            <p className="text-gray-500 text-sm">
              {isAdmin ? 'Click "+ New Announcement" to create the first one.' : 'Check back soon for updates from tDIL.'}
            </p>
          </div>
        ) : (
          filtered.map((ann, i) => (
            <div key={ann.id || i} className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow ${ann.featured ? 'border-yellow-300' : 'border-gray-200'}`}>
              {ann.featured && (
                <div className="bg-gradient-to-r from-yellow-400 to-amber-400 px-4 py-1.5 flex items-center gap-2">
                  <Star size={12} className="text-white fill-white" />
                  <span className="text-xs font-bold text-white uppercase tracking-wide">Featured</span>
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 text-xl">
                    {CATEGORY_ICONS[ann.category] || '📢'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">{ann.title}</h3>
                        {ann.priority === 'high' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">Important</span>
                        )}
                        {ann.category && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                            {CATEGORY_LABELS[ann.category] || ann.category}
                          </span>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(ann)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(ann.id, ann.title)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-3 whitespace-pre-wrap">{ann.content}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>By {ann.author || 'tDIL Team'}</span>
                      <span>{ann.createdAt ? new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </PageLayout>
  );
}
