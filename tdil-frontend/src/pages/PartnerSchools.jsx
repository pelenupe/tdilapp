import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import { Calendar, ExternalLink, Video, BookOpen, Monitor, Mail, User, Star } from 'lucide-react';
import API from '../services/api';

// Convert YouTube/Vimeo URL to embeddable URL
const getEmbedUrl = (url) => {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
};

export default function PartnerSchools() {
  const { user, updateUser } = useUser();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectedUsers, setConnectedUsers] = useState({});
  const [connectingTo, setConnectingTo] = useState(null);
  const [expandedVideo, setExpandedVideo] = useState(null); // school id
  const [isAdmin] = useState(() => ['admin', 'founder'].includes(
    JSON.parse(localStorage.getItem('user') || '{}').userType
  ));

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      // Use the rich all-schools endpoint
      const res = await fetch('/api/portal/all-schools');
      const schoolData = res.ok ? await res.json() : [];
      setSchools(Array.isArray(schoolData) ? schoolData : []);

      // Fetch connection statuses for logged-in members
      const token = localStorage.getItem('token');
      if (token && schoolData.length > 0) {
        try {
          const statusRes = await fetch('/api/connections/statuses', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: schoolData.map(s => s.id) })
          });
          if (statusRes.ok) setConnectedUsers(await statusRes.json());
        } catch (_) {}
      }
    } catch (err) {
      console.error(err);
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (schoolId) => {
    try {
      setConnectingTo(schoolId);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: schoolId })
      });
      if (res.ok) {
        const result = await res.json();
        const userUpdate = result.users?.find(u => u.id === parseInt(user.id));
        if (userUpdate) updateUser({ points: userUpdate.points, level: result.userLevel });
        setConnectedUsers(prev => ({ ...prev, [schoolId]: { status: 'connected' } }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConnectingTo(null);
    }
  };

  const handleDisconnect = async (schoolId) => {
    try {
      setConnectingTo(schoolId);
      const token = localStorage.getItem('token');
      await fetch(`/api/connections/${schoolId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setConnectedUsers(prev => { const u = { ...prev }; delete u[schoolId]; return u; });
    } catch (err) {
      console.error(err);
    } finally {
      setConnectingTo(null);
    }
  };

  const handleToggleFeatured = async (school) => {
    try {
      await API.put(`/portal/admin/feature/${school.id}`, { featured: !school.school_featured });
      setSchools(prev => prev.map(s =>
        s.id === school.id ? { ...s, school_featured: s.school_featured ? 0 : 1 } : s
      ).sort((a, b) => (b.school_featured || 0) - (a.school_featured || 0)));
    } catch (err) {
      alert('Failed to update featured status');
    }
  };

  const isConnected = (schoolId) => connectedUsers[schoolId]?.status === 'connected';

  const featured = schools.filter(s => s.school_featured);
  const regular = schools.filter(s => !s.school_featured);

  if (loading) {
    return (
      <PageLayout userType={user?.userType || 'member'} title="Partner Schools" subtitle="Loading…">
        <div className="flex items-center justify-center py-16 text-gray-400">Loading partner schools…</div>
      </PageLayout>
    );
  }

  const SchoolCard = ({ school, featured: isFeatured }) => {
    const embedUrl = getEmbedUrl(school.school_intro_video_url);
    const showVideo = expandedVideo === school.id;

    return (
      <div className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${isFeatured ? 'border-yellow-300 shadow-sm' : 'border-gray-200'}`}>
        {/* Featured banner */}
        {isFeatured && (
          <div className="bg-gradient-to-r from-yellow-400 to-amber-400 px-4 py-1.5 flex items-center gap-2">
            <Star size={13} className="text-white fill-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wide">Featured Partner</span>
          </div>
        )}

        <div className="p-5">
          {/* School header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-purple-100">
              {school.profileImage
                ? <img src={school.profileImage} alt={school.company} className="w-full h-full object-cover" />
                : <span className="text-3xl">🎓</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-gray-900 text-base leading-tight">{school.company || `${school.firstName} ${school.lastName}`}</h3>
                  <p className="text-sm text-purple-600 font-medium mt-0.5">{school.jobTitle || 'Partner Institution'}</p>
                </div>
                {isAdmin && (
                  <button onClick={() => handleToggleFeatured(school)}
                    className={`text-xs px-2 py-1 rounded-lg border flex-shrink-0 ${school.school_featured ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-yellow-50'}`}>
                    ⭐ {school.school_featured ? 'Unfeature' : 'Feature'}
                  </button>
                )}
              </div>
              <span className="inline-block bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium mt-1">🎓 Partner School</span>
            </div>
          </div>

          {/* Bio/Description */}
          {school.bio && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-3">{school.bio}</p>
          )}

          {/* Video preview */}
          {embedUrl && (
            <div className="mb-4">
              {showVideo ? (
                <div className="relative rounded-lg overflow-hidden bg-black" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`${school.company} intro video`}
                  />
                  <button onClick={() => setExpandedVideo(null)}
                    className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded hover:bg-opacity-80">
                    Close ✕
                  </button>
                </div>
              ) : (
                <button onClick={() => setExpandedVideo(school.id)}
                  className="w-full flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-200 transition-colors text-sm text-gray-700">
                  <Video size={16} className="text-purple-600 flex-shrink-0" />
                  <span>Watch Intro Video</span>
                </button>
              )}
            </div>
          )}

          {/* Links */}
          <div className="space-y-2 mb-4">
            {school.calendly_url && (
              <a href={school.calendly_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 w-full p-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 hover:bg-green-100 transition-colors">
                <Calendar size={14} /> <span className="font-medium">Schedule a Meeting</span>
              </a>
            )}
            {school.school_zoom_url && (
              <a href={school.school_zoom_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 w-full p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-100 transition-colors">
                <Monitor size={14} /> <span className="font-medium">Join Zoom Meeting</span>
              </a>
            )}
            {school.school_materials_url && (
              <a href={school.school_materials_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 w-full p-2.5 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 hover:bg-orange-100 transition-colors">
                <BookOpen size={14} /> <span className="font-medium">Program Materials</span>
                <ExternalLink size={12} className="ml-auto" />
              </a>
            )}
          </div>

          {/* Contact */}
          {(school.school_contact_name || school.school_contact_email) && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Contact</p>
              {school.school_contact_name && (
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <User size={13} className="text-gray-400" /> {school.school_contact_name}
                </div>
              )}
              {school.school_contact_email && (
                <a href={`mailto:${school.school_contact_email}`}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline mt-0.5">
                  <Mail size={13} className="text-gray-400" /> {school.school_contact_email}
                </a>
              )}
            </div>
          )}

          {/* Connect button */}
          {isConnected(school.id) ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-center px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">✓ Connected</span>
              <button onClick={() => handleDisconnect(school.id)} disabled={connectingTo === school.id}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 text-sm">
                {connectingTo === school.id ? '…' : '✕'}
              </button>
            </div>
          ) : (
            <button onClick={() => handleConnect(school.id)} disabled={connectingTo === school.id}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50">
              {connectingTo === school.id ? 'Connecting…' : 'Connect with School'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <PageLayout
      userType={user?.userType || 'member'}
      title="Partner Schools"
      subtitle={`${schools.length} partner educational institution${schools.length !== 1 ? 's' : ''}`}
      userPoints={user?.points || 0}
    >
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Featured schools */}
        {featured.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Star size={16} className="text-yellow-500 fill-yellow-500" /> Featured Partners
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map(s => <SchoolCard key={s.id} school={s} featured={true} />)}
            </div>
          </section>
        )}

        {/* Regular schools */}
        {regular.length > 0 && (
          <section>
            {featured.length > 0 && <h2 className="text-base font-semibold text-gray-700 mb-3">All Partner Schools</h2>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {regular.map(s => <SchoolCard key={s.id} school={s} featured={false} />)}
            </div>
          </section>
        )}

        {/* Empty state */}
        {schools.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-5xl mb-4">🎓</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No partner schools yet</h3>
            <p className="text-gray-500 text-sm">Check back soon for partner school announcements!</p>
          </div>
        )}

        {/* Become a partner CTA */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Become a Partner School</h2>
          <p className="text-gray-600 text-sm mb-4">
            Partner with tDIL to connect your students with career opportunities and professional development.
          </p>
          <a href="mailto:partnerships@tdil.com"
            className="inline-flex items-center gap-2 bg-purple-600 text-white py-2 px-5 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
            <Mail size={14} /> Get in Touch
          </a>
        </div>

      </div>
    </PageLayout>
  );
}
