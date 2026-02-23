import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import api from '../services/api';
import SidebarMember from '../components/SidebarMember';
import MobileHeader from '../components/MobileHeader';

export default function CheckIn() {
  const { user } = useUser();
  // Track sidebar collapsed state so content area shifts accordingly
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    typeof window !== 'undefined' && window.innerWidth < 1024
  );
  const [location, setLocation] = useState('');
  const [venue, setVenue] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [message, setMessage] = useState('');
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [coordinates, setCoordinates] = useState(null);
  const [members, setMembers] = useState([]);
  const [taggedUserIds, setTaggedUserIds] = useState([]);
  const [showTagging, setShowTagging] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);

  useEffect(() => {
    // Fetch members for tagging
    const fetchMembers = async () => {
      try {
        const response = await api.get('/members');
        setMembers(response.data.filter(m => m.id !== user.id));
      } catch (error) {
        console.error('Error fetching members:', error);
      }
    };
    fetchMembers();
  }, [user]);

  const getMyLocation = () => {
    if (!navigator.geolocation) {
      setMessage('❌ Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    setMessage('📍 Getting your location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });
          
          // Get reverse geocoded address
          const geocodeResponse = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE'}`
          );
          const geocodeData = await geocodeResponse.json();
          
          if (geocodeData.results && geocodeData.results[0]) {
            const address = geocodeData.results[0].formatted_address;
            setLocation(address);
          } else {
            setLocation(`${latitude}, ${longitude}`);
          }

          // Get nearby places using backend proxy (fixes CORS)
          const token = localStorage.getItem('token');
          const placesResponse = await fetch(
            `/api/places/nearby?lat=${latitude}&lng=${longitude}&radius=1500`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          const placesData = await placesResponse.json();
          
          if (placesData.results && placesData.results.length > 0) {
            setNearbyPlaces(placesData.results.slice(0, 10)); // Show top 10
            setMessage('✅ Found nearby businesses! Select one or enter manually.');
          } else {
            setMessage('✅ Location found! No nearby businesses detected.');
          }
        } catch (error) {
          console.error('Location error:', error);
          setLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
          setMessage('✅ Location captured. Enter venue manually.');
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setMessage('❌ Unable to get location. Please enter manually.');
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const selectPlace = (place) => {
    setSelectedPlace(place);
    setVenue(place.name);
    if (place.vicinity) {
      setLocation(place.vicinity);
    }
    if (place.sponsor) {
      setMessage(`✅ Selected sponsor location: ${place.name} (+${place.sponsor.userBonus || place.sponsor.bonusPoints} bonus points)`);
    } else {
      setMessage(`✅ Selected: ${place.name}`);
    }
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await api.post('/checkins', {
        location,
        venue,
        notes,
        taggedUserIds,
        ...(coordinates && { latitude: coordinates.lat, longitude: coordinates.lng }),
        ...(selectedPlace?.place_id && { googlePlaceId: selectedPlace.place_id })
      });

      const taggedMsg = taggedUserIds.length > 0 ? ` Tagged ${taggedUserIds.length} member(s).` : '';
      const sponsorMsg = response.data.sponsor
        ? ` Sponsor bonus +${response.data.sponsorBonusPoints}.`
        : '';
      setMessage(`✅ Check-in successful! +${response.data.pointsAwarded} points awarded.${sponsorMsg}${taggedMsg}`);
      
      setLocation('');
      setVenue('');
      setNotes('');
      setTaggedUserIds([]);
      setNearbyPlaces([]);
      setCoordinates(null);
      setSelectedPlace(null);
      setShowTagging(false);
      
      // Reload user data to get updated points
      window.location.reload();
    } catch (error) {
      console.error('Check-in error:', error);
      setMessage(error.response?.data?.message || '❌ Check-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header shown below md breakpoint */}
      <MobileHeader userType={user?.userType} className="md:hidden" />

      <SidebarMember
        collapsible
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main content shifts with sidebar */}
      <div
        className="overflow-auto pt-16 md:pt-0 transition-all duration-300"
        style={{ marginLeft: typeof window !== 'undefined' && window.innerWidth >= 768 ? (sidebarCollapsed ? '4rem' : '16rem') : 0 }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Check-In</h1>
            <p className="mt-2 text-gray-600">
              Check in at events, meetings, or venues to earn points!
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleCheckIn} className="space-y-6">
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    id="location"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setSelectedPlace(null);
                    }}
                    className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter location (e.g., Indianapolis, IN)"
                    required
                  />
                  <button
                    type="button"
                    onClick={getMyLocation}
                    disabled={gettingLocation}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {gettingLocation ? '📍...' : '📍 Use My Location'}
                  </button>
                </div>
              </div>

              {/* Nearby Places List */}
              {nearbyPlaces.length > 0 && (
                <div className="border border-gray-300 rounded-md p-4 max-h-64 overflow-y-auto">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Nearby Businesses:</h3>
                  <div className="space-y-2">
                    {nearbyPlaces.map((place, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectPlace(place)}
                        className="w-full text-left p-3 hover:bg-blue-50 rounded-md border border-gray-200 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{place.name}</div>
                        {place.vicinity && (
                          <div className="text-sm text-gray-500">{place.vicinity}</div>
                        )}
                        {place.sponsor && (
                          <div className="mt-1 inline-flex items-center gap-2 text-xs font-medium px-2 py-1 rounded bg-amber-100 text-amber-800">
                            ⭐ {place.sponsor.sponsorName} ({String(place.sponsor.tier || '').toUpperCase()})
                            <span className="text-green-700">+{place.sponsor.userBonus || place.sponsor.bonusPoints} bonus</span>
                          </div>
                        )}
                        {place.rating && (
                          <div className="text-sm text-yellow-600">⭐ {place.rating}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlace?.sponsor && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 text-sm">
                  Sponsor match: <strong>{selectedPlace.sponsor.sponsorName}</strong> ({String(selectedPlace.sponsor.tier || '').toUpperCase()}) —
                  you will earn <strong>+{selectedPlace.sponsor.userBonus || selectedPlace.sponsor.bonusPoints}</strong> bonus points on this check-in.
                </div>
              )}

              <div>
                <label htmlFor="venue" className="block text-sm font-medium text-gray-700">
                  Venue/Event Name
                </label>
                <input
                  type="text"
                  id="venue"
                  value={venue}
                  onChange={(e) => {
                    setVenue(e.target.value);
                    setSelectedPlace(null);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter venue or event name"
                  required
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Add any additional notes..."
                />
              </div>

              {/* Tag Users Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Tag Members (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTagging(!showTagging)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showTagging ? 'Hide' : 'Show'} Members
                  </button>
                </div>
                
                {taggedUserIds.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {taggedUserIds.map(id => {
                      const member = members.find(m => m.id === id);
                      return member ? (
                        <span key={id} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {member.firstName} {member.lastName}
                          <button
                            type="button"
                            onClick={() => setTaggedUserIds(taggedUserIds.filter(uid => uid !== id))}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            ✕
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {showTagging && (
                  <div className="border border-gray-300 rounded-md p-4 max-h-48 overflow-y-auto">
                    <div className="space-y-2">
                      {members.map((member) => (
                        <label key={member.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={taggedUserIds.includes(member.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTaggedUserIds([...taggedUserIds, member.id]);
                              } else {
                                setTaggedUserIds(taggedUserIds.filter(id => id !== member.id));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{member.firstName} {member.lastName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {message && (
                <div className={`p-4 rounded-md ${message.includes('✅') ? 'bg-green-50 text-green-800' : message.includes('📍') ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-800'}`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Checking in...' : '📍 Check In'}
              </button>
            </form>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">💡 Earn Points</h2>
            <ul className="space-y-2 text-blue-800">
              <li>• Check in at tDIL events to earn points</li>
              <li>• Visit partner venues and locations</li>
              <li>• Network at meetups and conferences</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
