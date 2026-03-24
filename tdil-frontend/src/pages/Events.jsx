import { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import tdilIcon from '../assets/tdil-icon.png';

export default function Events() {
  const { user } = useUser();
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [userCohort, setUserCohort] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    end_date: '',
    time: '',
    location: '',
    category: 'in-person',
    maxAttendees: 50,
    points: 50,
    visibility: 'public',
    cohort_name: '',
    image_url: '',
    signup_url: '',
    host: ''
  });

  useEffect(() => {
    fetchEvents();
    fetchUserCohort();
  }, []);

  const fetchUserCohort = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/cohorts/my-cohort', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.name) setUserCohort(data.name);
        else if (data && typeof data === 'string') setUserCohort(data);
        // data might be {cohort: 'name', ...}
        else if (data && data.cohort) setUserCohort(data.cohort);
      }
    } catch (_) { /* cohort optional */ }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/events', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        const transformedEvents = data.map(event => ({
          id: event.id,
          title: event.title || 'Event',
          date: event.date || event.event_date,
          time: event.time || '',
          location: event.location || 'TBD',
          type: event.category === 'virtual' ? 'Virtual' : 'In-person',
          points: event.points || 50,
          attendees: event.current_attendees || 0,
          maxAttendees: event.maxAttendees || event.max_attendees || 50,
          description: event.description || '',
          image: event.image_url || null,
          registered: event.is_registered || false,
          createdBy: event.created_by,
          visibility: event.visibility || 'public',
          cohortName: event.cohort_name || null,
          endDate: event.end_date || null,
          signupUrl: event.signup_url || null,
          host: event.host || null,
          createdByName: event.createdByName || null
        }));
        setEvents(transformedEvents);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setNewEvent(prev => ({ ...prev, image_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) { alert('Please login to create events.'); return; }

      const eventDateTime = `${newEvent.date}T${newEvent.time || '12:00'}:00`;

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEvent.title,
          description: newEvent.description,
          date: eventDateTime,
          location: newEvent.location,
          category: newEvent.category,
          max_attendees: newEvent.maxAttendees,
          points: newEvent.points,
          visibility: newEvent.visibility,
          cohort_name: newEvent.visibility === 'cohort' ? (newEvent.cohort_name || userCohort) : null,
          end_date: newEvent.end_date || null,
          image_url: newEvent.image_url || null,
          signup_url: newEvent.signup_url || null,
          host: newEvent.host || null
        })
      });

      if (response.ok) {
        setShowModal(false);
        setNewEvent({ title: '', description: '', date: '', end_date: '', time: '', location: '', category: 'in-person', maxAttendees: 50, points: 50, visibility: 'public', cohort_name: '', image_url: '', signup_url: '', host: '' });
        setImagePreview(null);
        fetchEvents();
      } else {
        const error = await response.json();
        alert(error.error || error.message || 'Failed to create event.');
      }
    } catch (error) {
      console.error('Create event error:', error);
      alert('Failed to create event. Please try again.');
    }
  };

  const handleRegister = async (eventId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { alert('Please login to register for events.'); return; }
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, registered: true, attendees: e.attendees + 1 } : e));
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to register.');
      }
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const handleUnregister = async (eventId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, registered: false, attendees: Math.max(0, e.attendees - 1) } : e));
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to cancel registration.');
      }
    } catch (error) {
      console.error('Unregister error:', error);
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'registered') return event.registered;
    if (filter === 'my-events') return event.createdBy === user?.id;
    if (filter === 'virtual') return event.type === 'Virtual';
    if (filter === 'in-person') return event.type === 'In-person';
    return true;
  });

  const resetModal = () => {
    setShowModal(false);
    setImagePreview(null);
    setNewEvent({ title: '', description: '', date: '', end_date: '', time: '', location: '', category: 'in-person', maxAttendees: 50, points: 50, visibility: 'public', cohort_name: '', image_url: '', signup_url: '', host: '' });
  };

  if (loading) {
    return (
      <PageLayout userType={user?.userType || 'member'} title="Events" subtitle="Loading events..." showPointsInHeader={true} userPoints={user?.points || 0}>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading events...</div>
        </div>
      </PageLayout>
    );
  }

  const headerActions = (
    <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
      <span>➕</span> Create Event
    </button>
  );

  const filterButtons = (
    <div className="flex flex-wrap gap-2">
      {[
        { key: 'all', label: `All Events (${events.length})` },
        { key: 'my-events', label: 'My Events' },
        { key: 'registered', label: `Registered (${events.filter(e => e.registered).length})` },
        { key: 'virtual', label: `Virtual (${events.filter(e => e.type === 'Virtual').length})` },
        { key: 'in-person', label: `In-Person (${events.filter(e => e.type === 'In-person').length})` },
      ].map(({ key, label }) => (
        <button key={key} onClick={() => setFilter(key)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${filter === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <PageLayout userType={user?.userType || 'member'} title="Events" subtitle="Discover and register for upcoming tDIL events" userPoints={user?.points || 0} showPointsInHeader={true} headerActions={headerActions} headerContent={filterButtons}>

      {/* Create Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create New Event</h2>
                <button onClick={resetModal} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
                  <input type="text" required value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Networking Mixer" />
                </div>

                {/* Date + Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input type="date" required value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input type="time" value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                {/* End Date (multi-day) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-gray-400 font-normal">(optional — for multi-day events)</span>
                  </label>
                  <input type="date" value={newEvent.end_date}
                    min={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Indianapolis, IN or Virtual" />
                </div>

                {/* Type + Capacity */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                    <select value={newEvent.category}
                      onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="in-person">In-Person</option>
                      <option value="virtual">Virtual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees</label>
                    <input type="number" value={newEvent.maxAttendees} min="1"
                      onChange={(e) => setNewEvent({ ...newEvent, maxAttendees: parseInt(e.target.value) || 50 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                {/* Visibility */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Who can see this event?</label>
                  <div className="flex gap-3">
                    <label className={`flex-1 flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${newEvent.visibility === 'public' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="visibility" value="public" checked={newEvent.visibility === 'public'}
                        onChange={() => setNewEvent({ ...newEvent, visibility: 'public', cohort_name: '' })}
                        className="accent-blue-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">🌐 Public</div>
                        <div className="text-xs text-gray-500">Visible to all members</div>
                      </div>
                    </label>
                    <label className={`flex-1 flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${newEvent.visibility === 'cohort' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'} ${!userCohort ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <input type="radio" name="visibility" value="cohort" checked={newEvent.visibility === 'cohort'}
                        onChange={() => userCohort && setNewEvent({ ...newEvent, visibility: 'cohort', cohort_name: userCohort })}
                        disabled={!userCohort}
                        className="accent-blue-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">🎓 Cohort Only</div>
                        <div className="text-xs text-gray-500">
                          {userCohort ? `${userCohort} members` : 'Not in a cohort'}
                        </div>
                      </div>
                    </label>
                  </div>
                  {newEvent.visibility === 'cohort' && userCohort && (
                    <p className="mt-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
                      🎓 Only members of <strong>{userCohort}</strong> will see and register for this event.
                    </p>
                  )}
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Image <span className="text-gray-400 font-normal">(optional)</span></label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                      <img src={imagePreview || tdilIcon} alt="preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
                        📷 Upload image
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                      {imagePreview && (
                        <button type="button" onClick={() => { setImagePreview(null); setNewEvent(p => ({ ...p, image_url: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                          className="mt-1 text-xs text-red-500 hover:text-red-700">
                          Remove image (use tDIL icon)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Host */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hosted By <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input type="text" value={newEvent.host}
                    onChange={(e) => setNewEvent({ ...newEvent, host: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., tDIL, Indiana University, Career Services…" />
                </div>

                {/* External Sign-Up Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    External Sign-Up Link <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input type="url" value={newEvent.signup_url}
                    onChange={(e) => setNewEvent({ ...newEvent, signup_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://calendly.com/… or Eventbrite/Zoom link" />
                  <p className="text-xs text-gray-400 mt-1">If set, members will see an external "Sign Up" link on this event.</p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={newEvent.description} rows={3}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your event..." />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={resetModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    Create Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <img
              src={event.image || tdilIcon}
              alt={event.title}
              className="w-full h-48 object-cover"
              onError={(e) => { e.target.src = tdilIcon; }}
            />
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${event.type === 'In-person' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {event.type}
                  </span>
                  {event.visibility === 'cohort' && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      🎓 Cohort
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-yellow-600">+{event.points} pts</span>
              </div>

              <h3 className="font-bold text-gray-900 mb-2 text-lg">{event.title}</h3>
              {event.description && <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>}

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>📅</span>
                  {event.date ? new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'TBD'}
                  {event.endDate && event.endDate !== event.date && (
                    <> – {new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                  )}
                  {event.time && ` • ${event.time}`}
                </div>
                {event.location && event.location !== 'TBD' && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>📍</span>{event.location}
                  </div>
                )}
                {(event.host || event.createdByName) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>🎤</span>Hosted by {event.host || event.createdByName}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>👥</span>{event.attendees}/{event.maxAttendees} attendees
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Registration</span>
                  <span>{Math.round((event.attendees / event.maxAttendees) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${event.attendees / event.maxAttendees > 0.8 ? 'bg-red-500' : event.attendees / event.maxAttendees > 0.6 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min((event.attendees / event.maxAttendees) * 100, 100)}%` }} />
                </div>
              </div>

              {/* External sign-up link takes priority if set */}
              {event.signupUrl ? (
                <div className="space-y-2">
                  <a href={event.signupUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg font-medium text-sm bg-green-600 text-white hover:bg-green-700 transition-colors">
                    🔗 Sign Up / Register
                  </a>
                  {!event.registered && (
                    <button onClick={() => handleRegister(event.id)}
                      className="w-full py-1.5 px-4 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
                      Also mark as attending in tDIL
                    </button>
                  )}
                </div>
              ) : event.registered ? (
                <button onClick={() => handleUnregister(event.id)}
                  className="w-full py-2 px-4 rounded-lg font-medium transition-colors text-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
                  ✓ Registered — Cancel?
                </button>
              ) : (
                <button onClick={() => handleRegister(event.id)}
                  disabled={event.attendees >= event.maxAttendees}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors text-sm ${event.attendees >= event.maxAttendees ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  {event.attendees >= event.maxAttendees ? 'Event Full' : 'Register Now'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600 mb-4">Be the first to create an event!</p>
          <button onClick={() => setShowModal(true)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Create Event
          </button>
        </div>
      )}
    </PageLayout>
  );
}
