import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useUser } from '../contexts/UserContext';
import SidebarMember from '../components/SidebarMember';
import SidebarPartnerSchool from '../components/SidebarPartnerSchool';
import { useSidebar } from '../contexts/SidebarContext';
import SidebarSponsor from '../components/SidebarSponsor';
import MobileHeader from '../components/MobileHeader';
import ProfileImage from '../components/ProfileImage';
import { getUserProfileImageUrl } from '../utils/profileImage';
import { getProfileLink } from '../utils/slugify';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { isCollapsed } = useSidebar();

  const [leaderboard, setLeaderboard] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState('all');
  const [activityLoading, setActivityLoading] = useState(false);

  // Calculate derived user data from UserContext
  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
  const displayName = fullName || user?.email || 'User';
  const userLevel = user?.level || Math.floor((user?.points || 0) / 1000) + 1;
  const levelProgress = ((user?.points || 0) % 1000) / 10;
  const profileImageUrl = getUserProfileImageUrl(user);

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
          API.get('/events')
        ]);

        setLeaderboard(leaderboardRes.data);
        setAnnouncements(announcementsRes.data);
        setRecentActivity(activityRes.data);
        // Normalize event data from raw API response
        const rawEvents = Array.isArray(eventsRes.data) ? eventsRes.data : [];
        setUpcomingEvents(rawEvents.slice(0, 6).map(e => ({
          ...e,
          image: e.image_url || null,
          type: e.category === 'virtual' ? 'Virtual' : 'In-person',
          points: e.points ? `+${e.points} pts` : '+50 pts',
          date: e.date ? new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD',
          location: e.location || 'TBD',
          registered: !!e.is_registered,
        })));
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

  const handleEventAction = async (eventId, isRegistered) => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/events'); return; }
    try {
      const method = isRegistered ? 'DELETE' : 'POST';
      const res = await fetch(`/api/events/${eventId}/register`, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setUpcomingEvents(prev => prev.map(e =>
          e.id === eventId
            ? { ...e, registered: !isRegistered, current_attendees: isRegistered ? Math.max(0, (e.current_attendees||0)-1) : (e.current_attendees||0)+1 }
            : e
        ));
      } else {
        const err = await res.json();
        alert(err.message || 'Action failed.');
      }
    } catch (error) {
      console.error('Event action error:', error);
    }
  };

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

      {/* Main Content — shifts with collapsible sidebar */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'md:ml-16' : 'md:ml-64'} pt-16 md:pt-0 overflow-auto`}>
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
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={displayName} className="w-6 h-6 lg:w-8 lg:h-8 rounded-full object-cover" />
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
        <div className="text-white p-3 sm:p-4 lg:p-6 mx-3 sm:mx-4 lg:mx-6 my-3 sm:my-4 lg:my-6 rounded-xl" style={{ background: 'linear-gradient(to right, #016a91, #000)' }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 lg:gap-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">Welcome back, {displayName}!</h1>
              <p className="text-blue-100 mb-3 sm:mb-4 text-sm leading-tight">You're making great progress in building your network. Keep it up!</p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => navigate('/directory')}
                  className="bg-white text-blue-600 px-3 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                  </svg>
                  <span className="whitespace-nowrap">Connect with Members</span>
                </button>
                <button 
                  onClick={() => navigate('/events')}
                  className="bg-blue-500 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-400 transition-colors flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
                >
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
              {leaderboard.slice(0, 10).map((member, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    member.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                    member.rank === 2 ? 'bg-gray-100 text-gray-800' :
                    member.rank === 3 ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {member.rank}
                  </div>
                  <ProfileImage
                    src={member.profileImage || member.avatar}
                    firstName={member.firstName}
                    lastName={member.lastName}
                    size="sm"
                  />
                  <div className="flex-1">
                    {member.isCurrentUser ? (
                      <div className="font-semibold text-gray-900">You</div>
                    ) : (
                      <Link
                        to={getProfileLink(member)}
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {member.firstName} {member.lastName}
                      </Link>
                    )}
                    <div className="text-sm text-gray-600">{(member.points || 0).toLocaleString()} pts</div>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => navigate('/leaderboard')}
              className="w-full mt-4 text-blue-600 font-medium hover:text-blue-700 transition-colors"
            >
              View Full Leaderboard
            </button>
          </div>

          {/* Recent Activity — in the grid alongside leaderboard */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="text-green-500">📊</span>
                Recent Activity
              </h2>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'checkins', label: '📍 Check-Ins' },
                  { key: 'connections', label: '👥 Connections' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={async () => {
                      setActivityFilter(key);
                      setActivityLoading(true);
                      try {
                        const url = key === 'all' ? '/activity' : `/activity/${key}`;
                        const res = await API.get(url);
                        setRecentActivity(res.data);
                      } catch {
                        setRecentActivity([]);
                      } finally {
                        setActivityLoading(false);
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      activityFilter === key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {activityLoading ? (
              <div className="text-center py-8 text-gray-400">Loading activity...</div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No activity yet</div>
            ) : (
              <>
                <div className="space-y-3">
                  {recentActivity.slice(0, 10).map((activity, index) => {
                    const typeIcon = activity.activityType === 'checkin' ? '📍'
                      : activity.activityType === 'connection' ? '👥'
                      : activity.activityType === 'chat' ? '💬'
                      : '⭐';
                    const nameParts = (activity.user || '').split(' ');
                    return (
                      <div key={index} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="relative flex-shrink-0">
                          <ProfileImage src={activity.userAvatar} firstName={nameParts[0]} lastName={nameParts[1] || ''} size="sm" />
                          <span className="absolute -bottom-1 -right-1 text-xs leading-none">{typeIcon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-900 text-sm">
                            {activity.userId ? (
                              <Link to={`/profile/${activity.userSlug}`} className="font-semibold text-blue-600 hover:underline">{activity.user}</Link>
                            ) : <span className="font-semibold">{activity.user}</span>}
                            <span className="mx-1 text-gray-500">{activity.action}</span>
                            <span className="font-semibold text-gray-800">{activity.target}</span>
                          </div>
                          {activity.points ? <div className="text-xs text-green-600 font-medium mt-0.5">+{activity.points} pts</div> : null}
                        </div>
                        <div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                          {new Date(activity.timestamp).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {recentActivity.length > 10 && (
                  <div className="mt-3 text-center">
                    <span className="text-sm text-gray-400">Showing 10 of {recentActivity.length}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Community Announcements — full width below the grid */}
        <div className="px-6 pb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="text-blue-500">📢</span>
                Community Announcements
              </h2>
              <button onClick={() => navigate('/announcements')} className="text-blue-600 font-medium hover:text-blue-700 transition-colors text-sm">
                View All →
              </button>
            </div>
            {announcements.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">📢</div>
                <p className="text-sm">No announcements yet. Check back soon!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {announcements.slice(0, 10).map((ann, i) => (
                  <div key={ann.id || i} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">
                        {ann.category === 'event' ? '📅' : ann.category === 'job' ? '💼' : ann.category === 'important' ? '⚠️' : '📢'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm">{ann.title}</h3>
                          {ann.priority === 'high' && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Important</span>}
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2">{ann.content}</p>
                        <p className="text-xs text-gray-400 mt-1">By {ann.author || 'tDIL Team'} · {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : 'Recently'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {announcements.length > 10 && (
              <div className="mt-4 pt-4 border-t text-center">
                <button onClick={() => navigate('/announcements')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View all {announcements.length} announcements →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LinkedIn Section */}
        <div className="px-6 pb-4">
          <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-blue-700">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-sm">LinkedIn Network</h3>
                <p className="text-blue-200 text-xs">Stay connected professionally</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {user?.linkedin_url && (
                <a href={user.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors">
                  My LinkedIn Profile
                </a>
              )}
              <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent('https://tdilapp.com')}&title=${encodeURIComponent('Join the tDIL Community')}&summary=${encodeURIComponent('Building professional networks and career opportunities.')}`}
                target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 bg-blue-600 text-white border border-blue-500 rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors">
                Share tDIL on LinkedIn
              </a>
              <a href="https://www.linkedin.com/company/tdil" target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 bg-blue-600 text-white border border-blue-500 rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors">
                Follow us on LinkedIn
              </a>
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="px-6 pb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Upcoming Events</h2>
              <button 
                onClick={() => navigate('/events')}
                className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
              >
                View All Events
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upcomingEvents.map((event, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <img
                    src={event.image || '/tdil-logo.png'}
                    alt={event.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => { e.target.src = '/tdil-logo.png'; }}
                  />
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
                    {event.registered ? (
                      <button
                        onClick={() => handleEventAction(event.id, true)}
                        className="w-full bg-red-50 text-red-600 border border-red-200 py-2 px-4 rounded-lg font-medium hover:bg-red-100 transition-colors"
                      >
                        ✓ Registered — Cancel?
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEventAction(event.id, false)}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        {event.type === 'Virtual' ? 'Register' : 'RSVP Now'}
                      </button>
                    )}
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
