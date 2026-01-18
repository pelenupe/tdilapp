import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { getMembers } from '../services/profileService';
import PageLayout from '../components/PageLayout';

export default function PartnerSchools() {
  const { user, updateUser } = useUser();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectedUsers, setConnectedUsers] = useState({});
  const [connectingTo, setConnectingTo] = useState(null);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setSchools([]);
          return;
        }

        // Fetch all members and filter for partner schools
        const { data: allMembers } = await getMembers();
        const schoolUsers = (allMembers || []).filter(m => m.userType === 'partner_school');
        setSchools(schoolUsers);

        // Fetch connection statuses
        if (schoolUsers.length > 0) {
          const memberIds = schoolUsers.map(m => m.id);
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
        console.error('Error fetching schools:', error);
        setSchools([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  const handleConnect = async (schoolId) => {
    try {
      setConnectingTo(schoolId);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserId: schoolId })
      });

      if (response.ok) {
        const result = await response.json();
        const userUpdate = result.users?.find(u => u.id === parseInt(user.id));
        if (userUpdate) {
          updateUser({ points: userUpdate.points, level: result.userLevel });
        }
        setConnectedUsers(prev => ({
          ...prev,
          [schoolId]: { connectionId: true, status: 'connected' }
        }));
        alert(`Connected with school! You earned ${result.pointsAwarded} points!`);
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

  const handleDisconnect = async (schoolId) => {
    try {
      setConnectingTo(schoolId);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/connections/${schoolId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setConnectedUsers(prev => {
          const updated = { ...prev };
          delete updated[schoolId];
          return updated;
        });
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      setConnectingTo(null);
    }
  };

  const isConnected = (schoolId) => connectedUsers[schoolId]?.status === 'connected';

  if (loading) {
    return (
      <PageLayout
        userType={user?.userType || 'member'}
        title="Partner Schools"
        subtitle="Loading partner schools..."
        showPointsInHeader={true}
        userPoints={user?.points || 0}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading partner schools...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      userType={user?.userType || 'member'}
      title="Partner Schools"
      subtitle={`Connect with ${schools.length} partner educational institutions`}
      showPointsInHeader={true}
      userPoints={user?.points || 0}
    >
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <p className="text-gray-600 mb-6">
            Connect with our partner schools to explore educational opportunities and network with students and faculty.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schools.map((school) => (
              <div key={school.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="text-center mb-4">
                  {school.profileImage ? (
                    <img 
                      src={school.profileImage} 
                      alt={school.company}
                      className="w-20 h-20 rounded-full mx-auto object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto flex items-center justify-center">
                      <span className="text-3xl">🎓</span>
                    </div>
                  )}
                </div>
                
                <h3 className="font-bold text-gray-900 text-lg text-center mb-1">
                  {school.company || `${school.firstName} ${school.lastName}`}
                </h3>
                <p className="text-sm text-purple-600 font-medium text-center mb-3">
                  {school.jobTitle || 'Partner Institution'}
                </p>
                
                {school.bio && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3 text-center">
                    {school.bio}
                  </p>
                )}
                
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="inline-block bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded-full font-medium">
                    🎓 Partner School
                  </span>
                </div>
                
                <div className="text-center">
                  {isConnected(school.id) ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                        ✓ Connected
                      </span>
                      <button
                        onClick={() => handleDisconnect(school.id)}
                        disabled={connectingTo === school.id}
                        className="px-2 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors text-sm"
                      >
                        {connectingTo === school.id ? '...' : '✕'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(school.id)}
                      disabled={connectingTo === school.id}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {connectingTo === school.id ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {schools.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎓</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No partner schools yet</h3>
              <p className="text-gray-500">Check back soon for partner school announcements!</p>
            </div>
          )}
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Become a Partner School</h2>
          <p className="text-gray-600 mb-4">
            Partner with tDIL to connect your students with career opportunities and professional development.
          </p>
          <button className="bg-purple-600 text-white py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors font-medium">
            Learn More
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
