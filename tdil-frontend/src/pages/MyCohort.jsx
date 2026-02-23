import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import ProfileImage from '../components/ProfileImage';
import API from '../services/api';

export default function MyCohort() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [cohort, setCohort] = useState(null);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    eventDate: '',
    location: '',
    locationType: 'in-person',
    maxAttendees: ''
  });

  useEffect(() => {
    fetchCohortData();
  }, []);

  const fetchCohortData = async () => {
    try {
      setLoading(true);
      const cohortRes = await API.get('/cohorts/my-cohort');
      
      if (!cohortRes.data) {
        setLoading(false);
        return;
      }

      setCohort(cohortRes.data);

      // Fetch members and events
      const [membersRes, eventsRes] = await Promise.all([
        API.get(`/cohorts/${cohortRes.data.id}/members`),
        API.get(`/cohorts/${cohortRes.data.id}/events`)
      ]);

      setMembers(membersRes.data);
      setEvents(eventsRes.data);
    } catch (error) {
      console.error('Error fetching cohort data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await API.post('/cohorts/events', {
        cohortId: cohort.id,
        ...eventForm,
        maxAttendees: eventForm.maxAttendees ? parseInt(eventForm.maxAttendees) : null
      });

      setShowEventModal(false);
      setEventForm({
        title: '',
        description: '',
        eventDate: '',
        location: '',
        locationType: 'in-person',
        maxAttendees: ''
      });
      fetchCohortData();
      alert('Event created successfully!');
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    }
  };

  const handleRSVP = async (eventId) => {
    try {
      await API.post(`/cohorts/events/${eventId}/register`);
      fetchCohortData();
      alert('RSVP confirmed!');
    } catch (error) {
      console.error('Error registering for event:', error);
      alert(error.response?.data?.message || 'Failed to RSVP');
    }
  };

  if (loading) {
    return (
      <PageLayout userType={user?.userType} title="My Cohort" subtitle="Loading...">
        <div className="text-center py-12">Loading cohort data...</div>
      </PageLayout>
    );
  }

  if (!cohort) {
    return (
      <PageLayout userType={user?.userType} title="My Cohort" subtitle="Join your cohort">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="text-6xl mb-4">🎓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Cohort Yet</h2>
          <p className="text-gray-600 mb-6">
            Add your alma mater and graduation year to your profile to join your cohort
          </p>
          <button
            onClick={() => navigate('/profile')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Update Profile
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      userType={user?.userType}
      title={cohort.name}
      subtitle={`${members.length} members`}
      userPoints={user?.points}
    >
      <div className="space-y-6">
        {/* Cohort Info Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{cohort.name}</h2>
              <p className="text-blue-100">{cohort.school_name} • Class of {cohort.graduation_year}</p>
              <p className="text-blue-100 mt-2">{members.length} members in your cohort</p>
            </div>
            <div className="text-right">
              <button
                onClick={() => navigate('/chats')}
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                💬 Open Group Chat
              </button>
            </div>
          </div>
        </div>

        {/* Events Section */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">📅 Upcoming Events</h3>
            <button
              onClick={() => setShowEventModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Create Event
            </button>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No upcoming events. Create the first one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((event) => (
                <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{event.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      event.location_type === 'virtual' ? 'bg-purple-100 text-purple-700' :
                      event.location_type === 'hybrid' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {event.location_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{event.description}</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>📅 {new Date(event.event_date).toLocaleString()}</p>
                    {event.location && <p>📍 {event.location}</p>}
                    <p>👥 {event.attendee_count || 0} attending{event.max_attendees && ` / ${event.max_attendees}`}</p>
                  </div>
                  <button
                    onClick={() => handleRSVP(event.id)}
                    className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    RSVP
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members Section */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">👥 Cohort Members</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/profile/${member.id}`)}
              >
                <div className="flex items-center gap-3">
                  <ProfileImage 
                    src={member.profile_image}
                    firstName={member.firstname}
                    lastName={member.lastname}
                    size="md"
                  />
                  <div className="flex-1">
                    <Link
                      to={`/profile/${member.id}`}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {member.firstname} {member.lastname}
                    </Link>
                    <p className="text-sm text-gray-600">{member.jobtitle || 'Member'}</p>
                    {member.company && (
                      <p className="text-xs text-gray-500">{member.company}</p>
                    )}
                    <p className="text-xs text-blue-600 font-medium mt-1">
                      ⭐ {member.points || 0} points • Level {member.level || 1}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event Creation Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Create Cohort Event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={eventForm.eventDate}
                  onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Address or Zoom link"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={eventForm.locationType}
                  onChange={(e) => setEventForm({ ...eventForm, locationType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="in-person">In-Person</option>
                  <option value="virtual">Virtual</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees (optional)</label>
                <input
                  type="number"
                  min="1"
                  value={eventForm.maxAttendees}
                  onChange={(e) => setEventForm({ ...eventForm, maxAttendees: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
