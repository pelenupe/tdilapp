import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await login(formData);
      const data = response.data;

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard'; // Force full page reload to update auth state
    } catch (error) {
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            tDIL
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <a href="/register" className="font-medium text-blue-600 hover:text-blue-500">
            create a new account
          </a>
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

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Demo Credentials</span>
              </div>
            </div>

            <div className="mt-4 bg-gray-50 rounded-md p-4">
              <p className="text-sm text-gray-600 mb-3">Choose a demo account type to test:</p>
              
              {/* Member Account */}
              <div className="mb-4 p-3 bg-white rounded border">
                <h4 className="font-semibold text-sm text-gray-800 mb-2">👤 Member Account</h4>
                <div className="text-xs font-mono text-gray-600 mb-2">
                  <div><strong>Email:</strong> demo@tdil.com</div>
                  <div><strong>Password:</strong> demo123</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ email: 'demo@tdil.com', password: 'demo123' });
                  }}
                  className="text-xs text-blue-600 hover:text-blue-500"
                >
                  Use member credentials
                </button>
              </div>

              {/* Partner School Account */}
              <div className="mb-4 p-3 bg-white rounded border">
                <h4 className="font-semibold text-sm text-gray-800 mb-2">🎓 Partner School</h4>
                <div className="text-xs font-mono text-gray-600 mb-2">
                  <div><strong>Email:</strong> purdue@tdil.com</div>
                  <div><strong>Password:</strong> school123</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ email: 'purdue@tdil.com', password: 'school123' });
                  }}
                  className="text-xs text-blue-600 hover:text-blue-500"
                >
                  Use school credentials
                </button>
              </div>

              {/* Sponsor Account */}
              <div className="p-3 bg-white rounded border">
                <h4 className="font-semibold text-sm text-gray-800 mb-2">🏢 Sponsor</h4>
                <div className="text-xs font-mono text-gray-600 mb-2">
                  <div><strong>Email:</strong> sponsor@tdil.com</div>
                  <div><strong>Password:</strong> sponsor123</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ email: 'sponsor@tdil.com', password: 'sponsor123' });
                  }}
                  className="text-xs text-blue-600 hover:text-blue-500"
                >
                  Use sponsor credentials
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
