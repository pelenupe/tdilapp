import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

export default function Community() {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(2450);
  const [connectionAlerts, setConnectionAlerts] = useState({});
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
    // Fetch real community members from API
    const fetchMembers = async () => {
      try {
        setLoading(true);
        
        // Get JWT token from localStorage for authenticated request
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          setMembers([]);
          setLoading(false);
          return;
        }

        const response = await fetch('/api/members', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Transform data to match frontend format
          const transformedMembers = data.map(member => ({
            id: member.id,
            firstName: member.firstname || member.firstName || 'User',
            lastName: member.lastname || member.lastName || `${member.id}`.slice(0, 8),
            title: member.jobtitle || member.jobTitle || member.job_title || 'Member',
            company: member.company || 'tDIL Community',
            location: 'Indianapolis, IN', // Add location field to database later
            points: member.points || 0,
            level: member.level || Math.floor((member.points || 0) / 500) + 1,
            avatar: member.profilepicurl || member.profilePicUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((member.firstname || member.firstName || 'User') + '+' + (member.lastname || member.lastName || 'U'))}&background=3B82F6&color=fff`,
            skills: member.skills ? (Array.isArray(member.skills) ? member.skills : member.skills.split(',').map(s => s.trim())) : [],
            connections: Math.floor(Math.random() * 200) + 50, // Temporary until connections system
            isOnline: Math.random() > 0.5, // Temporary until online status system
            joinedDate: member.created_at || member.createdAt || new Date().toISOString()
          }));
          console.log('Fetched members:', transformedMembers); // Debug log
          setMembers(transformedMembers);
        } else if (response.status === 401) {
          console.error('Authentication failed - redirecting to login');
          // Could redirect to login here
          setMembers([]);
        } else {
          console.error('Failed to fetch members:', response.status, response.statusText);
          setMembers([]);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const filteredMembers = members.filter(member => {
    const matchesSearch = searchTerm === '' || 
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filter === 'all') return matchesSearch;
    if (filter === 'online') return matchesSearch && member.isOnline;
    if (filter === 'high-level') return matchesSearch && member.level >= 6;
    return matchesSearch;
  });

  const handleConnect = async (memberId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserId: memberId })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update member's connection count
        setMembers(members.map(m => 
          m.id === memberId 
            ? { ...m, connections: m.connections + 1 }
            : m
        ));
        
        // Update user's points display
        setUserPoints(prev => prev + result.pointsAwarded);
        
        // Show connection alert with real points
        setConnectionAlerts(prev => ({
          ...prev,
          [memberId]: `+${result.pointsAwarded} points!`
        }));
        
        // Hide alert after 3 seconds
        setTimeout(() => {
          setConnectionAlerts(prev => ({
            ...prev,
            [memberId]: false
          }));
        }, 3000);
        
        console.log('Connection successful:', result);
      } else {
        const error = await response.json();
        console.error('Connection failed:', error.message);
        
        // Show error alert
        setConnectionAlerts(prev => ({
          ...prev,
          [memberId]: error.message
        }));
        
        setTimeout(() => {
          setConnectionAlerts(prev => ({
            ...prev,
            [memberId]: false
          }));
        }, 3000);
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  if (loading) {
    return (
      <PageLayout
        userType={user.userType}
        title="Community"
        subtitle="Loading community..."
        showPointsInHeader={false}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-4 mx-auto">
              tDIL
            </div>
            <div className="text-gray-600">Loading community...</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const searchBar = (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <div className="relative">
          <input
            type="text"
            placeholder="Search members by name, title, company, or skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({members.length})
        </button>
        <button
          onClick={() => setFilter('online')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'online' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Online ({members.filter(m => m.isOnline).length})
        </button>
        <button
          onClick={() => setFilter('high-level')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'high-level' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          High Level ({members.filter(m => m.level >= 6).length})
        </button>
      </div>
    </div>
  );

  return (
    <PageLayout
      userType={user.userType}
      title="Community"
      subtitle={`Connect with ${members.length} tDIL members`}
      userPoints={userPoints}
      headerContent={searchBar}
    >
      {/* Points notification */}
      {Object.entries(connectionAlerts).some(([_, show]) => show) && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-bounce">
            <span className="text-xl">⭐</span>
            <span className="font-bold">+50 points!</span>
          </div>
        </div>
      )}

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <div key={member.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow relative">
            {/* Member Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <img 
                    src={member.avatar} 
                    alt={`${member.firstName} ${member.lastName}`}
                    className="w-16 h-16 rounded-full"
                  />
                  {member.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg truncate">
                    {member.firstName} {member.lastName}
                  </h3>
                  <p className="text-blue-600 font-medium text-sm truncate">{member.title}</p>
                  <p className="text-gray-600 text-sm truncate">{member.company}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-gray-500 text-xs">📍 {member.location}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Member Stats */}
            <div className="px-6 pb-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">⭐</span>
                  <span className="font-semibold text-gray-900">{member.points.toLocaleString()}</span>
                  <span className="text-gray-500">pts</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">Level {member.level}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{member.connections}</div>
                    <div className="text-xs text-gray-500">connections</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="px-6 pb-4">
              <div className="flex flex-wrap gap-1">
                {member.skills.slice(0, 3).map((skill, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {skill}
                  </span>
                ))}
                {member.skills.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    +{member.skills.length - 3}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => handleConnect(member.id)}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span>➕</span>
                  Connect
                </button>
                <Link
                  to={`/profile/${member.id}`}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center"
                >
                  View Profile
                </Link>
              </div>
            </div>

            {/* Connection Alert */}
            {connectionAlerts[member.id] && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium animate-pulse">
                Connected! +50 pts
              </div>
            )}
          </div>
        ))}
      </div>

      {/* No results state */}
      {filteredMembers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </PageLayout>
  );
}
