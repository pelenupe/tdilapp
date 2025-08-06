import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
import Podcasts from './pages/Podcasts';
import Sponsors from './pages/Sponsors';
import Donate from './pages/Donate';
import Settings from './pages/Settings';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (check for token in localStorage)
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    } else {
      // For testing purposes, set default user data
      localStorage.setItem('token', 'demo-token');
      localStorage.setItem('user', JSON.stringify({
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@tdil.com',
        userType: 'member',
        points: 2450,
        level: 3
      }));
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-4 mx-auto">
            tDIL
          </div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Home />} />
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/community" element={isAuthenticated ? <Community /> : <Navigate to="/login" />} />
        <Route path="/directory" element={isAuthenticated ? <Directory /> : <Navigate to="/login" />} />
        <Route path="/jobs" element={isAuthenticated ? <JobBoard /> : <Navigate to="/login" />} />
        <Route path="/events" element={isAuthenticated ? <Events /> : <Navigate to="/login" />} />
        <Route path="/merch-store" element={isAuthenticated ? <MerchStore /> : <Navigate to="/login" />} />
        <Route path="/partner-schools" element={isAuthenticated ? <PartnerSchools /> : <Navigate to="/login" />} />
        <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
        <Route path="/chat" element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" />} />
        <Route path="/rewards" element={isAuthenticated ? <Rewards /> : <Navigate to="/login" />} />
        <Route path="/podcasts" element={isAuthenticated ? <Podcasts /> : <Navigate to="/login" />} />
        <Route path="/sponsors" element={isAuthenticated ? <Sponsors /> : <Navigate to="/login" />} />
        <Route path="/donate" element={isAuthenticated ? <Donate /> : <Navigate to="/login" />} />
        <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} />
      </Routes>
    </div>
  );
}

export default App;
