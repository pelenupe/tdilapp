import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, Save, Users, GraduationCap, ChevronDown, ChevronUp, X } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { useUser } from '../contexts/UserContext';
import API from '../services/api';

export default function AdminUsers() {
  const { user } = useUser();
  const navigate = useNavigate();

  // Redirect non-admins
  useEffect(() => {
    if (user && !['admin', 'founder'].includes(user.userType)) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [users, setUsers] = useState([]);
  const [cohortOptions, setCohortOptions] = useState([]);
  const [cohortList, setCohortList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({}); // { [userId]: bool }
  const [pendingCohorts, setPendingCohorts] = useState({}); // { [userId]: string }
  const [showCohortManager, setShowCohortManager] = useState(false);
  const [newCohortName, setNewCohortName] = useState('');
  const [newCohortDesc, setNewCohortDesc] = useState('');
  const [addingCohort, setAddingCohort] = useState(false);
  const [notification, setNotification] = useState(null); // { type, msg }

  const notify = (type, msg) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, namesRes, listRes] = await Promise.all([
        API.get('/cohorts/admin/users'),
        API.get('/cohorts/names'),
        API.get('/cohorts/admin/cohort-list').catch(() => ({ data: [] }))
      ]);

      const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
      const namesData = Array.isArray(namesRes.data) ? namesRes.data : [];
      const listData  = Array.isArray(listRes.data)  ? listRes.data  : [];

      setUsers(usersData);
      setCohortOptions(namesData);
      setCohortList(listData);

      // Pre-populate pending cohorts with current values
      const initial = {};
      usersData.forEach(u => { initial[u.id] = u.cohort || ''; });
      setPendingCohorts(initial);
    } catch (err) {
      console.error('Error loading admin data:', err);
      notify('error', 'Failed to load data. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter users by search
  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.cohort || '').toLowerCase().includes(q)
    );
  });

  const handleCohortChange = (userId, value) => {
    setPendingCohorts(prev => ({ ...prev, [userId]: value }));
  };

  const saveUserCohort = async (userId) => {
    setSaving(prev => ({ ...prev, [userId]: true }));
    try {
      const cohortVal = pendingCohorts[userId] || null;
      await API.put(`/cohorts/admin/users/${userId}/cohort`, { cohort: cohortVal });

      // Update local users list
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, cohort: cohortVal } : u
      ));

      // Refresh cohort options in case a new one was used
      const namesRes = await API.get('/cohorts/names').catch(() => ({ data: cohortOptions }));
      if (Array.isArray(namesRes.data)) setCohortOptions(namesRes.data);

      notify('success', 'Cohort updated!');
    } catch (err) {
      console.error('Error saving cohort:', err);
      notify('error', err.response?.data?.message || 'Failed to save cohort.');
    } finally {
      setSaving(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleAddCohortName = async (e) => {
    e.preventDefault();
    if (!newCohortName.trim()) return;
    setAddingCohort(true);
    try {
      await API.post('/cohorts/admin/cohort-list', {
        name: newCohortName.trim(),
        description: newCohortDesc.trim() || null
      });
      setNewCohortName('');
      setNewCohortDesc('');
      await loadData();
      notify('success', `"${newCohortName.trim()}" added to cohort list!`);
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to add cohort.');
    } finally {
      setAddingCohort(false);
    }
  };

  const handleDeleteCohortName = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from the cohort list?\n\nUsers already in this cohort won't be affected.`)) return;
    try {
      await API.delete(`/cohorts/admin/cohort-list/${id}`);
      await loadData();
      notify('success', `"${name}" removed from cohort list.`);
    } catch (err) {
      notify('error', 'Failed to remove cohort.');
    }
  };

  const changedCount = users.filter(u => (pendingCohorts[u.id] || '') !== (u.cohort || '')).length;

  if (!user || !['admin', 'founder'].includes(user.userType)) {
    return null;
  }

  return (
    <PageLayout
      userType={user?.userType}
      title="Manage User Cohorts"
      subtitle="Assign or change cohort membership for any member"
    >
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <span>{notification.type === 'success' ? '✅' : '❌'}</span>
            <span>{notification.msg}</span>
          </div>
        )}

        {/* ── Cohort Name Manager ── */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <button
            onClick={() => setShowCohortManager(prev => !prev)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                <GraduationCap size={18} className="text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Manage Cohort Names</h2>
                <p className="text-sm text-gray-500">
                  {cohortList.length} admin-defined cohort{cohortList.length !== 1 ? 's' : ''} · these appear in all dropdowns
                </p>
              </div>
            </div>
            {showCohortManager
              ? <ChevronUp size={18} className="text-gray-400" />
              : <ChevronDown size={18} className="text-gray-400" />}
          </button>

          {showCohortManager && (
            <div className="px-5 pb-5 border-t border-gray-100">
              {/* Add new cohort name */}
              <form onSubmit={handleAddCohortName} className="flex flex-col sm:flex-row gap-2 mt-4 mb-4">
                <input
                  type="text"
                  value={newCohortName}
                  onChange={e => setNewCohortName(e.target.value)}
                  placeholder="Cohort name (e.g. Indiana 11)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <input
                  type="text"
                  value={newCohortDesc}
                  onChange={e => setNewCohortDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={addingCohort || !newCohortName.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
                >
                  <Plus size={16} />
                  {addingCohort ? 'Adding…' : 'Add Cohort'}
                </button>
              </form>

              {cohortList.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-4">
                  No admin-defined cohorts yet. Add one above.
                </p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {cohortList.map(c => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 group"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-900">{c.name}</span>
                        {c.description && (
                          <span className="ml-2 text-xs text-gray-400">{c.description}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteCohortName(c.id, c.name)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                        title="Remove from list"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Member List ── */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 border-b border-gray-100">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users size={18} className="text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Members</h2>
                <p className="text-sm text-gray-500">
                  {filtered.length} of {users.length} member{users.length !== 1 ? 's' : ''}
                  {changedCount > 0 && (
                    <span className="ml-2 text-amber-600 font-medium">
                      · {changedCount} unsaved change{changedCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search members…"
                className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-60"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-16 text-center text-gray-400">
              <div className="text-3xl mb-3">⏳</div>
              Loading members…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <div className="text-3xl mb-3">🔍</div>
              {search ? 'No members match your search.' : 'No members found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Member</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-64">Cohort</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(u => {
                    const pending = pendingCohorts[u.id] ?? (u.cohort || '');
                    const changed = pending !== (u.cohort || '');
                    const isSavingThis = saving[u.id];

                    return (
                      <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${changed ? 'bg-amber-50' : ''}`}>
                        {/* Member info */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs flex-shrink-0">
                              {u.firstName?.[0]}{u.lastName?.[0]}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {u.firstName} {u.lastName}
                              </div>
                              <div className="text-xs text-gray-400">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* User type badge */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.userType === 'admin' || u.userType === 'founder'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {u.userType || 'member'}
                          </span>
                        </td>

                        {/* Cohort dropdown */}
                        <td className="px-4 py-3">
                          <CohortSelect
                            value={pending}
                            options={cohortOptions}
                            currentCohort={u.cohort}
                            onChange={val => handleCohortChange(u.id, val)}
                          />
                        </td>

                        {/* Save button */}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => saveUserCohort(u.id)}
                            disabled={!changed || isSavingThis}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              changed && !isSavingThis
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <Save size={12} />
                            {isSavingThis ? 'Saving…' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </PageLayout>
  );
}

// ── Sub-component: cohort select with "Other" option ─────────────────────────
function CohortSelect({ value, options, currentCohort, onChange }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customVal, setCustomVal] = useState('');

  // If current value isn't in the options list, it might be a custom one
  const isCustom = value && !options.some(o => o.name === value);

  // Show custom input when value doesn't match any option
  useEffect(() => {
    if (isCustom && value) {
      setShowCustom(true);
      setCustomVal(value);
    }
  }, []);

  const handleSelectChange = (e) => {
    const v = e.target.value;
    if (v === '__other__') {
      setShowCustom(true);
      setCustomVal('');
      onChange('');
    } else {
      setShowCustom(false);
      setCustomVal('');
      onChange(v);
    }
  };

  const handleCustomChange = (e) => {
    setCustomVal(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div className="space-y-1">
      <select
        value={showCustom ? '__other__' : (value || '')}
        onChange={handleSelectChange}
        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        <option value="">— None —</option>
        {options.map(c => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
        <option value="__other__">Other / Custom…</option>
      </select>
      {showCustom && (
        <input
          type="text"
          value={customVal}
          onChange={handleCustomChange}
          placeholder="Type cohort name…"
          className="w-full px-2 py-1.5 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          autoFocus
        />
      )}
    </div>
  );
}
