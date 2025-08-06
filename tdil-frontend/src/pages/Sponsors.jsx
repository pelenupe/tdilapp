import Sidebar from '../components/Sidebar';

export default function Sponsors() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Sponsors</h1>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <p className="text-gray-600 mb-6">
              We're grateful for the support of our sponsors who help make tDIL possible.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">🏢</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Tech Corp</h3>
                <p className="text-sm text-gray-600 mb-4">Premier Technology Solutions</p>
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  Platinum Sponsor
                </span>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">💼</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Innovation Inc</h3>
                <p className="text-sm text-gray-600 mb-4">Leading Innovation Partner</p>
                <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                  Gold Sponsor
                </span>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">🚀</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">StartupHub</h3>
                <p className="text-sm text-gray-600 mb-4">Entrepreneurship Support</p>
                <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                  Silver Sponsor
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Become a Sponsor</h2>
            <p className="text-gray-600 mb-4">
              Join our community of sponsors and help support the next generation of tech professionals.
            </p>
            <button className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
