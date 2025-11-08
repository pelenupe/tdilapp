import { useEffect, useState } from 'react';
import { getMembers } from '../services/profileService';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';

export default function Directory() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectedUsers, setConnectedUsers] = useState(new Set());
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

        // Fetch all members
        const { data: allMembers } = await getMembers();
        
        // Fetch current user's connections
        const connectionsResponse = await fetch('/api/connections', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        let connectedUserIds = new Set();
        if (connectionsResponse.ok) {
          const connections = await connectionsResponse.json();
          connectedUserIds = new Set(connections.map(conn => conn.id));
          setConnectedUsers(connectedUserIds);
        }

        // Filter out connected users from members list
        const unconnectedMembers = (allMembers || []).filter(member => 
          !connectedUserIds.has(member.id) && member.id !== user?.id
        );
        
        setMembers(unconnectedMembers);
      } catch (error) {
        console.error('Error fetching members:', error);
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
        console.log('Connection successful:', result);
        
        // Update user points using the context
        const userUpdate = result.users.find(u => u.id === parseInt(user.id));
        if (userUpdate) {
          updateUser({
            points: userUpdate.points,
            level: result.userLevel
          });
        }
        
        // Show success message
        alert(`Connected successfully! You earned ${result.pointsAwarded} points!`);
        
        // Add to connected users and remove from members list
        setConnectedUsers(prev => new Set([...prev, memberId]));
        setMembers(members.filter(m => m.id !== memberId));
      } else {
        const error = await response.json();
        console.error('Connection failed:', error.message);
        alert(error.message || 'Failed to connect. Please try again.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Connection failed. Please check your internet connection and try again.');
    }
  };

  if (loading) {
    return (
      <PageLayout
        userType={user.userType}
        title="Member Directory"
        subtitle="Loading members..."
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-4 mx-auto">
              tDIL
            </div>
            <div className="text-gray-600">Loading members...</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      userType={user?.userType || 'member'}
      title="Member Directory"
      subtitle="Connect with other members of the tDIL community"
      userPoints={user?.points || 0}
      showPointsInHeader={true}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <div key={member.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg mr-4">
                  {member.firstName?.[0]}{member.lastName?.[0]}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{member.firstName} {member.lastName}</h3>
                  <p className="text-sm text-gray-500">{member.jobTitle}</p>
                </div>
              </div>
              
              {member.company && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Company:</span> {member.company}
                </p>
              )}
              
              {member.location && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Location:</span> {member.location}
                </p>
              )}
              
              {member.bio && (
                <p className="text-sm text-gray-700 mb-4 line-clamp-3">{member.bio}</p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-blue-600 font-medium">
                  {member.points || 0} points
                </div>
                <button
                  onClick={() => handleConnect(member.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
          <p className="text-gray-500">Check back soon for new members!</p>
        </div>
      )}
    </PageLayout>
  );
}
