import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '../assets/tdil-LOGO.png';
import { Plus, Trash2, Edit2, X, Briefcase, Users, MapPin, DollarSign, Clock } from 'lucide-react';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote', 'Hybrid'];

const emptyJob = {
  title: '', company: '', location: '', type: 'Full-time',
  salary: '', description: '', requirements: '', category: 'Technology',
  application_url: '', remote: false
};

export default function EmployerPortal() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const portalUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('jobs');
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobForm, setJobForm] = useState({ ...emptyJob, company: portalUser.company || '' });
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Company profile state — backed by org_profiles table
  const [companyProfile, setCompanyProfile] = useState({
    name: portalUser.company || '',
    description: '',
    linkedin_url: '',
    website: '',
    contact_name: '',
    contact_email: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const loadOrgProfile = async () => {
    try {
      const res = await fetch('/api/portal/org-profile', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const org = data.org || {};
        setCompanyProfile({
          name: org.name || portalUser.company || '',
          description: org.description || '',
          linkedin_url: org.linkedin_url || '',
          website: org.website || '',
          contact_name: org.contact_name || '',
          contact_email: org.contact_email || ''
        });
      }
    } catch (_) {}
  };

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (!token) { navigate('/portal/login'); return; }
    if (!['employer', 'admin', 'founder'].includes(portalUser.userType)) {
      navigate('/portal/login'); return;
    }
    fetchMyJobs();
    loadOrgProfile();
  }, []);

  const fetchMyJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs/my-jobs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data || []);
      }
    } catch (_) {}
    setLoading(false);
  };

  const openCreate = () => {
    setEditingJob(null);
    setJobForm({ ...emptyJob, company: portalUser.company || companyProfile.company || '' });
    setShowJobForm(true);
  };

  const openEdit = (job) => {
    setEditingJob(job);
    setJobForm({
      title: job.title || '',
      company: job.company || portalUser.company || '',
      location: job.location || '',
      type: job.type || job.job_type || 'Full-time',
      salary: job.salary || '',
      description: job.description || '',
      requirements: job.requirements || '',
      category: job.category || 'Technology',
      application_url: job.application_url || '',
      remote: !!job.remote
    });
    setShowJobForm(true);
  };

  const handleSaveJob = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...jobForm };
      const url = editingJob ? `/api/jobs/${editingJob.id}` : '/api/jobs';
      const method = editingJob ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        notify(editingJob ? 'Job updated ✅' : 'Job posted ✅');
        setShowJobForm(false);
        setEditingJob(null);
        await fetchMyJobs();
      } else {
        const err = await res.json();
        notify(err.message || err.error || 'Failed to save job', 'error');
      }
    } catch (_) { notify('Failed to save job', 'error'); }
    setSaving(false);
  };

  const handleDeleteJob = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        notify('Job deleted');
        setJobs(prev => prev.filter(j => j.id !== id));
      }
    } catch (_) { notify('Failed to delete', 'error'); }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch('/api/portal/org-profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(companyProfile)
      });
      if (res.ok) {
        notify('Profile saved ✅');
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      }
    } catch (_) { notify('Failed to save', 'error'); }
    setSavingProfile(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/portal/login');
  };

  const TABS = [
    { key: 'jobs', label: `💼 My Jobs (${jobs.length})` },
    { key: 'profile', label: '🏢 Company Profile' },
    { key: 'overview', label: '📊 Overview' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${
          notification.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>{notification.msg}</div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="tDIL" className="h-8 object-contain" />
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">Employer Portal</div>
              <div className="text-xs text-gray-500">💼 {portalUser.company || 'Your Company'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">{portalUser.firstName} {portalUser.lastName}</div>
              <div className="text-xs text-gray-500">{portalUser.company}</div>
            </div>
            <button onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-red-200 transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Welcome */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">💼 {portalUser.company || 'Employer Dashboard'}</h1>
          <p className="text-gray-500 text-sm mt-1">Post jobs, manage listings, and connect with tDIL members</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-gray-200">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Job Form Modal */}
        {showJobForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">{editingJob ? 'Edit Job' : 'Post a New Job'}</h3>
                <button onClick={() => { setShowJobForm(false); setEditingJob(null); }}>
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleSaveJob} className="space-y-3">
                <input required value={jobForm.title} onChange={e => setJobForm(f => ({...f, title: e.target.value}))}
                  placeholder="Job title *" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={jobForm.company} onChange={e => setJobForm(f => ({...f, company: e.target.value}))}
                    placeholder="Company name" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <input value={jobForm.location} onChange={e => setJobForm(f => ({...f, location: e.target.value}))}
                    placeholder="Location" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={jobForm.type} onChange={e => setJobForm(f => ({...f, type: e.target.value}))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <input value={jobForm.salary} onChange={e => setJobForm(f => ({...f, salary: e.target.value}))}
                    placeholder="Salary (e.g. $60k–$80k)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <input value={jobForm.application_url} onChange={e => setJobForm(f => ({...f, application_url: e.target.value}))}
                  placeholder="Application URL (optional — your careers page or form)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <textarea required rows={4} value={jobForm.description} onChange={e => setJobForm(f => ({...f, description: e.target.value}))}
                  placeholder="Job description *" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500" />
                <textarea rows={3} value={jobForm.requirements} onChange={e => setJobForm(f => ({...f, requirements: e.target.value}))}
                  placeholder="Requirements (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={jobForm.remote} onChange={e => setJobForm(f => ({...f, remote: e.target.checked}))} className="w-4 h-4 rounded" />
                  Remote-friendly position
                </label>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => { setShowJobForm(false); setEditingJob(null); }}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                    {saving ? 'Saving…' : editingJob ? 'Update Job' : 'Post Job'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── JOBS TAB ── */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                <Plus size={14} /> Post a Job
              </button>
            </div>
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading jobs…</div>
            ) : jobs.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <div className="text-5xl mb-3">💼</div>
                <h3 className="font-semibold text-gray-900 mb-1">No jobs posted yet</h3>
                <p className="text-gray-500 text-sm mb-4">Post your first job listing for tDIL members to see.</p>
                <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  Post a Job
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map(job => (
                  <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-gray-900">{job.title}</h3>
                          {job.remote && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Remote</span>}
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{job.type || job.job_type || 'Full-time'}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                          {job.company && <span className="flex items-center gap-1"><Briefcase size={11} /> {job.company}</span>}
                          {job.location && <span className="flex items-center gap-1"><MapPin size={11} /> {job.location}</span>}
                          {job.salary && <span className="flex items-center gap-1"><DollarSign size={11} /> {job.salary}</span>}
                          <span className="flex items-center gap-1"><Clock size={11} /> {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Recently'}</span>
                        </div>
                        {job.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{job.description}</p>
                        )}
                        {job.application_url && (
                          <a href={job.application_url} target="_blank" rel="noopener noreferrer"
                            className="inline-block mt-2 text-xs text-blue-600 hover:underline">🔗 Application link</a>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(job)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteJob(job.id, job.title)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── COMPANY PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">🏢 Company Profile</h2>
              <p className="text-xs text-gray-500 mt-0.5">This info will appear on job listings shown to tDIL members</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Company Name</label>
                  <input value={companyProfile.name} onChange={e => setCompanyProfile(p => ({...p, name: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Website</label>
                  <input value={companyProfile.website} onChange={e => setCompanyProfile(p => ({...p, website: e.target.value}))}
                    placeholder="https://yourcompany.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Company Description</label>
                <textarea rows={4} value={companyProfile.description} onChange={e => setCompanyProfile(p => ({...p, description: e.target.value}))}
                  placeholder="Tell tDIL members about your company, culture, and what makes you a great employer…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Hiring Contact Name</label>
                  <input value={companyProfile.contact_name} onChange={e => setCompanyProfile(p => ({...p, contact_name: e.target.value}))}
                    placeholder="Recruiter or HR contact" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Hiring Contact Email</label>
                  <input value={companyProfile.contact_email} onChange={e => setCompanyProfile(p => ({...p, contact_email: e.target.value}))}
                    placeholder="hiring@yourcompany.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">LinkedIn Company Page</label>
                <input value={companyProfile.linkedin_url} onChange={e => setCompanyProfile(p => ({...p, linkedin_url: e.target.value}))}
                  placeholder="https://linkedin.com/company/your-company" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end pt-1">
                <button onClick={handleSaveProfile} disabled={savingProfile}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {savingProfile ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { icon: '💼', label: 'Active Jobs', value: jobs.length, color: 'blue' },
                { icon: '🏢', label: 'Company', value: portalUser.company || '—', color: 'green' },
                { icon: '📍', label: 'Portal', value: 'Employer', color: 'purple' }
              ].map(c => (
                <div key={c.label} className={`rounded-xl border p-4 flex items-center gap-3 ${
                  c.color === 'blue' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                  c.color === 'green' ? 'bg-green-50 border-green-200 text-green-700' :
                  'bg-purple-50 border-purple-200 text-purple-700'
                }`}>
                  <span className="text-2xl">{c.icon}</span>
                  <div>
                    <div className="text-xl font-bold truncate max-w-[100px]">{c.value}</div>
                    <div className="text-xs font-medium opacity-80">{c.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: '💼 Post a Job', desc: 'Create a new job listing for tDIL members', tab: 'jobs' },
                { title: '🏢 Company Profile', desc: 'Update your company description and info', tab: 'profile' }
              ].map(c => (
                <div key={c.title} onClick={() => { if (c.tab === 'jobs') { setActiveTab('jobs'); openCreate(); } else setActiveTab(c.tab); }}
                  className="bg-white border rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all">
                  <h3 className="font-semibold text-gray-900 mb-1">{c.title}</h3>
                  <p className="text-sm text-gray-500">{c.desc}</p>
                </div>
              ))}
            </div>
            {/* Quick tip */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              💡 <strong>Tip:</strong> Jobs you post appear on the tDIL <strong>Job Board</strong> visible to all members. Include a direct application URL for maximum response.
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          Questions? <a href="mailto:info@tdilapp.com" className="text-blue-500 hover:underline">Contact us</a>
        </div>
      </div>
    </div>
  );
}
