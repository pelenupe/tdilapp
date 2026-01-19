import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';

export default function Events() {
  const { user } = useUser();
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    category: 'in-person',
    maxAttendees: 50,
    points: 50
  });

  useEffect(() => {
    fetchEvents();
  }, []);

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
          time: event.time || 'TBD',
          location: event.location || 'TBD',
          type: event.category === 'virtual' ? 'Virtual' : 'In-person',
          points: event.points || 50,
          attendees: event.current_attendees || 0,
          maxAttendees: event.max_attendees || 50,
          description: event.description || '',
          image: event.image_url || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=250&fit=crop',
          registered: event.is_registered || false,
          createdBy: event.created_by
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

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to create events.');
        return;
      }

      const eventDateTime = `${newEvent.date}T${newEvent.time || '12:00'}:00`;
      
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newEvent.title,
          description: newEvent.description,
          date: eventDateTime,
          location: newEvent.location,
          category: newEvent.category,
          max_attendees: newEvent.maxAttendees,
          points: newEvent.points
        })
      });

      if (response.ok) {
        setShowModal(false);
        setNewEvent({
          title: '',
          description: '',
          date: '',
          time: '',
          location: '',
          category: 'in-person',
          maxAttendees: 50,
          points: 50
        });
        fetchEvents();
        alert('Event created successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create event.');
      }
    } catch (error) {
      console.error('Create event error:', error);
      alert('Failed to create event. Please try again.');
    }
  };

  const handleRegister = async (eventId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to register for events.');
        return;
      }

      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchEvents();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to register.');
      }
    } catch (error) {
      console.error('Registration error:', error);
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

  if (loading) {
    return (
      <PageLayout
        userType={user?.userType || 'member'}
        title="Events"
        subtitle="Loading events..."
        showPointsInHeader={true}
        userPoints={user?.points || 0}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading events...</div>
        </div>
      </PageLayout>
    );
  }

  const headerActions = (
    <button
      onClick={() => setShowModal(true)}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
    >
      <span>➕</span> Create Event
    </button>
  );

  const filterButtons = (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setFilter('all')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
          filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        All Events ({events.length})
      </button>
      <button
        onClick={() => setFilter('my-events')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
          filter === 'my-events' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        My Events
      </button>
      <button
        onClick={() => setFilter('registered')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
          filter === 'registered' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        Registered ({events.filter(e => e.registered).length})
      </button>
      <button
        onClick={() => setFilter('virtual')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
          filter === 'virtual' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        Virtual ({events.filter(e => e.type === 'Virtual').length})
      </button>
      <button
        onClick={() => setFilter('in-person')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
          filter === 'in-person' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        In-Person ({events.filter(e => e.type === 'In-person').length})
      </button>
    </div>
  );

  return (
    <PageLayout
      userType={user?.userType || 'member'}
      title="Events"
      subtitle="Discover and register for upcoming tDIL events"
      userPoints={user?.points || 0}
      showPointsInHeader={true}
      headerActions={headerActions}
      headerContent={filterButtons}
    >
      {/* Create Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create New Event</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
                  <input
                    type="text"
                    required
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Networking Mixer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Indianapolis, IN or Virtual"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                    <select
                      value={newEvent.category}
                      onChange={(e) => setNewEvent({...newEvent, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="in-person">In-Person</option>
                      <option value="virtual">Virtual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees</label>
                    <input
                      type="number"
                      value={newEvent.maxAttendees}
                      onChange={(e) => setNewEvent({...newEvent, maxAttendees: parseInt(e.target.value) || 50})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your event..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
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
            <img src={event.image} alt={event.title} className="w-full h-48 object-cover" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  event.type === 'In-person' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {event.type}
                </span>
                <span className="text-xs font-medium text-yellow-600">+{event.points} points</span>
              </div>
              
              <h3 className="font-bold text-gray-900 mb-2 text-lg">{event.title}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>📅</span>
                  {event.date ? new Date(event.date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  }) : 'TBD'} {event.time && `• ${event.time}`}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>📍</span>
                  {event.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>👥</span>
                  {event.attendees}/{event.maxAttendees} attendees
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Registration</span>
                  <span>{Math.round((event.attendees / event.maxAttendees) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      event.attendees / event.maxAttendees > 0.8 ? 'bg-red-500' :
                      event.attendees / event.maxAttendees > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(event.attendees / event.maxAttendees) * 100}%` }}
                  />
                </div>
              </div>

              <button
                onClick={() => handleRegister(event.id)}
                disabled={!event.registered && event.attendees >= event.maxAttendees}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  event.registered
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : event.attendees >= event.maxAttendees
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {event.registered 
                  ? 'Registered ✓' 
                  : event.attendees >= event.maxAttendees 
                  ? 'Event Full' 
                  : 'Register Now'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600 mb-4">Be the first to create an event!</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Create Event
          </button>
        </div>
      )}
    </PageLayout>
  );
}
