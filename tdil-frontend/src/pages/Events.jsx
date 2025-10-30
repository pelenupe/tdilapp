import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(2450);
  const [user, setUser] = useState({ userType: 'member' });

  // Load user data from localStorage
  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser({
        userType: userData.userType || 'member'
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  useEffect(() => {
    // Fetch real events from API
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/events');
        
        if (response.ok) {
          const data = await response.json();
          // Transform data to match frontend format
          const transformedEvents = data.map(event => ({
            id: event.id,
            title: event.title || 'Event',
            date: event.event_date ? event.event_date.split('T')[0] : new Date().toISOString().split('T')[0],
            time: event.event_date ? new Date(event.event_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD',
            location: event.location || 'TBD',
            type: event.category === 'virtual' ? 'Virtual' : 'In-person',
            points: event.points || 50,
            attendees: Math.floor(Math.random() * 20) + 5, // Temporary until attendee system
            maxAttendees: event.max_attendees || 50,
            description: event.description || 'Join us for this exciting tDIL event.',
            image: event.image_url || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&h=250&fit=crop',
            registered: false // Temporary until registration system
          }));
          setEvents(transformedEvents);
        } else {
          console.error('Failed to fetch events');
          setEvents([]); // Show empty state instead of fake data
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]); // Show empty state instead of fake data
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'registered') return event.registered;
    if (filter === 'virtual') return event.type === 'Virtual';
    if (filter === 'in-person') return event.type === 'In-person';
    return true;
  });

  const handleRegister = (eventId) => {
    setEvents(events.map(event => 
      event.id === eventId 
        ? { ...event, registered: !event.registered, attendees: event.registered ? event.attendees - 1 : event.attendees + 1 }
        : event
    ));
  };

  if (loading) {
    return (
      <PageLayout
        userType={user.userType}
        title="Events"
        subtitle="Loading events..."
        showPointsInHeader={false}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-4 mx-auto">
              tDIL
            </div>
            <div className="text-gray-600">Loading events...</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const filterButtons = (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setFilter('all')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        All Events ({events.length})
      </button>
      <button
        onClick={() => setFilter('registered')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          filter === 'registered' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        My Events ({events.filter(e => e.registered).length})
      </button>
      <button
        onClick={() => setFilter('virtual')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          filter === 'virtual' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        Virtual ({events.filter(e => e.type === 'Virtual').length})
      </button>
      <button
        onClick={() => setFilter('in-person')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          filter === 'in-person' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        In-Person ({events.filter(e => e.type === 'In-person').length})
      </button>
    </div>
  );

  return (
    <PageLayout
      userType={user.userType}
      title="Events"
      subtitle="Discover and register for upcoming tDIL events"
      userPoints={userPoints}
      headerContent={filterButtons}
    >
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
                  {new Date(event.date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })} • {event.time}
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

              {/* Registration progress bar */}
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
                  ></div>
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

      {/* No results state */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600">Try adjusting your filters to see more events.</p>
        </div>
      )}
    </PageLayout>
  );
}
