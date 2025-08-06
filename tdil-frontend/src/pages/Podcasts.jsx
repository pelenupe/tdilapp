import PageLayout from '../components/PageLayout';
import PointsService from '../services/pointsService';
import { useState, useEffect } from 'react';

export default function Podcasts() {
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

  const handleListenToPodcast = (podcastTitle, podcastId) => {
    // Award points for listening to podcast
    PointsService.awardPoints('PODCAST_LISTEN', `Listened to ${podcastTitle}`, {
      podcastId,
      podcastTitle
    });
    alert(`Now playing: ${podcastTitle}. +20 points earned!`);
  };

  return (
    <PageLayout
      userType={user.userType}
      title="Podcasts"
      subtitle="Discover and listen to podcasts from our community members and industry experts."
    >
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-6xl">🎙️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Tech Talk Tuesday</h3>
            <p className="text-gray-600 mb-4">Weekly discussions about the latest in technology and innovation.</p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Latest Episode: AI in the Workplace
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-2">⏰</span>
                45 min • Weekly
              </div>
            </div>
            <button 
              onClick={() => handleListenToPodcast('Tech Talk Tuesday', 'tech-talk-tuesday')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Listen Now (+20 pts)
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="w-full h-48 bg-gradient-to-br from-green-50 to-green-100 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-6xl">🎙️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Career Chronicles</h3>
            <p className="text-gray-600 mb-4">Stories and advice from successful professionals in various fields.</p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Latest Episode: From Intern to CEO
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-2">⏰</span>
                30 min • Bi-weekly
              </div>
            </div>
            <button 
              onClick={() => handleListenToPodcast('Career Chronicles', 'career-chronicles')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Listen Now (+20 pts)
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="w-full h-48 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-6xl">🎙️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Alumni Insights</h3>
            <p className="text-gray-600 mb-4">Conversations with tDIL alumni about their journey and achievements.</p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Latest Episode: Building a Startup
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-2">⏰</span>
                60 min • Monthly
              </div>
            </div>
            <button 
              onClick={() => handleListenToPodcast('Alumni Insights', 'alumni-insights')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Listen Now (+20 pts)
            </button>
          </div>

          <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="w-full h-48 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-6xl">🎙️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Network News</h3>
            <p className="text-gray-600 mb-4">Updates and announcements from the tDIL community and leadership.</p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Latest Episode: Q4 Community Updates
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-2">⏰</span>
                20 min • Quarterly
              </div>
            </div>
            <button 
              onClick={() => handleListenToPodcast('Network News', 'network-news')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Listen Now (+20 pts)
            </button>
          </div>

          <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="w-full h-48 bg-gradient-to-br from-red-50 to-red-100 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-6xl">🎙️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Industry Spotlight</h3>
            <p className="text-gray-600 mb-4">Deep dives into specific industries with expert guests and market analysis.</p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Latest Episode: Healthcare Innovation
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-2">⏰</span>
                40 min • Monthly
              </div>
            </div>
            <button 
              onClick={() => handleListenToPodcast('Industry Spotlight', 'industry-spotlight')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Listen Now (+20 pts)
            </button>
          </div>

          <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="w-full h-48 bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-6xl">🎙️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Mentor Minutes</h3>
            <p className="text-gray-600 mb-4">Short, actionable advice from successful mentors in the tDIL network.</p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Latest Episode: Networking Do's & Don'ts
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-2">⏰</span>
                15 min • Weekly
              </div>
            </div>
            <button 
              onClick={() => handleListenToPodcast('Mentor Minutes', 'mentor-minutes')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Listen Now (+20 pts)
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
