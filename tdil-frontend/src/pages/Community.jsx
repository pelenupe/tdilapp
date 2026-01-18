import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { getMembers } from '../services/profileService';
import PageLayout from '../components/PageLayout';

export default function Community() {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [connectedUsers, setConnectedUsers] = useState({});
  const [connectingTo, setConnectingTo] = useState(null);
  const { user, updateUser } = useUser();

  useEffect(() => {
    const fetchMembersAndConnections = async () => {
      try {
        setLoading(true);
        
        const token = localStorage.getItem('token');
        if (!token) {
          setMembers([]);
          return;
        }

        // Fetch all members (including schools and sponsors)
        const { data: allMembers } = await getMembers();
        
        // Filter out current user
        const otherMembers = (allMembers || []).filter(member => member.id !== user?.id);
        setMembers(otherMembers);

        // Fetch connection statuses for all members
        if (otherMembers.length > 0) {
          const memberIds = otherMembers.map(m => m.id);
          const statusResponse = await fetch('/api/connections/statuses', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userIds: memberIds })
          });

          if (statusResponse.ok) {
            const statusMap = await statusResponse.json();
            setConnectedUsers(statusMap);
          }
        }
      } catch (error) {
        console.error('Error fetching community:', error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchMembersAndConnections();
    }
  }, [user]);

  const handleConnect = async (memberId) => {
    try {
      setConnectingTo(memberId);
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
        
        // Update user points
        const userUpdate = result.users?.find(u => u.id === parseInt(user.id));
        if (userUpdate) {
          updateUser({
            points: userUpdate.points,
            level: result.userLevel
          });
        }
        
        // Update connected status
        setConnectedUsers(prev => ({
          ...prev,
          [memberId]: { connectionId: true, status: 'connected' }
        }));
        
        alert(`Connected successfully! You earned ${result.pointsAwarded} points!`);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to connect.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Connection failed. Please try again.');
    } finally {
      setConnectingTo(null);
    }
  };

  const handleDisconnect = async (memberId) => {
    try {
      setConnectingTo(memberId);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/connections/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setConnectedUsers(prev => {
          const updated = { ...prev };
          delete updated[memberId];
          return updated;
        });
        alert('Disconnected successfully.');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to disconnect.');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      setConnectingTo(null);
    }
  };

  const isConnected = (memberId) => {
    return connectedUsers[memberId]?.status === 'connected';
  };

  const getUserTypeIcon = (userType) => {
    switch (userType) {
      case 'partner_school': return '🎓';
      case 'sponsor': return '🏢';
      case 'admin': return '⭐';
      default: return '👤';
    }
  };

  const getUserTypeLabel = (userType) => {
    switch (userType) {
      case 'partner_school': return 'Partner School';
      case 'sponsor': return 'Sponsor';
      case 'admin': return 'Admin';
      default: return 'Member';
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = searchTerm === '' || 
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.company || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === 'all') return matchesSearch;
    if (filter === 'members') return matchesSearch && member.userType === 'member';
    if (filter === 'schools') return matchesSearch && member.userType === 'partner_school';
    if (filter === 'sponsors') return matchesSearch && member.userType === 'sponsor';
    if (filter === 'connected') return matchesSearch && isConnected(member.id);
    return matchesSearch;
  });

  if (loading) {
    return (
      <PageLayout
        userType={user?.userType}
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

  const memberCount = members.filter(m => m.userType === 'member').length;
  const schoolCount = members.filter(m => m.userType === 'partner_school').length;
  const sponsorCount = members.filter(m => m.userType === 'sponsor').length;
  const connectedCount = members.filter(m => isConnected(m.id)).length;

  const headerContent = (
    <div className="flex flex-col gap-4">
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search community by name, title, or company..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          All ({members.length})
        </button>
        <button
          onClick={() => setFilter('members')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
            filter === 'members' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          👤 Members ({memberCount})
        </button>
        <button
          onClick={() => setFilter('schools')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
            filter === 'schools' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          🎓 Schools ({schoolCount})
        </button>
        <button
          onClick={() => setFilter('sponsors')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
            filter === 'sponsors' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          🏢 Sponsors ({sponsorCount})
        </button>
        <button
          onClick={() => setFilter('connected')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
            filter === 'connected' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          ✓ Connected ({connectedCount})
        </button>
      </div>
    </div>
  );

  return (
    <PageLayout
      userType={user?.userType || 'member'}
      title="Community"
      subtitle="Connect with members, partner schools, and sponsors"
      userPoints={user?.points || 0}
      showPointsInHeader={true}
      headerContent={headerContent}
    >
      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <div key={member.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="relative">
                  {member.profileImage ? (
                    <img 
                      src={member.profileImage} 
                      alt={`${member.firstName} ${member.lastName}`}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${
                      member.userType === 'partner_school' ? 'bg-purple-100 text-purple-600' :
                      member.userType === 'sponsor' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {member.firstName?.[0]}{member.lastName?.[0]}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 text-lg">
                    {getUserTypeIcon(member.userType)}
                  </span>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="font-bold text-gray-900">{member.firstName} {member.lastName}</h3>
                  <p className="text-sm text-gray-500">{member.jobTitle || getUserTypeLabel(member.userType)}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                    member.userType === 'partner_school' ? 'bg-purple-100 text-purple-700' :
                    member.userType === 'sponsor' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {getUserTypeLabel(member.userType)}
                  </span>
                </div>
              </div>
              
              {member.company && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">🏢</span> {member.company}
                </p>
              )}
              
              {member.bio && (
                <p className="text-sm text-gray-700 mb-4 line-clamp-2">{member.bio}</p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-blue-600 font-medium">
                  ⭐ {member.points || 0} points • Level {member.level || 1}
                </div>
                
                {isConnected(member.id) ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-1">
                      <span>✓</span> Connected
                    </span>
                    <button
                      onClick={() => handleDisconnect(member.id)}
                      disabled={connectingTo === member.id}
                      className="px-2 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors text-sm"
                      title="Disconnect"
                    >
                      {connectingTo === member.id ? '...' : '✕'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(member.id)}
                    disabled={connectingTo === member.id}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {connectingTo === member.id ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMembers.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🌐</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No community members found</h3>
          <p className="text-gray-500">Try adjusting your search or filters.</p>
        </div>
      )}
    </PageLayout>
  );
}
