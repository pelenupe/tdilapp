import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import tdilIcon from '../assets/tdil-icon.png';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Fetch all events and find the one with matching ID
      const res = await fetch('/api/events', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const all = await res.json();
        const found = all.find(e => String(e.id) === String(id));
        if (found) {
          setEvent({
            id: found.id,
            title: found.title || 'Event',
            date: found.date || found.event_date,
            endDate: found.end_date || null,
            time: found.time || '',
            location: found.location || 'TBD',
            type: found.category === 'virtual' ? 'Virtual' : 'In-person',
            points: found.points || 50,
            attendees: found.current_attendees || 0,
            maxAttendees: found.maxAttendees || found.max_attendees || 50,
            description: found.description || '',
            image: found.image_url || null,
            registered: !!found.is_registered,
            createdBy: found.created_by,
            createdByName: found.createdByName || null,
            visibility: found.visibility || 'public',
            cohortName: found.cohort_name || null,
            signupUrl: found.signup_url || null,
            host: found.host || null,
          });
        } else {
          setEvent(null);
        }
      }
    } catch (err) {
      console.error('Error fetching event:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/events/${id}/register`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setEvent(e => ({ ...e, registered: true, attendees: e.attendees + 1 }));
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to register.');
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleUnregister = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/events/${id}/register`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setEvent(e => ({ ...e, registered: false, attendees: Math.max(0, e.attendees - 1) }));
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to cancel registration.');
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  if (loading) {
    return (
      <PageLayout userType={user?.userType || 'member'} title="Event" subtitle="Loading event..." showPointsInHeader userPoints={user?.points || 0}>
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-500">Loading event details…</div>
        </div>
      </PageLayout>
    );
  }

  if (!event) {
    return (
      <PageLayout userType={user?.userType || 'member'} title="Event Not Found" showPointsInHeader userPoints={user?.points || 0}>
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Event not found</h2>
          <p className="text-gray-500 mb-6">This event may have been removed or you don't have access.</p>
          <Link to="/events" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            ← Back to Events
          </Link>
        </div>
      </PageLayout>
    );
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : null;
  const formatTime = (t) => {
    if (!t) return null;
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };
  const capacityPct = Math.min(Math.round((event.attendees / event.maxAttendees) * 100), 100);
  const isFull = event.attendees >= event.maxAttendees;

  return (
    <PageLayout
      userType={user?.userType || 'member'}
      title={event.title}
      subtitle={`${event.type} Event`}
      showPointsInHeader
      userPoints={user?.points || 0}
      headerActions={
        <Link to="/events" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
          ← All Events
        </Link>
      }
    >
      <div className="max-w-3xl mx-auto">
        {/* Hero image */}
        {event.image ? (
          <img src={event.image} alt={event.title}
            className="w-full h-64 object-cover rounded-xl mb-6 shadow-sm"
            onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="w-full h-40 bg-gray-50 border border-gray-200 rounded-xl mb-6 flex items-center justify-center">
            <img src={tdilIcon} alt="tDIL" className="h-20 w-auto object-contain opacity-40" />
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          {/* Title + badges row */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${event.type === 'In-person' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                {event.type}
              </span>
              {event.visibility === 'cohort' && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  🎓 Cohort Only
                </span>
              )}
            </div>
            <span className="text-lg font-bold text-yellow-600">+{event.points} pts</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">{event.title}</h1>

          {/* Detail grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Date */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl">📅</span>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date</div>
                <div className="font-semibold text-gray-900">{formatDate(event.date)}</div>
                {event.endDate && event.endDate !== event.date && (
                  <div className="text-sm text-gray-600">through {formatDate(event.endDate)}</div>
                )}
                {event.time && (
                  <div className="text-sm text-gray-600 mt-0.5">⏰ {formatTime(event.time)}</div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl">📍</span>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Location</div>
                <div className="font-semibold text-gray-900">{event.location !== 'TBD' ? event.location : 'Location TBD'}</div>
              </div>
            </div>

            {/* Host */}
            {(event.host || event.createdByName) && (
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <span className="text-2xl">🎤</span>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Hosted By</div>
                  <div className="font-semibold text-gray-900">{event.host || event.createdByName}</div>
                </div>
              </div>
            )}

            {/* Capacity */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl">👥</span>
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Capacity</div>
                <div className="font-semibold text-gray-900">{event.attendees} / {event.maxAttendees} registered</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all ${capacityPct > 80 ? 'bg-red-500' : capacityPct > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${capacityPct}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">{capacityPct}% full</div>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">About This Event</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            {event.signupUrl && (
              <a href={event.signupUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl font-semibold text-base bg-green-600 text-white hover:bg-green-700 transition-colors">
                🔗 Sign Up / Register Externally
              </a>
            )}
            {event.registered ? (
              <button onClick={handleUnregister} disabled={actionLoading}
                className="w-full py-3 px-6 rounded-xl font-semibold text-base bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50">
                {actionLoading ? 'Updating…' : '✓ You\'re Registered — Click to Cancel'}
              </button>
            ) : (
              <button onClick={handleRegister} disabled={actionLoading || isFull}
                className={`w-full py-3 px-6 rounded-xl font-semibold text-base transition-colors ${
                  isFull ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                }`}>
                {actionLoading ? 'Registering…' : isFull ? 'Event Full' : `Register for This Event (+${event.points} pts)`}
              </button>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
