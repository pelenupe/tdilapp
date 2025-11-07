import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Upload, User, Mail, Building, Briefcase, Award, Star } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import PointsService from '../services/pointsService';
import { getMyProfile, updateProfile } from '../services/profileService';

export default function Profile() {
  const { id } = useParams(); // Get user ID from URL parameter
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    jobTitle: '',
    bio: '',
    points: 0,
    level: 1,
    profilePicUrl: '',
    userType: 'member'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isOwnProfile, setIsOwnProfile] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const isViewingOwnProfile = !id || id === currentUser.id?.toString();
      setIsOwnProfile(isViewingOwnProfile);

      let response;
      if (isViewingOwnProfile) {
        // Load current user's profile
        response = await getMyProfile();
      } else {
        // Load other user's profile
        const token = localStorage.getItem('token');
        response = await fetch(`/api/members/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error('Failed to fetch profile');
        response = { data: await response.json() };
        
        // Award PROFILE_VIEW points for viewing another user's profile
        PointsService.awardPoints('PROFILE_VIEW', `Viewed ${response.data.firstName} ${response.data.lastName}'s profile`);
      }

      const userData = response.data;
      setProfile({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        company: userData.company || '',
        jobTitle: userData.jobTitle || '',
        bio: userData.bio || '',
        points: userData.points || 0,
        level: userData.level || 1,
        profilePicUrl: userData.profileImage || '',
        userType: userData.userType || 'member'
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      // Fallback to localStorage if API fails (for own profile only)
      if (!id) {
        try {
          const userData = JSON.parse(localStorage.getItem('user') || '{}');
          setProfile({
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || '',
            company: userData.company || '',
            jobTitle: userData.jobTitle || '',
            bio: userData.bio || '',
            points: userData.points || 0,
            level: userData.level || 1,
            profilePicUrl: userData.profileImage || userData.profilePicUrl || '',
            userType: userData.userType || 'member'
          });
        } catch (fallbackError) {
          console.error('Fallback error:', fallbackError);
        }
      }
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const profileData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        company: profile.company,
        jobTitle: profile.jobTitle,
        bio: profile.bio
      };

      // Add selected file if there is one
      if (selectedFile) {
        profileData.profilePic = selectedFile;
      }

      const response = await updateProfile(profileData);
      
      // Update localStorage with new data
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update local state with correct field mapping
      setProfile(prevProfile => ({
        ...prevProfile,
        ...updatedUser,
        profilePicUrl: updatedUser.profileImage || updatedUser.profilePicUrl || prevProfile.profilePicUrl
      }));
      
      setIsEditing(false);
      setSelectedFile(null);
      setPreviewUrl('');
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  };

  const getLevelProgress = () => {
    const pointsForNextLevel = profile.level * 1000;
    const currentLevelPoints = (profile.level - 1) * 1000;
    const progress = ((profile.points - currentLevelPoints) / (pointsForNextLevel - currentLevelPoints)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  if (isLoading) {
    return (
      <PageLayout
        userType={profile.userType}
        title="Profile"
        subtitle="Loading profile..."
        showPointsInHeader={false}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-4 mx-auto">
              tDIL
            </div>
            <div className="text-gray-600">Loading profile...</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const headerActions = isOwnProfile ? (
    <div className="flex items-center gap-3">
      {!isEditing ? (
        <button
          onClick={() => setIsEditing(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Edit Profile
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsEditing(false);
              loadProfile(); // Reset changes
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  ) : null;

  return (
    <PageLayout
      userType={profile.userType}
      title={isOwnProfile ? "My Profile" : `${profile.firstName} ${profile.lastName}`}
      subtitle={isOwnProfile ? "Manage your personal information and preferences" : "Member Profile"}
      userPoints={profile.points}
      headerActions={headerActions}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Information */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>

          {/* Profile Picture and Basic Info */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-6 space-y-4 sm:space-y-0">
            <div className="relative mx-auto sm:mx-0">
              <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                {previewUrl || profile.profilePicUrl ? (
                  <img 
                    src={previewUrl || profile.profilePicUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials()
                )}
              </div>
              {isEditing && (
                <label className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                  <Camera size={16} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  {isOwnProfile && isEditing ? (
                    <input
                      type="text"
                      name="firstName"
                      value={profile.firstName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{profile.firstName || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  {isOwnProfile && isEditing ? (
                    <input
                      type="text"
                      name="lastName"
                      value={profile.lastName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{profile.lastName || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900 flex items-center py-2">
                    <Mail size={16} className="mr-2 text-gray-400" />
                    {profile.email}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  {isOwnProfile && isEditing ? (
                    <input
                      type="text"
                      name="company"
                      value={profile.company}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-center py-2">
                      <Building size={16} className="mr-2 text-gray-400" />
                      {profile.company || 'Not set'}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  {isOwnProfile && isEditing ? (
                    <input
                      type="text"
                      name="jobTitle"
                      value={profile.jobTitle}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-center py-2">
                      <Briefcase size={16} className="mr-2 text-gray-400" />
                      {profile.jobTitle || 'Not set'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
            {isOwnProfile && isEditing ? (
              <textarea
                name="bio"
                value={profile.bio}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tell us about yourself..."
              />
            ) : (
              <div className="text-gray-900 bg-gray-50 p-3 rounded-lg min-h-[100px]">
                {profile.bio || 'No bio added yet.'}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Points & Level</h3>
              <Award className="text-yellow-500" size={24} />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Current Points</span>
                  <span className="text-2xl font-bold text-blue-600">{profile.points.toLocaleString()}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Level {profile.level}</span>
                  <span className="text-sm text-gray-500">
                    {Math.round(getLevelProgress())}% to Level {profile.level + 1}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getLevelProgress()}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
              <Star className="text-yellow-500" size={24} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <User size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Profile Complete</p>
                  <p className="text-xs text-gray-500">Basic profile information added</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Star size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Community Member</p>
                  <p className="text-xs text-gray-500">Joined the tDIL community</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Award size={16} className="text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Level {profile.level} Achiever</p>
                  <p className="text-xs text-gray-500">Reached level {profile.level}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 text-sm">Email Notifications</p>
                <p className="text-xs text-gray-500">Receive updates about events and opportunities</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 text-sm">Profile Visibility</p>
                <p className="text-xs text-gray-500">Allow other members to find your profile</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 text-sm">Activity Tracking</p>
                <p className="text-xs text-gray-500">Help us improve your experience with usage data</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
