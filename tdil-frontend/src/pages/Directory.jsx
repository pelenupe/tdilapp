import { useEffect, useState } from 'react';
import { getMembers } from '../services/profileService';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';

export default function Directory() {
  const [members, setMembers] = useState([]);
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

        // Fetch all members
        const { data: allMembers } = await getMembers();
        
        // Filter out current user
        const otherMembers = (allMembers || []).filter(member => member.id !== user?.id);
        setMembers(otherMembers);

        // Fetch connection statuses for all members using batch API
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
        console.log('Connection successful:', result);
        
        // Update user points using the context
        const userUpdate = result.users.find(u => u.id === parseInt(user.id));
        if (userUpdate) {
          updateUser({
            points: userUpdate.points,
            level: result.userLevel
          });
        }
        
        // Update the connected status for this user
        setConnectedUsers(prev => ({
          ...prev,
          [memberId]: { connectionId: true, status: 'connected' }
        }));
        
        // Show success notification
        alert(`Connected successfully! You earned ${result.pointsAwarded} points!`);
      } else {
        const error = await response.json();
        console.error('Connection failed:', error.message);
        alert(error.message || 'Failed to connect. Please try again.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Connection failed. Please check your internet connection and try again.');
    } finally {
      setConnectingTo(null);
    }
  };

  const handleDisconnect = async (memberId) => {
    try {
      setConnectingTo(memberId);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch(`/api/connections/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove from connected status
        setConnectedUsers(prev => {
          const updated = { ...prev };
          delete updated[memberId];
          return updated;
        });
        
        alert('Disconnected successfully.');
      } else {
        const error = await response.json();
        console.error('Disconnect failed:', error.message);
        alert(error.message || 'Failed to disconnect.');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      alert('Disconnect failed. Please try again.');
    } finally {
      setConnectingTo(null);
    }
  };

  const isConnected = (memberId) => {
    return connectedUsers[memberId]?.status === 'connected';
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
                
                {isConnected(member.id) ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-1">
                      <span>✓</span> Connected
                    </span>
                    <button
                      onClick={() => handleDisconnect(member.id)}
                      disabled={connectingTo === member.id}
                      className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors text-sm font-medium"
                      title="Disconnect"
                    >
                      {connectingTo === member.id ? '...' : '✕'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(member.id)}
                    disabled={connectingTo === member.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {connectingTo === member.id ? 'Connecting...' : 'Connect'}
                  </button>
                )}
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
