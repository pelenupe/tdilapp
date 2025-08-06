const express = require('express');
const { db } = require('../config/database');
const router = express.Router();

// Get leaderboard
router.get('/', (req, res) => {
  // For now, return mock data with realistic leaderboard
  const mockLeaderboard = [
    {
      id: 1,
      rank: 1,
      firstName: 'Michael',
      lastName: 'Johnson',
      avatar: '/api/placeholder/40/40',
      points: 4582,
      level: 8,
      company: 'Tech Solutions Inc.'
    },
    {
      id: 2,
      rank: 2,
      firstName: 'Sarah',
      lastName: 'Williams',
      avatar: '/api/placeholder/40/40',
      points: 3845,
      level: 7,
      company: 'Salesforce'
    },
    {
      id: 3,
      rank: 3,
      firstName: 'David',
      lastName: 'Chen',
      avatar: '/api/placeholder/40/40',
      points: 3210,
      level: 6,
      company: 'Microsoft'
    },
    {
      id: 4,
      rank: 4,
      firstName: 'Emma',
      lastName: 'Rodriguez',
      avatar: '/api/placeholder/40/40',
      points: 2987,
      level: 6,
      company: 'Google'
    },
    {
      id: 5,
      rank: 5,
      firstName: 'James',
      lastName: 'Wilson',
      avatar: '/api/placeholder/40/40',
      points: 2756,
      level: 5,
      company: 'Amazon'
    },
    {
      id: 6,
      rank: 6,
      firstName: 'Lisa',
      lastName: 'Anderson',
      avatar: '/api/placeholder/40/40',
      points: 2634,
      level: 5,
      company: 'Apple'
    },
    {
      id: 7,
      rank: 7,
      firstName: 'Robert',
      lastName: 'Taylor',
      avatar: '/api/placeholder/40/40',
      points: 2589,
      level: 5,
      company: 'Meta'
    },
    {
      id: 8,
      rank: 8,
      firstName: 'Maria',
      lastName: 'Garcia',
      avatar: '/api/placeholder/40/40',
      points: 2501,
      level: 5,
      company: 'Netflix'
    },
    {
      id: 9,
      rank: 9,
      firstName: 'Kevin',
      lastName: 'Brown',
      avatar: '/api/placeholder/40/40',
      points: 2478,
      level: 4,
      company: 'Uber'
    },
    {
      id: 10,
      rank: 10,
      firstName: 'Ashley',
      lastName: 'Davis',
      avatar: '/api/placeholder/40/40',
      points: 2465,
      level: 4,
      company: 'Airbnb'
    },
    {
      id: 11,
      rank: 11,
      firstName: 'Thomas',
      lastName: 'Wilson',
      avatar: '/api/placeholder/40/40',
      points: 2456,
      level: 4,
      company: 'Spotify'
    },
    {
      id: 999,
      rank: 12,
      firstName: 'Jessica',
      lastName: 'O\'Connor',
      avatar: '/api/placeholder/40/40',
      points: 2450,
      level: 4,
      company: 'tDIL',
      isCurrentUser: true
    }
  ];

  res.json(mockLeaderboard);
});

// Get top leaderboard (top 10)
router.get('/top', (req, res) => {
  const mockLeaderboard = [
    {
      id: 1,
      rank: 1,
      firstName: 'Michael',
      lastName: 'Johnson',
      avatar: '/api/placeholder/40/40',
      points: 4582,
      level: 8,
      company: 'Tech Solutions Inc.'
    },
    {
      id: 2,
      rank: 2,
      firstName: 'Sarah',
      lastName: 'Williams',
      avatar: '/api/placeholder/40/40',
      points: 3845,
      level: 7,
      company: 'Salesforce'
    },
    {
      id: 3,
      rank: 3,
      firstName: 'David',
      lastName: 'Chen',
      avatar: '/api/placeholder/40/40',
      points: 3210,
      level: 6,
      company: 'Microsoft'
    },
    {
      id: 4,
      rank: 4,
      firstName: 'Emma',
      lastName: 'Rodriguez',
      avatar: '/api/placeholder/40/40',
      points: 2987,
      level: 6,
      company: 'Google'
    },
    {
      id: 5,
      rank: 5,
      firstName: 'James',
      lastName: 'Wilson',
      avatar: '/api/placeholder/40/40',
      points: 2756,
      level: 5,
      company: 'Amazon'
    },
    {
      id: 999,
      rank: 12,
      firstName: 'Jessica',
      lastName: 'O\'Connor',
      avatar: '/api/placeholder/40/40',
      points: 2450,
      level: 4,
      company: 'tDIL',
      isCurrentUser: true
    }
  ];

  res.json(mockLeaderboard);
});

module.exports = router;
