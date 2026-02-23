import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import API from '../services/api';

export default function GroupChats() {
  const { user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChats();
  }, []);

  // Handle pre-selected chat from navigation state
  useEffect(() => {
    if (location.state?.selectedChatId && chats.length > 0 && !selectedChat) {
      const chatToSelect = chats.find(c => c.id === location.state.selectedChatId || c.chatId === location.state.selectedChatId);
      if (chatToSelect) {
        setSelectedChat(chatToSelect);
      }
    }
  }, [location.state?.selectedChatId, chats.length]); // Run when chats are loaded

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await API.get('/chats');
      setChats(response.data);
      
      // Only auto-select first chat if no chat is selected AND no specific chat requested
      if (response.data.length > 0 && !selectedChat && !location.state?.selectedChatId) {
        setSelectedChat(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const response = await API.get(`/chats/${chatId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const messageContent = newMessage;
    setNewMessage(''); // Clear immediately for better UX

    try {
      setSending(true);
      const response = await API.post(`/chats/${selectedChat.id}/messages`, {
        content: messageContent,
        messageType: 'text'
      });
      
      // Add message with proper fields
      setMessages([...messages, {
        ...response.data,
        firstname: user.firstName,
        lastname: user.lastName
      }]);
      
      // Update chat list to show latest message WITHOUT changing selection
      setChats(prevChats => prevChats.map(chat => 
        chat.id === selectedChat.id 
          ? { ...chat, last_message: messageContent, last_message_at: new Date().toISOString() }
          : chat
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent); // Restore message on error
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getChatName = (chat) => {
    if (chat.name) return chat.name;
    if (chat.chat_type === 'cohort') return 'Cohort Chat';
    if (chat.chat_type === 'direct') return 'Direct Message';
    return 'Group Chat';
  };

  const getChatIcon = (chat) => {
    if (chat.chat_type === 'cohort') return '🎓';
    if (chat.chat_type === 'direct') return '💬';
    return '👥';
  };

  if (loading) {
    return (
      <PageLayout userType={user?.userType} title="Chats" subtitle="Loading...">
        <div className="text-center py-12">Loading chats...</div>
      </PageLayout>
    );
  }

  if (chats.length === 0) {
    return (
      <PageLayout userType={user?.userType} title="Chats" subtitle="No chats yet">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Chats Yet</h2>
          <p className="text-gray-600 mb-6">
            Join a cohort or connect with members to start chatting
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout userType={user?.userType} title="Chats" subtitle="Connect with your network">
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="grid grid-cols-12 h-full">
          {/* Chat List Sidebar */}
          <div className="col-span-12 md:col-span-4 border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Your Chats</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{getChatIcon(chat)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900 truncate">{getChatName(chat)}</h4>
                        {chat.unread_count > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{chat.last_message || 'No messages yet'}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">
                          {chat.member_count} members
                        </span>
                        {chat.last_message_at && (
                          <span className="text-xs text-gray-400">
                            {new Date(chat.last_message_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Messages Area */}
          <div className="col-span-12 md:col-span-8 flex flex-col h-full">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span>{getChatIcon(selectedChat)}</span>
                        {getChatName(selectedChat)}
                      </h3>
                      <p className="text-sm text-gray-500">{selectedChat.member_count} members</p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      ℹ️
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-12">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwnMessage = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex items-start gap-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                            {!isOwnMessage && (
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                                {message.firstname?.[0]}{message.lastname?.[0]}
                              </div>
                            )}
                            <div>
                              {!isOwnMessage && (
                                <p 
                                  className="text-xs text-blue-600 hover:text-blue-800 mb-1 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/profile/${message.sender_id}`);
                                  }}
                                >
                                  {message.firstname} {message.lastname}
                                </p>
                              )}
                              <div
                                className={`px-4 py-2 rounded-lg ${
                                  isOwnMessage
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                {message.message_type === 'event' ? (
                                  <div className="flex items-center gap-2">
                                    <span>📅</span>
                                    <span>{message.content}</span>
                                  </div>
                                ) : (
                                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                )}
                              </div>
                              <p className={`text-xs text-gray-400 mt-1 ${isOwnMessage ? 'text-right' : ''}`}>
                                {message.created_at && !isNaN(new Date(message.created_at + ' UTC').getTime()) 
                                  ? new Date(message.created_at + ' UTC').toLocaleTimeString([], { 
                                      hour: '2-digit', 
                                      minute: '2-digit',
                                      timeZone: 'America/New_York'
                                    })
                                  : 'Just now'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {sending ? '...' : 'Send'}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <p>Select a chat to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
