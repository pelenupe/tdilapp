import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import API from '../services/api';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { user } = useUser();

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const response = await API.get(`/announcements?filter=${filter}`);
        setAnnouncements(response.data || []);
      } catch (error) {
        console.error('Error fetching announcements:', error);
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [filter]);

  if (loading) {
    return (
      <PageLayout
        userType={user?.userType}
        title="Community Announcements"
        subtitle="Loading announcements..."
        showPointsInHeader={true}
        userPoints={user?.points || 0}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-4 mx-auto">
              tDIL
            </div>
            <div className="text-gray-600">Loading announcements...</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      userType={user?.userType || 'member'}
      title="Community Announcements"
      subtitle="Stay updated with the latest news and updates from tDIL"
      showPointsInHeader={true}
      userPoints={user?.points || 0}
    >
      {/* Filter Buttons */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          All Announcements
        </button>
        <button
          onClick={() => setFilter('important')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'important' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          Important
        </button>
        <button
          onClick={() => setFilter('events')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'events' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          Events
        </button>
        <button
          onClick={() => setFilter('jobs')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'jobs' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          Job Opportunities
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-6">
        {announcements.length > 0 ? (
          announcements.map((announcement, index) => (
            <div key={announcement.id || index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xl">
                        {announcement.type === 'event' && '📅'}
                        {announcement.type === 'job' && '💼'}
                        {announcement.type === 'important' && '⚠️'}
                        {announcement.type === 'general' && '📢'}
                        {!announcement.type && '📢'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {announcement.title || 'Community Announcement'}
                      </h3>
                      {announcement.priority === 'high' && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                          Important
                        </span>
                      )}
                      {announcement.type && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full capitalize">
                          {announcement.type}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {announcement.content || 'Stay tuned for exciting updates from the tDIL community!'}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span>
                          By {announcement.author || 'tDIL Team'}
                        </span>
                        <span>
                          {announcement.created_at ? 
                            new Date(announcement.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) : 
                            'Recently'
                          }
                        </span>
                      </div>
                      
                      {announcement.action && (
                        <button className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
                          {announcement.action}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📢</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements yet</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Stay tuned! Community announcements, event updates, and important news will appear here.
            </p>
            {user?.userType === 'admin' && (
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Create Announcement
              </button>
            )}
          </div>
        )}
      </div>

      {/* Admin Quick Actions */}
      {user?.userType === 'admin' && announcements.length > 0 && (
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="font-bold text-gray-900 mb-4">Admin Actions</h3>
          <div className="flex gap-2 flex-wrap">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Create Announcement
            </button>
            <button className="px-4 py-2 bg-white text-gray-700 border rounded-lg hover:bg-gray-50 transition-colors">
              Manage Categories
            </button>
            <button className="px-4 py-2 bg-white text-gray-700 border rounded-lg hover:bg-gray-50 transition-colors">
              View Analytics
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
