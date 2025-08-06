import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { navigationItems } from '../config/navigation';

export default function Sidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const teamMembers = [
    { id: 1, name: 'John', avatar: 'https://i.pravatar.cc/32?img=1' },
    { id: 2, name: 'Sarah', avatar: 'https://i.pravatar.cc/32?img=2' },
    { id: 3, name: 'Mike', avatar: 'https://i.pravatar.cc/32?img=3' },
    { id: 4, name: 'Emma', avatar: 'https://i.pravatar.cc/32?img=4' }
  ];

  return (
    <div className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
            tDIL
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-gray-900">tDIL</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-2">
          {navigationItems.map((item, index) => (
            <li key={`${item.href}-${index}`}>
              <Link
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.href
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Your Team Section */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 mt-auto">
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              YOUR TEAM
            </h3>
          </div>
          <div className="flex items-center gap-2 mb-3">
            {teamMembers.map((member) => (
              <img
                key={member.id}
                src={member.avatar}
                alt={member.name}
                className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
              />
            ))}
            <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
              +
            </button>
          </div>
          <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
            💬 Team Chat
          </button>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 shadow-sm"
      >
        <span className={`text-xs transition-transform ${isCollapsed ? 'rotate-180' : ''}`}>
          ◀
        </span>
      </button>
    </div>
  );
}
