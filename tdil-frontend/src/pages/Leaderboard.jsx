import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import API from '../services/api';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all-time');
  const { user } = useUser();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await API.get(`/leaderboard/full?timeframe=${timeframe}`);
        setLeaderboard(response.data || []);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        // Show empty state with current users as fallback
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timeframe]);

  if (loading) {
    return (
      <PageLayout
        userType={user?.userType}
        title="Community Leaderboard"
        subtitle="Loading leaderboard..."
        showPointsInHeader={true}
        userPoints={user?.points || 0}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-4 mx-auto">
              tDIL
            </div>
            <div className="text-gray-600">Loading leaderboard...</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      userType={user?.userType || 'member'}
      title="Community Leaderboard"
      subtitle="See how you rank among all tDIL community members"
      showPointsInHeader={true}
      userPoints={user?.points || 0}
    >
      {/* Timeframe Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setTimeframe('all-time')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            timeframe === 'all-time' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          All Time
        </button>
        <button
          onClick={() => setTimeframe('monthly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            timeframe === 'monthly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => setTimeframe('weekly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            timeframe === 'weekly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          This Week
        </button>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="text-yellow-500">🏆</span>
            Community Leaderboard
          </h2>
          <p className="text-gray-600 text-sm mt-1">Top performers in the tDIL community</p>
        </div>

        <div className="divide-y divide-gray-100">
          {leaderboard.length > 0 ? (
            leaderboard.map((member, index) => (
              <div key={member.id || index} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                    index === 1 ? 'bg-gray-100 text-gray-800' :
                    index === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {index + 1}
                  </div>
                  
                  {member.profileImage ? (
                    <img 
                      src={member.profileImage} 
                      alt={`${member.firstName} ${member.lastName}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-lg">
                        {member.firstName?.[0]}{member.lastName?.[0]}
                      </span>
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900 text-lg">
                          {member.id === user?.id ? 'You' : `${member.firstName} ${member.lastName}`}
                        </div>
                        <div className="text-gray-600 text-sm">
                          {member.jobTitle && member.company ? 
                            `${member.jobTitle} at ${member.company}` : 
                            member.jobTitle || member.company || 'tDIL Member'
                          }
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-yellow-600 font-bold text-lg">
                          <span>⭐</span>
                          <span>{(member.points || 0).toLocaleString()}</span>
                        </div>
                        <div className="text-gray-500 text-sm">
                          Level {member.level || Math.floor((member.points || 0) / 1000) + 1}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leaderboard data yet</h3>
              <p className="text-gray-500">Start connecting and participating to see rankings!</p>
            </div>
          )}
        </div>
      </div>

      {/* Your Rank */}
      {user && leaderboard.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 mb-2">Your Ranking</h3>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {leaderboard.findIndex(m => m.id === user.id) + 1 || '?'}
            </div>
            <div>
              <div className="font-semibold text-blue-900">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-blue-700 text-sm">
                {user.points?.toLocaleString() || 0} points • Level {user.level || 1}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
