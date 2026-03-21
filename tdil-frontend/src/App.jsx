import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import API from './services/api';
import { UserProvider } from './contexts/UserContext';
import { SidebarProvider } from './contexts/SidebarContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Directory from './pages/Directory';
import JobBoard from './pages/JobBoard';
import Profile from './pages/Profile';
import ChatPage from './pages/ChatPage';
import Rewards from './pages/Rewards';
import Events from './pages/Events';
import Community from './pages/Community';
import MerchStore from './pages/MerchStore';
import PartnerSchools from './pages/PartnerSchools';
import Donate from './pages/Donate';
import Settings from './pages/Settings';
import Leaderboard from './pages/Leaderboard';
import Announcements from './pages/Announcements';
import MyCohort from './pages/MyCohort';
import GroupChats from './pages/GroupChats';
import Students from './pages/Students';
import CheckIn from './pages/CheckIn';
import CheckInHistory from './pages/CheckInHistory';
import PortalLogin from './pages/PortalLogin';
import PartnerPortal from './pages/PartnerPortal';
import SponsorPortal from './pages/SponsorPortal';
import AdminUsers from './pages/AdminUsers';
import AdminDashboard from './pages/AdminDashboard';
import ProgramCalendar from './pages/ProgramCalendar';
import EmployerPortal from './pages/EmployerPortal';
import OrgProfile from './pages/OrgProfile';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token || token === 'demo-token') {
        // Clear any invalid or demo data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        // Validate token with backend
        const response = await API.get('/auth/me');
        
        if (response.data && response.data.user) {
          // Update user data if token is valid, but preserve any client-side cache-bust hints
          const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
          const mergedUser = {
            ...existingUser,
            ...response.data.user,
            // Keep previous profile image timestamp if backend doesn't provide one
            profileImageUpdatedAt:
              response.data.user.profileImageUpdatedAt ||
              existingUser.profileImageUpdatedAt ||
              existingUser.updatedAt ||
              null
          };

          localStorage.setItem('user', JSON.stringify(mergedUser));
          setIsAuthenticated(true);
        } else {
          throw new Error('Invalid response');
        }
      } catch (error) {
        console.error('Auth validation failed:', error);
        // Token is invalid or expired
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    validateAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/tdil-logo.png" alt="tDIL" className="w-16 h-16 object-contain mx-auto mb-4 animate-pulse" />
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <UserProvider>
    <SidebarProvider>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={!isAuthenticated ? <Home /> : <Navigate to="/dashboard" replace />} />
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/community" element={isAuthenticated ? <Community /> : <Navigate to="/login" />} />
          <Route path="/directory" element={isAuthenticated ? <Directory /> : <Navigate to="/login" />} />
          <Route path="/jobs" element={isAuthenticated ? <JobBoard /> : <Navigate to="/login" />} />
          <Route path="/events" element={isAuthenticated ? <Events /> : <Navigate to="/login" />} />
          <Route path="/merch-store" element={isAuthenticated ? <MerchStore /> : <Navigate to="/login" />} />
          <Route path="/partner-schools" element={isAuthenticated ? <PartnerSchools /> : <Navigate to="/login" />} />
          <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/profile/:id" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/chat" element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" />} />
          <Route path="/rewards" element={isAuthenticated ? <Rewards /> : <Navigate to="/login" />} />
          <Route path="/donate" element={isAuthenticated ? <Donate /> : <Navigate to="/login" />} />
          <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} />
          <Route path="/leaderboard" element={isAuthenticated ? <Leaderboard /> : <Navigate to="/login" />} />
          <Route path="/announcements" element={isAuthenticated ? <Announcements /> : <Navigate to="/login" />} />
          <Route path="/cohort" element={isAuthenticated ? <MyCohort /> : <Navigate to="/login" />} />
          <Route path="/cohort/:name" element={isAuthenticated ? <MyCohort /> : <Navigate to="/login" />} />
          <Route path="/chats" element={isAuthenticated ? <GroupChats /> : <Navigate to="/login" />} />
          <Route path="/students" element={isAuthenticated ? <Students /> : <Navigate to="/login" />} />
          <Route path="/checkin" element={isAuthenticated ? <CheckIn /> : <Navigate to="/login" />} />
          <Route path="/checkin-history" element={isAuthenticated ? <CheckInHistory /> : <Navigate to="/login" />} />
          <Route path="/calendar" element={isAuthenticated ? <ProgramCalendar /> : <Navigate to="/login" />} />
          {/* Org profile pages (school / sponsor / employer) */}
          <Route path="/org/:id" element={isAuthenticated ? <OrgProfile /> : <Navigate to="/login" />} />

          {/* Admin */}
          <Route path="/admin" element={isAuthenticated ? <AdminDashboard /> : <Navigate to="/login" />} />
          <Route path="/admin/users" element={isAuthenticated ? <AdminUsers /> : <Navigate to="/login" />} />

          {/* Partner / Sponsor Portal — separate auth flow */}
          <Route path="/portal/login" element={<PortalLogin />} />
          <Route path="/portal/partner" element={<PartnerPortal />} />
          <Route path="/portal/sponsor" element={<SponsorPortal />} />
          <Route path="/portal/employer" element={<EmployerPortal />} />
          <Route path="/portal" element={<Navigate to="/portal/login" replace />} />
        </Routes>
      </div>
    </SidebarProvider>
    </UserProvider>
  );
}

export default App;
