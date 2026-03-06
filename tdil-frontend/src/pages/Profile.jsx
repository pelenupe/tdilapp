import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Camera, User, Mail, Building, Briefcase, Award, Star,
  MessageCircle, GraduationCap, Linkedin, Calendar, FileText,
  ExternalLink, Edit2, X, CheckCircle
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import RichTextEditor, { RichTextDisplay } from '../components/RichTextEditor';
import PointsService from '../services/pointsService';
import { getMyProfile, updateProfile } from '../services/profileService';
import API from '../services/api';
import { useUser } from '../contexts/UserContext';

const PREFIX_OPTIONS = ['', 'Dr.', 'Rev.', 'Mr.', 'Mrs.', 'Ms.', 'Mx.', 'Prof.', 'Hon.'];
const SUFFIX_OPTIONS = ['', 'Jr.', 'Sr.', 'I', 'II', 'III', 'IV', 'PhD', 'MBA', 'MD', 'JD', 'DMin', 'Ed.D.', 'PsyD', 'PE', 'CPA', 'CFP', 'RN', 'Esq.'];

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateUser } = useUser();

  const emptyProfile = {
    firstName: '', lastName: '', email: '', company: '', jobTitle: '', bio: '',
    cohort: '', prefix: '', suffix: '',
    linkedin_url: '', calendly_url: '', resume_url: '', coaching_url: '',
    partner_school_name: '', partner_school_status: '',
    points: 0, level: 1, profilePicUrl: '', userType: 'member'
  };

  const [profile, setProfile] = useState(emptyProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [checkIns, setCheckIns] = useState([]);
  const [saveMsg, setSaveMsg] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Cohort dropdown
  const [cohortOptions, setCohortOptions] = useState([]);
  const [showCustomCohort, setShowCustomCohort] = useState(false);
  const [customCohortValue, setCustomCohortValue] = useState('');

  useEffect(() => {
    loadProfile();
    if (isOwnProfile) loadCheckIns();
    // Check connection status when viewing someone else's profile
    if (id) {
      const token = localStorage.getItem('token');
      fetch('/api/connections/statuses', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [parseInt(id)] })
      }).then(r => r.ok ? r.json() : {}).then(map => {
        setIsConnected(!!map[parseInt(id)]);
      }).catch(() => {});
    }
    fetch('/api/cohorts/names')
      .then(r => r.ok ? r.json() : [])
      .then(data => setCohortOptions(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [id]);

  const loadCheckIns = async () => {
    try {
      const r = await API.get('/checkins');
      setCheckIns(r.data || []);
    } catch (_) {}
  };

  const loadProfile = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const isOwn = !id || id === currentUser.id?.toString();
      setIsOwnProfile(isOwn);

      let response;
      if (isOwn) {
        response = await getMyProfile();
      } else {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/members/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        response = { data: await res.json() };
        PointsService.awardPoints('PROFILE_VIEW', `Viewed profile`);
      }

      const u = response.data;
      setProfile({
        firstName: u.firstName || '',
        lastName:  u.lastName  || '',
        email:     u.email     || '',
        company:   u.company   || '',
        jobTitle:  u.jobTitle  || '',
        bio:       u.bio       || '',
        cohort:    u.cohort    || '',
        prefix:    u.prefix    || '',
        suffix:    u.suffix    || '',
        linkedin_url:  u.linkedin_url  || '',
        calendly_url:  u.calendly_url  || '',
        resume_url:    u.resume_url    || '',
        coaching_url:  u.coaching_url  || '',
        partner_school_name: u.partner_school_name || '',
        partner_school_status: u.partner_school_status || '',
        points:    u.points    || 0,
        level:     u.level     || 1,
        profilePicUrl: u.profileImage || '',
        userType:  u.userType  || 'member'
      });
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      if (!id) {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        setProfile(p => ({
          ...p,
          firstName: u.firstName || '', lastName: u.lastName || '',
          email: u.email || '', company: u.company || '', jobTitle: u.jobTitle || '',
          bio: u.bio || '', cohort: u.cohort || '',
          points: u.points || 0, level: u.level || 1,
          profilePicUrl: u.profileImage || '', userType: u.userType || 'member'
        }));
      }
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(p => ({ ...p, [name]: value }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const profileData = {
        firstName: profile.firstName,
        lastName:  profile.lastName,
        company:   profile.company,
        jobTitle:  profile.jobTitle,
        bio:       profile.bio,
        prefix:    profile.prefix    || null,
        suffix:    profile.suffix    || null,
        linkedin_url:  profile.linkedin_url  || null,
        calendly_url:  profile.calendly_url  || null,
        resume_url:    profile.resume_url    || null,
        coaching_url:  profile.coaching_url  || null,
        partner_school_name: profile.partner_school_name || null,
        partner_school_status: profile.partner_school_status || null,
      };
      if (selectedFile) profileData.profilePic = selectedFile;

      const response = await updateProfile(profileData);

      // Update cohort separately
      const cohortValue = showCustomCohort ? customCohortValue.trim() : profile.cohort;
      try {
        await API.put('/cohorts/my-cohort', { cohort: cohortValue || null });
      } catch (_) {}

      const updatedUser = { ...response.data.user, cohort: cohortValue || null };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      updateUser({ ...updatedUser, profileImageUpdatedAt: Date.now() });

      await loadProfile();
      setIsEditing(false);
      setSelectedFile(null);
      setPreviewUrl('');
      setShowCustomCohort(false);
      setCustomCohortValue('');
      setSaveMsg('✅ Profile saved!');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveMsg('❌ Error saving. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMessage = async () => {
    try {
      const r = await API.post('/chats/direct', { otherUserId: id });
      if (r.data) navigate('/chats', { state: { selectedChatId: r.data.chatId || r.data.id } });
    } catch (_) { alert('Failed to open chat.'); }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: parseInt(id) })
      });
      if (res.ok) { setIsConnected(true); }
      else { const e = await res.json(); alert(e.message || 'Failed to connect'); }
    } catch (_) { alert('Failed to connect'); }
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    setConnecting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/connections/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { setIsConnected(false); }
    } catch (_) {}
    setConnecting(false);
  };

  const getInitials = () =>
    `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();

  const getLevelProgress = () => {
    const next = profile.level * 1000;
    const prev = (profile.level - 1) * 1000;
    return Math.min(Math.max(((profile.points - prev) / (next - prev)) * 100, 0), 100);
  };

  const displayName = [profile.prefix, profile.firstName, profile.lastName, profile.suffix]
    .filter(Boolean).join(' ');

  if (isLoading) {
    return (
      <PageLayout userType={profile.userType} title="Profile" subtitle="Loading..." showPointsInHeader={false}>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-3 mx-auto">tDIL</div>
            <div className="text-gray-500 text-sm">Loading profile…</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const headerActions = isOwnProfile ? (
    <div className="flex items-center gap-2">
      {saveMsg && (
        <span className={`text-xs font-medium px-3 py-1.5 rounded-lg ${saveMsg.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {saveMsg}
        </span>
      )}
      {!isEditing ? (
        <button onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
          <Edit2 size={14} /> Edit Profile
        </button>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => { setIsEditing(false); setShowCustomCohort(false); setCustomCohortValue(''); loadProfile(); }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  ) : (
    <div className="flex items-center gap-2">
      {isConnected ? (
        <button onClick={handleDisconnect} disabled={connecting}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-300 text-sm transition-colors disabled:opacity-50">
          {connecting ? '…' : '✓ Connected'}
        </button>
      ) : (
        <button onClick={handleConnect} disabled={connecting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
          {connecting ? '…' : '+ Connect'}
        </button>
      )}
      <button onClick={handleMessage}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
        <MessageCircle size={14} /> Message
      </button>
    </div>
  );

  return (
    <PageLayout
      userType={profile.userType}
      title={isOwnProfile ? 'My Profile' : displayName || `${profile.firstName} ${profile.lastName}`}
      subtitle={isOwnProfile ? 'Manage your personal information' : profile.jobTitle || 'Member'}
      userPoints={profile.points}
      headerActions={headerActions}
    >
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── Identity Card ── */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex flex-col sm:flex-row gap-6">

            {/* Avatar */}
            <div className="relative flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                {previewUrl || profile.profilePicUrl
                  ? <img src={previewUrl || `${profile.profilePicUrl}?t=${Date.now()}`} alt="Profile" className="w-full h-full object-cover" />
                  : getInitials()}
              </div>
              {isEditing && (
                <label className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-blue-700">
                  <Camera size={14} />
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                </label>
              )}
            </div>

            {/* Name + Key Fields */}
            <div className="flex-1 space-y-4">

              {/* Name row with prefix/suffix */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Name</label>
                {isOwnProfile && isEditing ? (
                  <div className="flex flex-wrap gap-2">
                    <select name="prefix" value={profile.prefix} onChange={handleChange}
                      className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white w-24">
                      {PREFIX_OPTIONS.map(p => <option key={p} value={p}>{p || '— Prefix —'}</option>)}
                    </select>
                    <input name="firstName" value={profile.firstName} onChange={handleChange} placeholder="First Name"
                      className="flex-1 min-w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    <input name="lastName" value={profile.lastName} onChange={handleChange} placeholder="Last Name"
                      className="flex-1 min-w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    <select name="suffix" value={profile.suffix} onChange={handleChange}
                      className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white w-28">
                      {SUFFIX_OPTIONS.map(s => <option key={s} value={s}>{s || '— Suffix —'}</option>)}
                    </select>
                  </div>
                ) : (
                  <p className="text-lg font-semibold text-gray-900">{displayName || 'Not set'}</p>
                )}
              </div>

              {/* 2-col grid: email, company, job title, cohort */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Mail size={12} /> Email</label>
                  <p className="text-sm text-gray-800">{profile.email}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Building size={12} /> Company</label>
                  {isOwnProfile && isEditing
                    ? <input name="company" value={profile.company} onChange={handleChange} placeholder="Company"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    : <p className="text-sm text-gray-800">{profile.company || <span className="text-gray-400 italic">Not set</span>}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Briefcase size={12} /> Job Title</label>
                  {isOwnProfile && isEditing
                    ? <input name="jobTitle" value={profile.jobTitle} onChange={handleChange} placeholder="Job Title"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    : <p className="text-sm text-gray-800">{profile.jobTitle || <span className="text-gray-400 italic">Not set</span>}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><GraduationCap size={12} /> Cohort</label>
                  {isOwnProfile && isEditing ? (
                    <div className="space-y-1">
                      <select
                        value={showCustomCohort ? '__other__' : (profile.cohort || '')}
                        onChange={e => {
                          if (e.target.value === '__other__') { setShowCustomCohort(true); setProfile(p => ({ ...p, cohort: '' })); }
                          else { setShowCustomCohort(false); setCustomCohortValue(''); setProfile(p => ({ ...p, cohort: e.target.value })); }
                        }}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                        <option value="">— None —</option>
                        {cohortOptions.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        <option value="__other__">Other / Not listed…</option>
                      </select>
                      {showCustomCohort && (
                        <input value={customCohortValue} onChange={e => setCustomCohortValue(e.target.value)}
                          placeholder="Type cohort name…"
                          className="w-full px-3 py-1.5 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" autoFocus />
                      )}
                    </div>
                  ) : profile.cohort ? (
                    <button onClick={() => navigate('/cohort')} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      🎓 {profile.cohort}
                    </button>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      Not set
                      {isOwnProfile && <button onClick={() => setIsEditing(true)} className="ml-2 text-blue-600 hover:underline not-italic text-xs">Add</button>}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bio ── */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">About</h2>
          {isOwnProfile && isEditing ? (
            <RichTextEditor
              value={profile.bio}
              onChange={html => setProfile(prev => ({ ...prev, bio: html }))}
              placeholder="Share a bit about yourself, your work, passions, and what you bring to the tDIL community…"
              minHeight={140}
            />
          ) : profile.bio ? (
            <RichTextDisplay html={profile.bio} />
          ) : (
            <p className="text-sm text-gray-400 italic">
              {isOwnProfile ? 'No bio yet — click Edit Profile to add one.' : 'No bio provided.'}
            </p>
          )}
        </div>

        {/* ── Links: LinkedIn · Calendly · Resume ── */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Links & Resources</h2>
          <div className="space-y-3">

            {/* LinkedIn */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Linkedin size={16} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn</label>
                {isOwnProfile && isEditing ? (
                  <input name="linkedin_url" value={profile.linkedin_url} onChange={handleChange}
                    placeholder="https://linkedin.com/in/yourname"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                ) : profile.linkedin_url ? (
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    {profile.linkedin_url.replace(/^https?:\/\/(www\.)?/, '')} <ExternalLink size={12} />
                  </a>
                ) : (
                  <p className="text-sm text-gray-400 italic">{isOwnProfile ? 'Not added yet' : 'Not provided'}</p>
                )}
              </div>
            </div>

            {/* Calendly */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar size={16} className="text-green-600" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Calendly / Book a Meeting</label>
                {isOwnProfile && isEditing ? (
                  <input name="calendly_url" value={profile.calendly_url} onChange={handleChange}
                    placeholder="https://calendly.com/yourname"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                ) : profile.calendly_url ? (
                  <a href={profile.calendly_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
                    <Calendar size={13} /> Book a Meeting
                  </a>
                ) : (
                  <p className="text-sm text-gray-400 italic">{isOwnProfile ? 'Not added yet' : 'Not provided'}</p>
                )}
              </div>
            </div>

            {/* Resume */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText size={16} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Resume / CV</label>
                {isOwnProfile && isEditing ? (
                  <input name="resume_url" value={profile.resume_url} onChange={handleChange}
                    placeholder="https://drive.google.com/… or link to your resume"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                ) : profile.resume_url ? (
                  <a href={profile.resume_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    View Resume <ExternalLink size={12} />
                  </a>
                ) : (
                  <p className="text-sm text-gray-400 italic">{isOwnProfile ? 'Not added yet' : 'Not provided'}</p>
                )}
              </div>
            </div>

            {/* Partner School Affiliation */}
            {(profile.partner_school_name || (isOwnProfile && isEditing)) && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm">🎓</span>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Partner School Affiliation</label>
                  {isOwnProfile && isEditing ? (
                    <div className="flex gap-2">
                      <input name="partner_school_name" value={profile.partner_school_name} onChange={handleChange}
                        placeholder="School name (e.g. Indiana University)"
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      <select name="partner_school_status" value={profile.partner_school_status} onChange={handleChange}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                        <option value="">— Status —</option>
                        <option value="enrolled">Current Student</option>
                        <option value="graduated">Alumni / Graduated</option>
                        <option value="faculty">Faculty / Staff</option>
                      </select>
                    </div>
                  ) : profile.partner_school_name ? (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                      profile.partner_school_status === 'graduated' ? 'bg-green-100 text-green-800' :
                      profile.partner_school_status === 'faculty' ? 'bg-purple-100 text-purple-800' :
                      'bg-indigo-100 text-indigo-800'
                    }`}>
                      {profile.partner_school_status === 'graduated' ? '✅ Alumni' :
                       profile.partner_school_status === 'faculty' ? '👩‍🏫 Faculty' : '📚 Student'} · {profile.partner_school_name}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Coaching */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm">🎯</span>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Coaching / Mentoring</label>
                {isOwnProfile && isEditing ? (
                  <input name="coaching_url" value={profile.coaching_url} onChange={handleChange}
                    placeholder="https://calendly.com/your-coaching or coaching website"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                ) : profile.coaching_url ? (
                  <a href={profile.coaching_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition-colors">
                    🎯 Book Coaching Session
                  </a>
                ) : (
                  <p className="text-sm text-gray-400 italic">{isOwnProfile ? 'Not added yet' : 'Not provided'}</p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Points & Level</h3>
              <Award className="text-yellow-500" size={20} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Current Points</span>
                <span className="text-xl font-bold text-blue-600">{profile.points.toLocaleString()}</span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">Level {profile.level}</span>
                  <span className="text-xs text-gray-400">{Math.round(getLevelProgress())}% → Lvl {profile.level + 1}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${getLevelProgress()}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Achievements</h3>
              <Star className="text-yellow-500" size={20} />
            </div>
            <div className="space-y-2.5">
              {[
                { icon: <User size={13} className="text-green-600" />, bg: 'bg-green-100', title: 'Profile Complete', sub: 'Basic info added' },
                { icon: <Star size={13} className="text-blue-600" />, bg: 'bg-blue-100', title: 'Community Member', sub: 'Joined tDIL' },
                { icon: <Award size={13} className="text-yellow-600" />, bg: 'bg-yellow-100', title: `Level ${profile.level} Achiever`, sub: `Reached level ${profile.level}` }
              ].map(a => (
                <div key={a.title} className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 ${a.bg} rounded-full flex items-center justify-center`}>{a.icon}</div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-400">{a.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Check-In History ── */}
        {isOwnProfile && checkIns.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Recent Check-Ins</h3>
            <div className="space-y-2">
              {checkIns.slice(0, 5).map(ci => (
                <div key={ci.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-lg">📍</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ci.venue}</p>
                    <p className="text-xs text-gray-500 truncate">{ci.location} · {new Date(ci.created_at).toLocaleDateString()}</p>
                  </div>
                  {ci.points_awarded > 0 && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      +{ci.points_awarded}
                    </span>
                  )}
                </div>
              ))}
              {checkIns.length > 5 && (
                <button onClick={() => navigate('/checkin-history')}
                  className="w-full text-xs text-blue-600 hover:text-blue-800 py-1">
                  View all {checkIns.length} check-ins →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Account Settings ── */}
        {isOwnProfile && (
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Account Settings</h3>
            <div className="space-y-2">
              {[
                { label: 'Email Notifications', sub: 'Updates about events and opportunities' },
                { label: 'Profile Visibility', sub: 'Allow other members to find your profile' },
                { label: 'Activity Tracking', sub: 'Help us improve your experience' }
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.label}</p>
                    <p className="text-xs text-gray-500">{s.sub}</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </PageLayout>
  );
}
