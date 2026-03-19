import { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import Sidebar from '../components/Sidebar';
import api from '../services/api';

export default function CheckInHistory() {
  const { user } = useUser();
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCheckIns = async () => {
      try {
        const response = await api.get('/checkins');
        setCheckIns(response.data);
      } catch (error) {
        console.error('Error fetching check-ins:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckIns();
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto lg:ml-64">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Check-In History</h1>
            <p className="mt-2 text-gray-600">View all your past check-ins</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-600">Loading check-ins...</div>
            </div>
          ) : checkIns.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <div className="text-6xl mb-4">📍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No check-ins yet</h3>
              <p className="text-gray-500">Start checking in at events and venues!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {checkIns.map((checkIn) => (
                <div key={checkIn.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{checkIn.venue}</h3>
                      <p className="text-sm text-gray-600">{checkIn.location}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(checkIn.created_at).toLocaleString()}
                      </p>
                      {checkIn.sponsor && (
                        <div className="mt-2 inline-flex items-center gap-2 text-xs font-medium px-2 py-1 rounded bg-amber-100 text-amber-800">
                          ⭐ Sponsor: {checkIn.sponsor.name} ({String(checkIn.sponsor.tier || '').toUpperCase()})
                          {checkIn.sponsor_bonus_points ? (
                            <span className="text-green-700">+{checkIn.sponsor_bonus_points} bonus</span>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      📍 Check-in
                    </span>
                  </div>

                  {(checkIn.points_awarded || checkIn.sponsor_bonus_points) && (
                    <div className="mb-3 text-sm text-gray-700">
                      {checkIn.points_awarded ? (
                        <span className="mr-3">Points awarded: <strong>+{checkIn.points_awarded}</strong></span>
                      ) : null}
                      {checkIn.sponsor_bonus_points ? (
                        <span className="text-green-700">Sponsor bonus: <strong>+{checkIn.sponsor_bonus_points}</strong></span>
                      ) : null}
                    </div>
                  )}

                  {checkIn.notes && (
                    <p className="text-gray-700 mb-3">{checkIn.notes}</p>
                  )}

                  {checkIn.taggedUsers && checkIn.taggedUsers.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">With:</p>
                      <div className="flex flex-wrap gap-2">
                        {checkIn.taggedUsers.map((tagged) => (
                          <span
                            key={tagged.id}
                            className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                          >
                            {tagged.firstName} {tagged.lastName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
