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
    // Mock community members data
    const mockMembers = [
      {
        id: 1,
        firstName: 'Michael',
        lastName: 'Johnson',
        title: 'Senior Software Engineer',
        company: 'Salesforce',
        location: 'Indianapolis, IN',
        points: 4582,
        level: 8,
        avatar: 'https://i.pravatar.cc/100?img=1',
        skills: ['React', 'Node.js', 'Python', 'AWS'],
        connections: 156,
        isOnline: true,
        joinedDate: '2023-01-15'
      },
      {
        id: 2,
        firstName: 'Sarah',
        lastName: 'Williams',
        title: 'Product Manager',
        company: 'Eli Lilly',
        location: 'Indianapolis, IN',
        points: 3845,
        level: 7,
        avatar: 'https://i.pravatar.cc/100?img=2',
        skills: ['Product Strategy', 'Agile', 'Data Analysis', 'Leadership'],
        connections: 203,
        isOnline: false,
        joinedDate: '2023-02-20'
      },
      {
        id: 3,
        firstName: 'David',
        lastName: 'Chen',
        title: 'Data Scientist',
        company: 'Anthem',
        location: 'Indianapolis, IN',
        points: 3210,
        level: 6,
        avatar: 'https://i.pravatar.cc/100?img=3',
        skills: ['Machine Learning', 'Python', 'SQL', 'Tableau'],
        connections: 89,
        isOnline: true,
        joinedDate: '2023-03-10'
      },
      {
        id: 4,
        firstName: 'Emma',
        lastName: 'Rodriguez',
        title: 'UX Designer',
        company: 'Interactive Intelligence',
        location: 'Indianapolis, IN',
        points: 2987,
        level: 5,
        avatar: 'https://i.pravatar.cc/100?img=4',
        skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
        connections: 134,
        isOnline: false,
        joinedDate: '2023-04-05'
      },
      {
        id: 5,
        firstName: 'James',
        lastName: 'Wilson',
        title: 'Marketing Director',
        company: 'Angie\'s List',
        location: 'Indianapolis, IN',
        points: 2756,
        level: 5,
        avatar: 'https://i.pravatar.cc/100?img=6',
        skills: ['Digital Marketing', 'SEO', 'Content Strategy', 'Analytics'],
        connections: 178,
        isOnline: true,
        joinedDate: '2023-05-12'
      },
      {
        id: 6,
        firstName: 'Lisa',
        lastName: 'Thompson',
        title: 'Financial Analyst',
        company: 'OneAmerica',
        location: 'Indianapolis, IN',
        points: 2543,
        level: 4,
        avatar: 'https://i.pravatar.cc/100?img=7',
        skills: ['Financial Modeling', 'Excel', 'PowerBI', 'Risk Analysis'],
        connections: 67,
        isOnline: false,
        joinedDate: '2023-06-18'
      },
      {
        id: 7,
        firstName: 'Robert',
        lastName: 'Taylor',
        title: 'DevOps Engineer',
        company: 'Genesys',
        location: 'Indianapolis, IN',
        points: 2234,
        level: 4,
        avatar: 'https://i.pravatar.cc/100?img=8',
        skills: ['Docker', 'Kubernetes', 'AWS', 'Jenkins'],
        connections: 92,
        isOnline: true,
        joinedDate: '2023-07-22'
      },
      {
        id: 8,
        firstName: 'Maria',
        lastName: 'Garcia',
        title: 'HR Business Partner',
        company: 'Cummins',
        location: 'Indianapolis, IN',
        points: 1987,
        level: 3,
        avatar: 'https://i.pravatar.cc/100?img=9',
        skills: ['Talent Acquisition', 'Employee Relations', 'HRIS', 'Training'],
        connections: 145,
        isOnline: false,
        joinedDate: '2023-08-30'
      }
    ];

    setMembers(mockMembers);
    setLoading(false);
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

  const handleConnect = (memberId) => {
    const member = members.find(m => m.id === memberId);
    
    // Update member's connection count
    setMembers(members.map(m => 
      m.id === memberId 
        ? { ...m, connections: m.connections + 1 }
        : m
    ));
    
    // Show connection alert
    setConnectionAlerts(prev => ({
      ...prev,
      [memberId]: true
    }));
    
    // Hide alert after 3 seconds
    setTimeout(() => {
      setConnectionAlerts(prev => ({
        ...prev,
        [memberId]: false
      }));
    }, 3000);
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
