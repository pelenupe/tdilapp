import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import {
  ArrowLeft, Globe, Linkedin, Mail, Phone, User as UserIcon,
  Calendar, Monitor, Video, BookOpen, ExternalLink, Star
} from 'lucide-react';

// Embed YouTube / Vimeo
const getEmbedUrl = (url) => {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
};

const TYPE_CONFIG = {
  partner_school: { label: 'Partner School', icon: '🎓', color: 'purple', bg: 'bg-purple-600', badge: 'bg-purple-100 text-purple-800', border: 'border-purple-300' },
  sponsor:        { label: 'Sponsor',         icon: '🤝', color: 'emerald', bg: 'bg-emerald-600', badge: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-300' },
  employer:       { label: 'Employer',         icon: '💼', color: 'blue',    bg: 'bg-blue-600',    badge: 'bg-blue-100 text-blue-800',    border: 'border-blue-300' },
};

export default function OrgProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [org, setOrg] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoExpanded, setVideoExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;

    if (/^\d+$/.test(id)) {
      fetch(`/api/portal/org-detail/${id}`)
        .then(r => r.ok ? r.json() : Promise.reject('not found'))
        .then(data => {
          if (data.org && data.org.slug) {
            navigate(`/org/${data.org.slug}`, { replace: true });
          } else {
            setOrg(data.org);
            setUsers(data.users || []);
            setLoading(false);
          }
        })
        .catch(() => { setError('Organization profile not found.'); setLoading(false); });
      return;
    }

    fetch(`/api/portal/org-detail/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject('not found'))
      .then(data => {
        setOrg(data.org);
        setUsers(data.users || []);
      })
      .catch(() => setError('Organization profile not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PageLayout userType={user?.userType || 'member'} title="Loading…">
        <div className="flex items-center justify-center py-24 text-gray-400">Loading profile…</div>
      </PageLayout>
    );
  }

  if (error || !org) {
    return (
      <PageLayout userType={user?.userType || 'member'} title="Not Found">
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-500 mb-6">{error || 'This organization profile could not be found.'}</p>
          <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline text-sm">← Go back</button>
        </div>
      </PageLayout>
    );
  }

  const cfg = TYPE_CONFIG[org.org_type] || TYPE_CONFIG.partner_school;
  const embedUrl = getEmbedUrl(org.intro_video_url);
  const displayName = org.name || 'Organization';

  return (
    <PageLayout
      userType={user?.userType || 'member'}
      title={displayName}
      subtitle={cfg.label}
      userPoints={user?.points || 0}
    >
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Back button */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={14} /> Back
        </button>

        {/* Hero card */}
        <div className={`bg-white rounded-2xl shadow-sm border-2 ${cfg.border} overflow-hidden`}>
          {/* Featured banner */}
          {org.featured ? (
            <div className="bg-gradient-to-r from-yellow-400 to-amber-400 px-5 py-1.5 flex items-center gap-2">
              <Star size={13} className="text-white fill-white" />
              <span className="text-xs font-bold text-white uppercase tracking-wide">Featured Partner</span>
            </div>
          ) : null}

          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-5">
              {/* Logo / avatar */}
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center flex-shrink-0 ${cfg.bg} bg-opacity-10 border-2 ${cfg.border} overflow-hidden`}>
                {org.logo_url
                  ? <img src={org.logo_url} alt={displayName} className="w-full h-full object-cover" />
                  : <span className="text-4xl">{cfg.icon}</span>}
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{displayName}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>
                {/* Quick links row */}
                <div className="flex flex-wrap gap-3 mt-3">
                  {org.website && (
                    <a href={org.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      <Globe size={12} /> Website
                    </a>
                  )}
                  {org.linkedin_url && (
                    <a href={org.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      <Linkedin size={12} /> LinkedIn
                    </a>
                  )}
                  {org.phone && (
                    <a href={`tel:${org.phone}`} className="flex items-center gap-1 text-xs text-gray-600">
                      <Phone size={12} /> {org.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {org.description && (
              <div className="mt-5">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">About</h2>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{org.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Intro Video */}
        {embedUrl && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <Video size={15} className="text-gray-500" />
              <h2 className="font-semibold text-gray-900 text-sm">Intro Video</h2>
            </div>
            <div className="p-4">
              {videoExpanded ? (
                <div className="relative rounded-lg overflow-hidden bg-black" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`${displayName} intro video`}
                  />
                </div>
              ) : (
                <button onClick={() => setVideoExpanded(true)}
                  className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors text-sm text-gray-700">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Video size={18} className="text-red-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Watch Intro Video</div>
                    <div className="text-xs text-gray-500 mt-0.5">Click to play</div>
                  </div>
                  <ExternalLink size={14} className="ml-auto text-gray-400" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action Links (school-specific) */}
        {(org.calendly_url || org.zoom_url || org.materials_url) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Resources</h2>
            </div>
            <div className="p-4 space-y-2">
              {org.calendly_url && (
                <a href={org.calendly_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 hover:bg-green-100 transition-colors">
                  <Calendar size={16} className="flex-shrink-0" />
                  <span className="font-medium">Schedule a Meeting</span>
                  <ExternalLink size={12} className="ml-auto opacity-60" />
                </a>
              )}
              {org.zoom_url && (
                <a href={org.zoom_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 hover:bg-blue-100 transition-colors">
                  <Monitor size={16} className="flex-shrink-0" />
                  <span className="font-medium">Join Zoom Meeting</span>
                  <ExternalLink size={12} className="ml-auto opacity-60" />
                </a>
              )}
              {org.materials_url && (
                <a href={org.materials_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800 hover:bg-orange-100 transition-colors">
                  <BookOpen size={16} className="flex-shrink-0" />
                  <span className="font-medium">Program Materials</span>
                  <ExternalLink size={12} className="ml-auto opacity-60" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Contact */}
        {(org.contact_name || org.contact_email) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Contact</h2>
            </div>
            <div className="p-4 space-y-2">
              {org.contact_name && (
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <UserIcon size={16} className="text-gray-500" />
                  </div>
                  <div>
                    <div className="font-medium">{org.contact_name}</div>
                    <div className="text-xs text-gray-400">Primary Contact</div>
                  </div>
                </div>
              )}
              {org.contact_email && (
                <a href={`mailto:${org.contact_email}`}
                  className="flex items-center gap-3 text-sm text-blue-600 hover:underline">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Mail size={16} className="text-blue-500" />
                  </div>
                  <span>{org.contact_email}</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Users associated with this org */}
        {users.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">
                {cfg.label} Representatives ({users.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-9 h-9 rounded-full ${cfg.bg} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {(u.firstName?.[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</div>
                    {u.jobTitle && <div className="text-xs text-gray-500">{u.jobTitle}</div>}
                  </div>
                  {u.email && (
                    <a href={`mailto:${u.email}`} className="ml-auto text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <Mail size={11} /> Email
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </PageLayout>
  );
}
