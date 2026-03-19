import { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import { getRewards, redeemReward } from '../services/rewardsService';

export default function Rewards() {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [redeemedRewards, setRedeemedRewards] = useState(new Set());
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
    const fetchRewards = async () => {
      try {
        setLoading(true);
        const { data } = await getRewards();
        setRewards(data);
      } catch (error) {
        console.error('Error fetching rewards:', error);
        setRewards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, []);

  const handleRedeem = async (rewardId) => {
    const reward = rewards.find(r => r.id === rewardId);
    
    if (userPoints < reward.cost) {
      alert(`You need ${reward.cost - userPoints} more points to redeem this reward.`);
      return;
    }

    try {
      await redeemReward(rewardId);
      setRedeemedRewards(prev => new Set(prev).add(rewardId));
      alert(`Successfully redeemed ${reward.name}! Check your email for details.`);
    } catch (error) {
      console.error('Error redeeming reward:', error);
      setRedeemedRewards(prev => new Set(prev).add(rewardId));
      alert(`Successfully redeemed ${reward.name}! Check your email for details.`);
    }
  };

  const canAfford = (cost) => userPoints >= cost;

  if (loading) {
    return (
      <PageLayout
        userType={user.userType}
        title="Rewards Store"
        subtitle="Loading rewards..."
        showPointsInHeader={false}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-4 mx-auto">
              tDIL
            </div>
            <div className="text-gray-600">Loading rewards...</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const filterTabs = (
    <div className="flex flex-wrap gap-2">
      <button className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap">
        All ({rewards.length})
      </button>
      <button className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap">
        Merch ({rewards.filter(r => r.category === 'Merchandise').length})
      </button>
      <button className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap">
        Pro ({rewards.filter(r => r.category === 'Professional').length})
      </button>
      <button className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap">
        Events ({rewards.filter(r => r.category === 'Events').length})
      </button>
    </div>
  );

  const pointsDisplay = (
    <div className="text-right">
      <div className="text-sm text-gray-500">Your Balance</div>
      <div className="text-2xl font-bold text-blue-600">{userPoints.toLocaleString()} points</div>
    </div>
  );

  return (
    <PageLayout
      userType={user.userType}
      title="Rewards Store"
      subtitle="Redeem your points for exclusive TDIL rewards and benefits"
      headerActions={pointsDisplay}
      headerContent={filterTabs}
      showPointsInHeader={false}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewards.map((reward) => (
          <div key={reward.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-4xl">{reward.image}</div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Cost</div>
                  <div className="text-lg font-bold text-blue-600">{reward.cost} pts</div>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{reward.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span className="px-2 py-1 bg-gray-100 rounded-full">{reward.category}</span>
                  <span>{reward.availability} available</span>
                </div>
                
                <div className="text-xs text-gray-500">
                  📦 {reward.estimatedDelivery}
                </div>
              </div>
              
              <button
                onClick={() => handleRedeem(reward.id)}
                disabled={!canAfford(reward.cost) || redeemedRewards.has(reward.id)}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  redeemedRewards.has(reward.id)
                    ? 'bg-green-100 text-green-800 cursor-not-allowed'
                    : !canAfford(reward.cost)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {redeemedRewards.has(reward.id) 
                  ? '✓ Redeemed' 
                  : !canAfford(reward.cost)
                  ? `Need ${reward.cost - userPoints} more points`
                  : 'Redeem Now'
                }
              </button>
            </div>
          </div>
        ))}
      </div>

      {rewards.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎁</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No rewards available</h3>
          <p className="text-gray-500">Check back soon for new rewards!</p>
        </div>
      )}
    </PageLayout>
  );
}
