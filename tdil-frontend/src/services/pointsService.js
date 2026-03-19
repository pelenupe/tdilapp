// Points awarded for different activities
const POINT_VALUES = {
  PROFILE_VIEW: 10,
  PROFILE_COMPLETE: 50,
  COMMUNITY_CONNECT: 25,
  CHAT_MESSAGE: 5,
  PARTNER_SCHOOL_VIEW: 15,
  JOB_APPLICATION: 30,
  DONATION: 100,
  EVENT_ATTENDANCE: 40,
  REWARD_REDEMPTION: -50, // Points spent
  LOGIN: 5,
  FIRST_LOGIN: 25
};

class PointsService {
  constructor() {
    this.initializeUserPoints();
  }

  initializeUserPoints() {
    // Initialize points tracking if not exists
    const user = this.getCurrentUser();
    if (user && !user.pointsHistory) {
      user.pointsHistory = [];
      user.totalPointsEarned = 0;
      this.saveUser(user);
    }
  }

  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (error) {
      console.error('Error getting current user:', error);
      return {};
    }
  }

  saveUser(user) {
    try {
      localStorage.setItem('user', JSON.stringify(user));
      // Dispatch event to update other components
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: user }));
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  awardPoints(activityType, description = '', metadata = {}) {
    const user = this.getCurrentUser();
    if (!user.email) return 0; // User not logged in

    const points = POINT_VALUES[activityType] || 0;
    if (points === 0) return 0;

    // Check for duplicate activities (prevent point farming)
    if (this.isDuplicateActivity(activityType, metadata)) {
      return 0;
    }

    // Update user points
    user.points = (user.points || 0) + points;
    user.totalPointsEarned = (user.totalPointsEarned || 0) + Math.abs(points);
    user.level = this.calculateLevel(user.totalPointsEarned);

    // Add to points history
    if (!user.pointsHistory) user.pointsHistory = [];
    user.pointsHistory.unshift({
      activityType,
      points,
      description: description || this.getDefaultDescription(activityType),
      timestamp: new Date().toISOString(),
      metadata
    });

    // Keep only last 100 activities
    if (user.pointsHistory.length > 100) {
      user.pointsHistory = user.pointsHistory.slice(0, 100);
    }

    this.saveUser(user);
    
    // Show notification
    this.showPointsNotification(points, description || this.getDefaultDescription(activityType));

    return points;
  }

  isDuplicateActivity(activityType, metadata) {
    const user = this.getCurrentUser();
    if (!user.pointsHistory) return false;

    const now = new Date();
    const oneHour = 60 * 60 * 1000;

    // Check for recent duplicate activities
    return user.pointsHistory.some(activity => {
      const activityTime = new Date(activity.timestamp);
      const timeDiff = now - activityTime;

      // Different rules for different activities
      switch (activityType) {
        case 'PROFILE_VIEW':
          return timeDiff < oneHour && activity.activityType === activityType;
        case 'CHAT_MESSAGE':
          return false; // Allow multiple chat messages
        case 'PARTNER_SCHOOL_VIEW':
          return timeDiff < oneHour && activity.activityType === activityType &&
                 activity.metadata?.schoolId === metadata?.schoolId;
        default:
          return false;
      }
    });
  }

  calculateLevel(totalPoints) {
    // Every 1000 points = 1 level
    return Math.floor(totalPoints / 1000) + 1;
  }

  getDefaultDescription(activityType) {
    const descriptions = {
      PROFILE_VIEW: 'Viewed your profile',
      PROFILE_COMPLETE: 'Completed your profile',
      COMMUNITY_CONNECT: 'Connected with a community member',
      CHAT_MESSAGE: 'Sent a chat message',
      PARTNER_SCHOOL_VIEW: 'Viewed partner school information',
      JOB_APPLICATION: 'Applied for a job',
      DONATION: 'Made a donation',
      EVENT_ATTENDANCE: 'Attended an event',
      REWARD_REDEMPTION: 'Redeemed a reward',
      LOGIN: 'Logged in',
      FIRST_LOGIN: 'First time login bonus'
    };
    return descriptions[activityType] || 'Activity completed';
  }

  showPointsNotification(points, description) {
    // Create a simple notification
    if (points > 0) {
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300';
      notification.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
          <span>+${points} points - ${description}</span>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Remove after 3 seconds
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, 3000);
    }
  }

  getPointsHistory() {
    const user = this.getCurrentUser();
    return user.pointsHistory || [];
  }

  getPointsBreakdown() {
    const history = this.getPointsHistory();
    const breakdown = {};
    
    history.forEach(activity => {
      if (!breakdown[activity.activityType]) {
        breakdown[activity.activityType] = {
          count: 0,
          totalPoints: 0,
          description: activity.description
        };
      }
      breakdown[activity.activityType].count++;
      breakdown[activity.activityType].totalPoints += activity.points;
    });

    return breakdown;
  }
}

export default new PointsService();
