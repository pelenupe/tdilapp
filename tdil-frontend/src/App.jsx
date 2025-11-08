import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import API from './services/api';
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
          // Update user data if token is valid
          localStorage.setItem('user', JSON.stringify(response.data.user));
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
      </Routes>
    </div>
  );
}

export default App;
