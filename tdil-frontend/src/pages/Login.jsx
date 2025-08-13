import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Demo accounts
  const demoAccounts = {
    'demo@member.com': {
      password: 'demo123',
      user: {
        id: 1,
        name: 'Demo Member',
        email: 'demo@member.com',
        userType: 'member',
        points: 1250,
        level: 'Intermediate'
      }
    },
    'demo@school.com': {
      password: 'school123',
      user: {
        id: 2,
        name: 'Demo School Admin',
        email: 'demo@school.com',
        userType: 'partner_school',
        organization: 'Butler University',
        studentsEnrolled: 234
      }
    },
    'demo@sponsor.com': {
      password: 'sponsor123',
      user: {
        id: 3,
        name: 'Demo Sponsor Admin',
        email: 'demo@sponsor.com',
        userType: 'sponsor',
        company: 'Salesforce',
        sponsorshipLevel: 'Gold',
        investmentAmount: 50000
      }
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleDemoLogin = (userType) => {
    const demoEmail = `demo@${userType}.com`;
    const account = demoAccounts[demoEmail];
    
    if (account) {
      localStorage.setItem('token', 'demo-token-' + userType);
      localStorage.setItem('user', JSON.stringify(account.user));
      window.location.href = '/dashboard';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Check demo accounts first
      const account = demoAccounts[formData.email.toLowerCase()];
      if (account && account.password === formData.password) {
        localStorage.setItem('token', 'demo-token-' + account.user.userType);
        localStorage.setItem('user', JSON.stringify(account.user));
        window.location.href = '/dashboard';
        return;
      }

      // Check registered users
      const registeredUser = localStorage.getItem('user_' + formData.email);
      if (registeredUser) {
        const userData = JSON.parse(registeredUser);
        // For demo purposes, accept any password for registered users
        // In real app, you'd hash and compare passwords
        localStorage.setItem('token', 'registered-token-' + userData.id);
        localStorage.setItem('user', JSON.stringify(userData));
        window.location.href = '/dashboard';
        return;
      }

      // If not found, show error
      setError('Invalid email or password. Try using a demo account or register first.');
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <Logo size="lg" clickable={true} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <button 
            onClick={() => navigate('/register')}
            className="font-medium text-blue-600 hover:text-blue-500 underline"
          >
            create a new account
          </button>
        </p>
        <p className="mt-2 text-center text-sm text-gray-600">
          <button 
            onClick={() => navigate('/')}
            className="font-medium text-gray-600 hover:text-gray-800 underline"
          >
            ← Back to Home
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          {/* Demo Login Buttons */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or try a demo account</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => handleDemoLogin('member')}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span className="text-blue-600 mr-2">👤</span>
                Demo Member Login
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('school')}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span className="text-green-600 mr-2">🎓</span>
                Demo School Login
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('sponsor')}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span className="text-purple-600 mr-2">💼</span>
                Demo Sponsor Login
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500 text-center">
              <p><strong>Member:</strong> demo@member.com / demo123</p>
              <p><strong>School:</strong> demo@school.com / school123</p>
              <p><strong>Sponsor:</strong> demo@sponsor.com / sponsor123</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
