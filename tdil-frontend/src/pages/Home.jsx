import PageLayout from '../components/PageLayout';
import Logo from '../components/Logo';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Home() {
  const navigate = useNavigate();
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

  const handleMemberClick = (memberName) => {
    // Navigate to profile page with member name as parameter
    navigate(`/profile?member=${encodeURIComponent(memberName)}`);
  };

  const [leaderboardData, setLeaderboardData] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [stats, setStats] = useState({ members: 0, partners: 0, events: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch leaderboard data
        const leaderboardResponse = await fetch('/api/leaderboard/top');
        if (leaderboardResponse.ok) {
          const leaderboard = await leaderboardResponse.json();
          setLeaderboardData(leaderboard.slice(0, 5)); // Top 5
        }

        // Fetch upcoming events
        const eventsResponse = await fetch('/api/events/upcoming');
        if (eventsResponse.ok) {
          const events = await eventsResponse.json();
          setUpcomingEvents(events.slice(0, 3)); // Next 3 events
        }

        // Fetch real statistics
        const statsResponse = await fetch('/api/stats/overview');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats({
            members: statsData.totalMembers || 0,
            partners: statsData.totalPartners || 0,
            events: statsData.totalEvents || 0
          });
        }
      } catch (error) {
        console.error('Error fetching home page data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <PageLayout
      userType={user.userType}
      title=""
      subtitle=""
      showPointsInHeader={false}
      showSidebar={false}
    >
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-tdil-dark via-tdil-blue to-tdil-dark text-white rounded-lg sm:rounded-xl p-3 sm:p-6 lg:p-8 mb-4 sm:mb-8 mx-2 sm:mx-0 shadow-lg">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-4 sm:mb-6 flex justify-center">
            <Logo size="lg" showText={true} />
          </div>
          <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-5xl font-extrabold mb-2 sm:mb-4 leading-tight px-2 sm:px-0">
            <span className="text-tdil-yellow">Develop The Whole Leader</span>
          </h1>
          <h2 className="text-sm sm:text-lg md:text-xl lg:text-2xl font-bold mb-2 sm:mb-4 text-white px-2 sm:px-0">
            Talent Development Impact Lab (tDIL)
          </h2>
          <p className="text-xs sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 lg:mb-8 max-w-3xl mx-auto opacity-90 px-3 sm:px-2 leading-relaxed">
            tDIL catalyzes aspiring leaders' advancement by bringing together higher education, community organizations, and employers to deliver a transformational experience that grows the skill sets, mindset, and professional network individuals need to thrive.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 lg:gap-4 justify-center mb-3 sm:mb-4 lg:mb-6 px-3 sm:px-2">
            <button
              onClick={() => navigate('/login')}
              className="px-6 sm:px-6 lg:px-8 py-3 sm:py-3 bg-tdil-dark text-white rounded-lg text-sm sm:text-base lg:text-lg font-semibold hover:bg-gray-800 transition-colors shadow-lg w-full sm:w-auto min-w-[140px]"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-6 sm:px-6 lg:px-8 py-3 sm:py-3 bg-tdil-dark text-white rounded-lg text-sm sm:text-base lg:text-lg font-semibold hover:bg-gray-800 transition-colors shadow-lg w-full sm:w-auto min-w-[140px]"
            >
              Join tDIL Network
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 lg:gap-3 justify-center px-3 sm:px-2">
            <button
              onClick={() => navigate('/directory')}
              className="px-4 sm:px-4 py-2 bg-tdil-dark text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-800 transition-colors text-center w-full sm:w-auto min-w-[100px]"
            >
              Directory
            </button>
            <button
              onClick={() => navigate('/community')}
              className="px-4 sm:px-4 py-2 bg-tdil-dark text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-800 transition-colors text-center w-full sm:w-auto min-w-[100px]"
            >
              Community
            </button>
            <button
              onClick={() => navigate('/events')}
              className="px-4 sm:px-4 py-2 bg-tdil-dark text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-800 transition-colors text-center w-full sm:w-auto min-w-[100px]"
            >
              Events
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 text-center shadow-sm">
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">
            {isLoading ? '...' : stats.members}
          </div>
          <div className="text-gray-600 text-sm sm:text-base">Active Members</div>
        </div>
        <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 text-center shadow-sm">
          <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">
            {isLoading ? '...' : stats.partners}
          </div>
          <div className="text-gray-600 text-sm sm:text-base">Partner Companies</div>
        </div>
        <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 text-center shadow-sm">
          <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-2">
            {isLoading ? '...' : stats.events}
          </div>
          <div className="text-gray-600 text-sm sm:text-base">Events This Year</div>
        </div>
      </div>

      {/* Top Contributors Section */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-0">
            🏆 Top Contributors
          </h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm self-start sm:self-auto"
          >
            View Full Leaderboard →
          </button>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading top contributors...</p>
            </div>
          ) : leaderboardData.length > 0 ? (
            leaderboardData.map((member, index) => (
              <div
                key={member.id || index}
                className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleMemberClick(member.name)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-blue-600 text-white'
                  }`}>
                    {index + 1}
                  </div>
                  <img
                    src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
                    alt={member.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <span className="font-semibold text-gray-900">
                    {member.name}
                  </span>
                </div>
                <div className="text-blue-600 font-bold">
                  {member.points ? member.points.toLocaleString() : 0} pts
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No contributors yet. Be the first!</p>
              <button
                onClick={() => navigate('/register')}
                className="mt-2 text-blue-600 hover:text-blue-700 font-semibold"
              >
                Join the Community →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Featured Members Section */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-0">
            ⭐ Featured Members
          </h2>
          <button
            onClick={() => navigate('/directory')}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm self-start sm:self-auto"
          >
            View All Members →
          </button>
        </div>
        <div className="text-center py-8">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Growing Community
            </h3>
            <p className="text-gray-600 mb-6">
              Join our network of ambitious leaders, innovative thinkers, and industry professionals who are developing their skills and advancing their careers.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Join Our Network
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Events Section */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-0">
            📅 Upcoming Events
          </h2>
          <button
            onClick={() => navigate('/events')}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm self-start sm:self-auto"
          >
            View All Events →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading events...</p>
            </div>
          ) : upcomingEvents.length > 0 ? (
            upcomingEvents.map((event, idx) => (
              <div
                key={event.id || idx}
                className="bg-white rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
                onClick={() => navigate('/events')}
              >
                <h3 className="text-lg font-bold text-gray-900 mb-3">{event.title}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                  {event.attendees && (
                    <div className="flex items-center gap-2">
                      <span>👥</span>
                      <span>{event.attendees} attending</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/events');
                  }}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-semibold text-sm"
                >
                  Learn More →
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Events Coming Soon
              </h3>
              <p className="text-gray-600 mb-6">
                Stay tuned for exciting networking events, workshops, and career development opportunities.
              </p>
              <button
                onClick={() => navigate('/events')}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                View Events Page →
              </button>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
