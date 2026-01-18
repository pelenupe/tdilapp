import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { getMembers } from '../services/profileService';
import PageLayout from '../components/PageLayout';

export default function Sponsors() {
  const { user, updateUser } = useUser();
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectedUsers, setConnectedUsers] = useState({});
  const [connectingTo, setConnectingTo] = useState(null);

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setSponsors([]);
          return;
        }

        // Fetch all members and filter for sponsors
        const { data: allMembers } = await getMembers();
        const sponsorUsers = (allMembers || []).filter(m => m.userType === 'sponsor');
        setSponsors(sponsorUsers);

        // Fetch connection statuses
        if (sponsorUsers.length > 0) {
          const memberIds = sponsorUsers.map(m => m.id);
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
        console.error('Error fetching sponsors:', error);
        setSponsors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSponsors();
  }, []);

  const handleConnect = async (sponsorId) => {
    try {
      setConnectingTo(sponsorId);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserId: sponsorId })
      });

      if (response.ok) {
        const result = await response.json();
        const userUpdate = result.users?.find(u => u.id === parseInt(user.id));
        if (userUpdate) {
          updateUser({ points: userUpdate.points, level: result.userLevel });
        }
        setConnectedUsers(prev => ({
          ...prev,
          [sponsorId]: { connectionId: true, status: 'connected' }
        }));
        alert(`Connected with sponsor! You earned ${result.pointsAwarded} points!`);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to connect.');
      }
    } catch (error) {
      console.error('Connection error:', error);
    } finally {
      setConnectingTo(null);
    }
  };

  const handleDisconnect = async (sponsorId) => {
    try {
      setConnectingTo(sponsorId);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/connections/${sponsorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setConnectedUsers(prev => {
          const updated = { ...prev };
          delete updated[sponsorId];
          return updated;
        });
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      setConnectingTo(null);
    }
  };

  const isConnected = (sponsorId) => connectedUsers[sponsorId]?.status === 'connected';

  if (loading) {
    return (
      <PageLayout
        userType={user?.userType || 'member'}
        title="Our Sponsors"
        subtitle="Loading sponsors..."
        showPointsInHeader={true}
        userPoints={user?.points || 0}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading sponsors...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      userType={user?.userType || 'member'}
      title="Our Sponsors"
      subtitle="We're grateful for the support of our sponsors who help make tDIL possible"
      showPointsInHeader={true}
      userPoints={user?.points || 0}
    >
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <p className="text-gray-600 mb-6">
            Connect with our sponsors to learn about career opportunities and industry insights.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sponsors.map((sponsor) => (
              <div key={sponsor.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="text-center mb-4">
                  {sponsor.profileImage ? (
                    <img 
                      src={sponsor.profileImage} 
                      alt={sponsor.company}
                      className="w-20 h-20 rounded-full mx-auto object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-yellow-100 rounded-full mx-auto flex items-center justify-center">
                      <span className="text-3xl">🏢</span>
                    </div>
                  )}
                </div>
                
                <h3 className="font-bold text-gray-900 text-lg text-center mb-1">
                  {sponsor.company || `${sponsor.firstName} ${sponsor.lastName}`}
                </h3>
                <p className="text-sm text-yellow-600 font-medium text-center mb-3">
                  {sponsor.jobTitle || 'Corporate Sponsor'}
                </p>
                
                {sponsor.bio && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3 text-center">
                    {sponsor.bio}
                  </p>
                )}
                
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-medium">
                    🏢 Sponsor
                  </span>
                </div>
                
                <div className="text-center">
                  {isConnected(sponsor.id) ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                        ✓ Connected
                      </span>
                      <button
                        onClick={() => handleDisconnect(sponsor.id)}
                        disabled={connectingTo === sponsor.id}
                        className="px-2 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors text-sm"
                      >
                        {connectingTo === sponsor.id ? '...' : '✕'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(sponsor.id)}
                      disabled={connectingTo === sponsor.id}
                      className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium disabled:opacity-50"
                    >
                      {connectingTo === sponsor.id ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {sponsors.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏢</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sponsors yet</h3>
              <p className="text-gray-500">Check back soon for sponsor announcements!</p>
            </div>
          )}
        </div>
        
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-6 border border-yellow-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Become a Sponsor</h2>
          <p className="text-gray-600 mb-4">
            Join our community of sponsors and help support the next generation of tech professionals.
          </p>
          <button className="bg-yellow-500 text-white py-2 px-6 rounded-lg hover:bg-yellow-600 transition-colors font-medium">
            Learn More
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
