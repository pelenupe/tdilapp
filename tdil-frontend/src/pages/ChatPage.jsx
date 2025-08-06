import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import PointsService from '../services/pointsService';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineUsers] = useState(['John Smith', 'Sarah Johnson', 'Mike Chen', 'Emma Wilson']);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Mock initial messages
    const mockMessages = [
      {
        id: 1,
        user: 'John Smith',
        message: 'Hey everyone! Just wanted to share that I got a new job at Salesforce thanks to connections made through TDIL!',
        timestamp: new Date(Date.now() - 3600000),
        avatar: 'https://i.pravatar.cc/40?img=1'
      },
      {
        id: 2,
        user: 'Sarah Johnson',
        message: 'Congratulations John! That\'s amazing news 🎉',
        timestamp: new Date(Date.now() - 3500000),
        avatar: 'https://i.pravatar.cc/40?img=2'
      },
      {
        id: 3,
        user: 'Mike Chen',
        message: 'The networking event last week was incredible. Met so many great people!',
        timestamp: new Date(Date.now() - 3000000),
        avatar: 'https://i.pravatar.cc/40?img=3'
      },
      {
        id: 4,
        user: 'Emma Wilson',
        message: 'Has anyone tried the new mentorship program? I\'m thinking about signing up.',
        timestamp: new Date(Date.now() - 2500000),
        avatar: 'https://i.pravatar.cc/40?img=4'
      },
      {
        id: 5,
        user: 'John Smith',
        message: '@Emma Wilson I did the mentorship program last quarter and it was fantastic! Highly recommend it.',
        timestamp: new Date(Date.now() - 2000000),
        avatar: 'https://i.pravatar.cc/40?img=1'
      },
      {
        id: 6,
        user: 'Sarah Johnson',
        message: 'Quick reminder: Don\'t forget to check out the job board. Some great opportunities posted this week!',
        timestamp: new Date(Date.now() - 1500000),
        avatar: 'https://i.pravatar.cc/40?img=2'
      }
    ];

    setMessages(mockMessages);
    setLoading(false);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: messages.length + 1,
      user: 'You',
      message: newMessage.trim(),
      timestamp: new Date(),
      avatar: 'https://i.pravatar.cc/40?img=5',
      isCurrentUser: true
    };

    // Award points for sending a chat message
    PointsService.awardPoints('CHAT_MESSAGE', 'Sent a chat message');

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-4 mx-auto">
              tDIL
            </div>
            <div className="text-gray-600">Loading chat...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="ml-64 flex h-screen">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">TDIL Community Chat</h1>
                <p className="text-sm text-gray-500">{onlineUsers.length} members online</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                  📷 Video Call
                </button>
                <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                  🔍 Search
                </button>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.isCurrentUser ? 'flex-row-reverse' : ''}`}>
                <img
                  src={message.avatar}
                  alt={message.user}
                  className="w-10 h-10 rounded-full flex-shrink-0"
                />
                <div className={`flex-1 max-w-lg ${message.isCurrentUser ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{message.user}</span>
                    <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                  </div>
                  <div
                    className={`p-3 rounded-lg ${
                      message.isCurrentUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    {message.message}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Online Users Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Online Now ({onlineUsers.length})</h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {onlineUsers.map((user, index) => (
                <div key={user} className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={`https://i.pravatar.cc/32?img=${index + 1}`}
                      alt={user}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">{user}</div>
                    <div className="text-xs text-gray-500">Active now</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <button className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 text-left">
                📋 View Member Directory
              </button>
              <button className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 text-left">
                📅 Schedule Group Meeting
              </button>
              <button className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 text-left">
                🔔 Notification Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
