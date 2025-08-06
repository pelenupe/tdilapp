import API from './api';

export const getRewards = () => API.get('/rewards');
export const redeemReward = (rewardId) => API.post('/rewards/redeem', { rewardId });
