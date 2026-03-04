import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import ProfileImage from '../components/ProfileImage';
import API from '../services/api';

export default function MyCohort() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { name: paramName } = useParams(); // optional :name param

  const [myCohortName, setMyCohortName] = useState(null);   // logged-in user's cohort
  const [activeCohort, setActiveCohort] = useState(null);   // currently viewed cohort name
  const [members, setMembers] = useState([]);
  const [allCohorts, setAllCohorts] = useState([]);          // list of all cohort names with counts
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '', description: '', eventDate: '', location: '',
    locationType: 'in-person', maxAttendees: ''
  });

  // Which cohort are we viewing?
  const viewingOwn = !paramName || paramName === myCohortName;

  useEffect(() => {
    loadEverything();
  }, [paramName]);

  const loadEverything = async () => {
    setLoading(true);
    try {
      // Always fetch my cohort name
      const myRes = await API.get('/cohorts/my-cohort');
      const myName = myRes.data?.name || null;
      setMyCohortName(myName);

      // Decide which cohort to display
      const target = paramName ? decodeURIComponent(paramName) : myName;
      setActiveCohort(target);

      // Fetch all cohort names for the browser
      const namesRes = await API.get('/cohorts/names');
      setAllCohorts((namesRes.data || []).filter(c => c.memberCount > 0));

      if (target) {
        // Load members for the target cohort
        const membersRes = await API.get(`/cohorts/members-by-name/${encodeURIComponent(target)}`);
        setMembers(membersRes.data || []);

        // Load events (only relevant for own cohort)
        if (!paramName || paramName === myName) {
          try {
            const eventsRes = await API.get(`/cohorts/1/events`);
            setEvents(eventsRes.data || []);
          } catch (_) { setEvents([]); }
        }
      }
    } catch (err) {
      console.error('Error loading cohort data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCohortChat = async () => {
    setChatLoading(true);
    try {
      await API.post('/cohorts/group-chat');
      navigate('/chats');
    } catch (err) {
      console.error('Error with cohort chat:', err);
      navigate('/chats');
    } finally {
      setChatLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await API.post('/cohorts/events', {
        cohortId: 1,
        ...eventForm,
        maxAttendees: eventForm.maxAttendees ? parseInt(eventForm.maxAttendees) : null
      });
      setShowEventModal(false);
      setEventForm({ title: '', description: '', eventDate: '', location: '', locationType: 'in-person', maxAttendees: '' });
      alert('Event created successfully!');
    } catch (err) {
      console.error('Error creating event:', err);
      alert('Failed to create event');
    }
  };

  if (loading) {
    return (
      <PageLayout userType={user?.userType} title="Cohort" subtitle="Loading...">
        <div className="text-center py-12 text-gray-400">Loading cohort data…</div>
      </PageLayout>
    );
  }

  // No cohort at all
  if (!activeCohort && !myCohortName) {
    return (
      <PageLayout userType={user?.userType} title="My Cohort" subtitle="Join your cohort">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center max-w-lg mx-auto">
          <div className="text-5xl mb-4">🎓</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Cohort Yet</h2>
          <p className="text-gray-500 mb-5 text-sm">
            Update your profile to set your cohort and connect with your group.
          </p>
          <button onClick={() => navigate('/profile')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            Update Profile
          </button>
          {allCohorts.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-gray-400 mb-3">Or browse existing cohorts:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {allCohorts.slice(0, 8).map(c => (
                  <button key={c.name} onClick={() => navigate(`/cohort/${encodeURIComponent(c.name)}`)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs hover:bg-blue-100 border border-blue-200">
                    🎓 {c.name} ({c.memberCount})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </PageLayout>
    );
  }

  const displayName = activeCohort || myCohortName || 'My Cohort';
  const isOwnCohort = !paramName || (myCohortName && paramName === myCohortName);

  return (
    <PageLayout
      userType={user?.userType}
      title={displayName}
      subtitle={`${members.length} member${members.length !== 1 ? 's' : ''}${isOwnCohort ? ' · Your cohort' : ''}`}
      userPoints={user?.points}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBrowse(prev => !prev)}
            className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${showBrowse ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            🎓 Browse Cohorts
          </button>
          {isOwnCohort && (
            <button
              onClick={() => navigate('/profile')}
              className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Change My Cohort
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5">

        {/* ── Browse All Cohorts Panel ── */}
        {showBrowse && (
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">All Cohorts</h3>
            <div className="flex flex-wrap gap-2">
              {allCohorts.map(c => (
                <button
                  key={c.name}
                  onClick={() => {
                    navigate(`/cohort/${encodeURIComponent(c.name)}`);
                    setShowBrowse(false);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    c.name === activeCohort
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                  }`}
                >
                  🎓 {c.name} <span className="ml-1 opacity-70">({c.memberCount})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Cohort Hero Card ── */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">{displayName}</h2>
              <p className="text-blue-100 text-sm">
                {members.length} member{members.length !== 1 ? 's' : ''}
                {isOwnCohort && myCohortName && ' · Your cohort'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isOwnCohort && (
                <button onClick={handleCohortChat} disabled={chatLoading}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium text-sm hover:bg-blue-50 disabled:opacity-60">
                  {chatLoading ? '⏳…' : '💬 Cohort Chat'}
                </button>
              )}
              {!isOwnCohort && myCohortName && (
                <button onClick={() => navigate(`/cohort/${encodeURIComponent(myCohortName)}`)}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium text-sm hover:bg-blue-50">
                  ← My Cohort
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Events (own cohort only) ── */}
        {isOwnCohort && (
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">📅 Upcoming Events</h3>
              <button onClick={() => setShowEventModal(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                + Create Event
              </button>
            </div>
            {events.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4 italic">No upcoming events. Create the first one!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {events.map(event => (
                  <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 text-sm">{event.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{new Date(event.event_date).toLocaleString()}</p>
                    {event.location && <p className="text-xs text-gray-500">📍 {event.location}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Members Grid ── */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            👥 {isOwnCohort ? 'Cohort Members' : `${displayName} Members`}
          </h3>
          {members.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6 italic">No members in this cohort yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map(member => (
                <div key={member.id}
                  onClick={() => navigate(`/profile/${member.id}`)}
                  className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-200">
                  <div className="flex items-center gap-3">
                    <ProfileImage
                      src={member.profile_image}
                      firstName={member.firstname}
                      lastName={member.lastname}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <Link to={`/profile/${member.id}`}
                        onClick={e => e.stopPropagation()}
                        className="font-medium text-blue-600 hover:underline text-sm block truncate">
                        {member.firstname} {member.lastname}
                        {member.id === user?.id && <span className="ml-1 text-xs text-gray-400">(you)</span>}
                      </Link>
                      <p className="text-xs text-gray-500 truncate">{member.jobtitle || 'Member'}</p>
                      <p className="text-xs text-blue-600 font-medium mt-0.5">
                        ⭐ {member.points || 0} pts · Lvl {member.level || 1}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Event Creation Modal ── */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Create Cohort Event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Event Title *</label>
                <input type="text" required value={eventForm.title}
                  onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={2} value={eventForm.description}
                  onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date & Time *</label>
                <input type="datetime-local" required value={eventForm.eventDate}
                  onChange={e => setEventForm({ ...eventForm, eventDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location / Link</label>
                <input type="text" value={eventForm.location} placeholder="Address or Zoom link"
                  onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={eventForm.locationType}
                    onChange={e => setEventForm({ ...eventForm, locationType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="in-person">In-Person</option>
                    <option value="virtual">Virtual</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Attendees</label>
                  <input type="number" min="1" value={eventForm.maxAttendees}
                    onChange={e => setEventForm({ ...eventForm, maxAttendees: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEventModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
