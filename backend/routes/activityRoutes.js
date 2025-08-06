const express = require('express');
const { db } = require('../config/database');
const router = express.Router();

// Get recent activity
router.get('/', (req, res) => {
  // For now, return mock data since we don't have activity tracking set up yet
  const mockActivity = [
    {
      id: 1,
      type: 'connection',
      user: 'Robert Taylor',
      userAvatar: '/api/placeholder/40/40',
      action: 'connected with',
      target: 'Maria Garcia',
      targetLink: '/profile/maria-garcia',
      location: 'Networking Breakfast',
      points: 150,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    },
    {
      id: 2,
      type: 'job',
      user: 'Sarah Williams',
      userAvatar: '/api/placeholder/40/40',
      action: 'posted a new job opportunity at',
      target: 'Salesforce',
      targetLink: '/jobs/salesforce-senior-product-manager',
      location: 'Senior Product Manager - Remote',
      points: null,
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5 hours ago
    },
    {
      id: 3,
      type: 'event',
      user: 'You',
      userAvatar: '/api/placeholder/40/40',
      action: 'registered for',
      target: 'Leadership Summit 2025',
      targetLink: '/events/leadership-summit-2025',
      location: 'Event registration complete!',
      points: 50,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
    },
    {
      id: 4,
      type: 'content',
      user: 'Thomas Wilson',
      userAvatar: '/api/placeholder/40/40',
      action: 'shared a podcast episode:',
      target: 'Navigating Career Transitions',
      targetLink: '/podcasts/navigating-career-transitions',
      location: 'tDIL Podcast: Navigating Career Transitions',
      points: null,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
    }
  ];

  res.json(mockActivity);
});

// Get activity by type
router.get('/:type', (req, res) => {
  const { type } = req.params;
  
  // Filter mock data by type
  const mockActivity = [
    {
      id: 1,
      type: 'connection',
      user: 'Robert Taylor',
      userAvatar: '/api/placeholder/40/40',
      action: 'connected with',
      target: 'Maria Garcia',
      targetLink: '/profile/maria-garcia',
      location: 'Networking Breakfast',
      points: 150,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      type: 'job',
      user: 'Sarah Williams',
      userAvatar: '/api/placeholder/40/40',
      action: 'posted a new job opportunity at',
      target: 'Salesforce',
      targetLink: '/jobs/salesforce-senior-product-manager',
      location: 'Senior Product Manager - Remote',
      points: null,
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 3,
      type: 'event',
      user: 'You',
      userAvatar: '/api/placeholder/40/40',
      action: 'registered for',
      target: 'Leadership Summit 2025',
      targetLink: '/events/leadership-summit-2025',
      location: 'Event registration complete!',
      points: 50,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const filteredActivity = type === 'all' ? mockActivity : mockActivity.filter(item => item.type === type);
  res.json(filteredActivity);
});

module.exports = router;
