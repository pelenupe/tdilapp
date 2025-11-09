import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useUser } from '../contexts/UserContext';
import SidebarMember from '../components/SidebarMember';
import SidebarPartnerSchool from '../components/SidebarPartnerSchool';
import SidebarSponsor from '../components/SidebarSponsor';
import MobileHeader from '../components/MobileHeader';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();

  const [leaderboard, setLeaderboard] = useState([]);

  const [announcements, setAnnouncements] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleMemberClick = (memberName) => {
    // Navigate to profile page with member name as parameter
    navigate(`/profile?member=${encodeURIComponent(memberName)}`);
  };

  // Calculate derived user data from UserContext
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
  const displayName = fullName || user?.email || 'User';
  const userLevel = user?.level || Math.floor((user?.points || 0) / 1000) + 1;
  const levelProgress = ((user?.points || 0) % 1000) / 10;

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [leaderboardRes, announcementsRes, activityRes, eventsRes] = await Promise.all([
          API.get('/leaderboard/top'),
          API.get('/announcements/featured'),
          API.get('/activity'),
          API.get('/events/upcoming')
        ]);

        setLeaderboard(leaderboardRes.data);
        setAnnouncements(announcementsRes.data);
        setRecentActivity(activityRes.data);
        setUpcomingEvents(eventsRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Show empty state instead of fake data
        setLeaderboard([]);
        setAnnouncements([]);
        setRecentActivity([]);
        setUpcomingEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Render appropriate sidebar based on user type
  const renderSidebar = () => {
    switch (user?.userType) {
      case 'partner_school':
        return <SidebarPartnerSchool />;
      case 'sponsor':
        return <SidebarSponsor />;
      default:
        return <SidebarMember />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <MobileHeader userType={user?.userType} />
      
      {/* Left Sidebar */}
      {renderSidebar()}

      {/* Main Content */}
      <div className="transition-all duration-300 lg:ml-64 pt-16 lg:pt-0 overflow-auto">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <input
                type="text"
                placeholder="Search members, events, jobs..."
                className="w-full max-w-xs lg:max-w-lg px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                <span className="font-bold text-gray-900 text-sm lg:text-base">{(user?.points || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 lg:gap-2">
                <div className="relative">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-2 h-2 lg:w-3 lg:h-3 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold hidden lg:block">3</span>
                  </div>
                </div>
                <div className="relative">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-2 h-2 lg:w-3 lg:h-3 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold hidden lg:block">1</span>
                  </div>
                </div>
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={displayName} className="w-6 h-6 lg:w-8 lg:h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xs lg:text-sm">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                )}
                <span className="font-medium text-gray-900 text-sm lg:text-base hidden sm:block">
                  {user?.firstName && user?.lastName ? 
                    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() : 
                    displayName.charAt(0).toUpperCase()
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 sm:p-4 lg:p-6 mx-3 sm:mx-4 lg:mx-6 my-3 sm:my-4 lg:my-6 rounded-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 lg:gap-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">Welcome back, {displayName}!</h1>
              <p className="text-blue-100 mb-3 sm:mb-4 text-sm leading-tight">You're making great progress in building your network. Keep it up!</p>
              <div className="flex flex-col gap-2">
                <button className="bg-white text-blue-600 px-3 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-sm w-full sm:w-auto">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                  </svg>
                  <span className="whitespace-nowrap">Connect with Members</span>
                </button>
                <button className="bg-blue-500 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-400 transition-colors flex items-center justify-center gap-2 text-sm w-full sm:w-auto">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                  </svg>
                  <span className="whitespace-nowrap">Browse Events</span>
                </button>
              </div>
            </div>
            <div className="text-center lg:text-right flex-shrink-0 mt-3 lg:mt-0">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto lg:mx-0 mb-2">
                <svg className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none"/>
                  <circle cx="50" cy="50" r="40" stroke="white" strokeWidth="8" fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - levelProgress / 100)}`}
                    strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold">{Math.round(levelProgress)}%</span>
                </div>
              </div>
              <div className="text-xs lg:text-sm">
                <div className="font-semibold">Level {userLevel}</div>
                <div className="text-blue-200">to Level {userLevel + 1}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Community Leaderboard */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="text-yellow-500">🏆</span>
                Community Leaderboard
              </h2>
            </div>
            <div className="space-y-4">
              {leaderboard.map((member, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    member.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                    member.rank === 2 ? 'bg-gray-100 text-gray-800' :
                    member.rank === 3 ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {member.rank}
                  </div>
                  <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <div 
                      className={`font-semibold ${member.isCurrentUser ? 'text-gray-900' : 'text-blue-600 hover:text-blue-700 cursor-pointer'}`}
                      onClick={() => !member.isCurrentUser && handleMemberClick(`${member.firstName} ${member.lastName}`)}
                    >
                      {member.isCurrentUser ? 'You' : `${member.firstName} ${member.lastName}`}
                    </div>
                    <div className="text-sm text-gray-600">{member.points.toLocaleString()} pts</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 text-blue-600 font-medium hover:text-blue-700 transition-colors">
              View Full Leaderboard
            </button>
          </div>

          {/* Community Announcements */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="text-blue-500">📢</span>
                Community Announcements
              </h2>
              <button className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
                View All
              </button>
            </div>
            <div className="space-y-6">
              {announcements.map((announcement, index) => (
                <div key={index} className="border-b border-gray-100 last:border-b-0 pb-6 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                    <span className="text-sm text-gray-500">{announcement.time}</span>
                  </div>
                  <p className="text-gray-600 mb-3">{announcement.content}</p>
                  <button className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
                    {announcement.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="px-6 pb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="text-green-500">📊</span>
                Recent Activity
              </h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium">All</button>
                <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Connections</button>
                <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Events</button>
                <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Jobs</button>
              </div>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                  <img src={activity.userAvatar} alt={activity.user} className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <div className="text-gray-900">
                      <span className="font-semibold">{activity.user}</span>
                      <span className="mx-1">{activity.action}</span>
                      <span className="font-semibold text-blue-600">{activity.target}</span>
                      {activity.location && <span className="text-gray-600"> {activity.location}</span>}
                    </div>
                    {activity.points && (
                      <div className="text-sm text-green-600 font-medium mt-1">+{activity.points} points</div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(activity.timestamp).toLocaleString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      day: 'numeric',
                      month: 'short'
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 text-blue-600 font-medium hover:text-blue-700 transition-colors">
              Load More Activity
            </button>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="px-6 pb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Upcoming Events</h2>
              <button className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
                View All Events
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upcomingEvents.map((event, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <img src={event.image} alt={event.title} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.type === 'In-person' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {event.type}
                      </span>
                      <span className="text-xs font-medium text-yellow-600">{event.points}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{event.title}</h3>
                    <p className="text-sm text-gray-600 mb-1">{event.date}</p>
                    <p className="text-sm text-gray-600 mb-4">{event.location}</p>
                    <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                      {event.type === 'In-person' ? 'RSVP Now' : 'Register'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
