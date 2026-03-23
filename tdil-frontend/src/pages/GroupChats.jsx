import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import API from '../services/api';
import { Flag, Plus, Compass, X, ShieldAlert, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import { slugify } from '../utils/slugify';

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
  const [showDiscover, setShowDiscover] = useState(false);
  const [discoverChats, setDiscoverChats] = useState([]);
  const [joiningChat, setJoiningChat] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  // New Direct Message
  const [showNewDM, setShowNewDM] = useState(false);
  const [dmSearch, setDmSearch] = useState('');
  const [dmMembers, setDmMembers] = useState([]);
  const [dmLoading, setDmLoading] = useState(false);
  const [startingDM, setStartingDM] = useState(null);
  const [flaggingId, setFlaggingId] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagConfirm, setFlagConfirm] = useState(null); // message object
  const [adminFlags, setAdminFlags] = useState([]);
  const [showAdminFlags, setShowAdminFlags] = useState(false);
  const [notification, setNotification] = useState(null);
  const messagesEndRef = useRef(null);

  const isAdmin = ['admin', 'founder'].includes(user?.userType);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => { fetchChats(); }, []);

  useEffect(() => {
    if (location.state?.selectedChatId && chats.length > 0 && !selectedChat) {
      const c = chats.find(c => c.id === location.state.selectedChatId || c.chatId === location.state.selectedChatId);
      if (c) setSelectedChat(c);
    }
  }, [location.state?.selectedChatId, chats.length]);

  useEffect(() => {
    if (selectedChat) fetchMessages(selectedChat.id);
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMembers = async (q) => {
    if (!q.trim()) { setDmMembers([]); return; }
    setDmLoading(true);
    try {
      const r = await API.get('/members');
      const all = r.data || [];
      const filtered = all.filter(m =>
        m.id !== user?.id &&
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 10);
      setDmMembers(filtered);
    } catch (_) {}
    setDmLoading(false);
  };

  const startDM = async (memberId) => {
    setStartingDM(memberId);
    try {
      const r = await API.post('/chats/direct', { otherUserId: memberId });
      const chatId = r.data?.id || r.data?.chatId;
      setShowNewDM(false);
      setDmSearch('');
      setDmMembers([]);
      await fetchChats();
      // Find the chat and select it
      setChats(prev => {
        const found = prev.find(c => c.id === chatId || c.chatId === chatId);
        if (found) setSelectedChat(found);
        return prev;
      });
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to open chat', 'error');
    } finally {
      setStartingDM(null);
    }
  };

  const fetchChats = async () => {
    try {
      setLoading(true);
      const r = await API.get('/chats');
      setChats(r.data);
      if (r.data.length > 0 && !selectedChat && !location.state?.selectedChatId) {
        setSelectedChat(r.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const r = await API.get(`/chats/${chatId}/messages`);
      setMessages(r.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDiscoverChats = async () => {
    try {
      const r = await API.get('/chats/discover');
      setDiscoverChats(r.data);
    } catch (err) {
      console.error(err);
    }
  };

  const searchMembers = async (q) => {
    if (!q.trim()) { setMemberResults([]); return; }
    setSearchingMembers(true);
    try {
      const r = await API.get('/members');
      const all = r.data || [];
      setMemberResults(all.filter(m =>
        m.id !== user?.id &&
        !selectedMembers.find(s => s.id === m.id) &&
        `${m.firstName} ${m.lastName} ${m.company || ''}`.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 8));
    } catch (_) {}
    setSearchingMembers(false);
  };

  const fetchAdminFlags = async () => {
    try {
      const r = await API.get('/chats/admin/flags');
      setAdminFlags(r.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    const content = newMessage;
    setNewMessage('');
    try {
      setSending(true);
      const r = await API.post(`/chats/${selectedChat.id}/messages`, { content, messageType: 'text' });
      setMessages(prev => [...prev, { ...r.data, firstname: user.firstName, lastname: user.lastName }]);
      setChats(prev => prev.map(c =>
        c.id === selectedChat.id ? { ...c, last_message: content, last_message_at: new Date().toISOString() } : c
      ));
    } catch (err) {
      console.error(err);
      setNewMessage(content);
      notify('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleJoinChat = async (chatId) => {
    setJoiningChat(chatId);
    try {
      await API.post(`/chats/${chatId}/join`);
      notify('Joined group successfully! 🎉');
      setShowDiscover(false);
      await fetchChats();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to join group', 'error');
    } finally {
      setJoiningChat(null);
    }
  };

  const handleFlagMessage = async () => {
    if (!flagConfirm) return;
    setFlaggingId(flagConfirm.id);
    try {
      await API.post(`/chats/${selectedChat.id}/messages/${flagConfirm.id}/flag`, { reason: flagReason });
      notify('Message flagged for review. Thanks! 🚩');
      setFlagConfirm(null);
      setFlagReason('');
    } catch (err) {
      notify(err.response?.data?.message || 'Could not flag message', 'error');
    } finally {
      setFlaggingId(null);
    }
  };

  const handleReviewFlag = async (flagId, action) => {
    try {
      await API.patch(`/chats/admin/flags/${flagId}`, { action });
      notify(action === 'delete' ? 'Message deleted ✅' : 'Flag dismissed ✅');
      await fetchAdminFlags();
    } catch (err) {
      notify('Action failed', 'error');
    }
  };

  const handleAdminDeleteMessage = async (msgId, chatId) => {
    if (!window.confirm('Remove this message?')) return;
    try {
      await API.delete(`/chats/${chatId}/messages/${msgId}/admin`);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      notify('Message removed ✅');
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to remove message', 'error');
    }
  };

  const getChatIcon = (chat) => {
    if (chat.chat_type === 'staff')  return '🛡️';
    if (chat.chat_type === 'cohort') return '🎓';
    if (chat.chat_type === 'direct') return '💬';
    return '👥';
  };

  const getChatName = (chat) => {
    if (chat.name) return chat.name;
    if (chat.chat_type === 'cohort') return 'Cohort Chat';
    if (chat.chat_type === 'direct') return 'Direct Message';
    return 'Group Chat';
  };

  const getChatBadgeColor = (chat) => {
    if (chat.chat_type === 'staff')  return 'bg-purple-100 text-purple-700 border-purple-200';
    if (chat.chat_type === 'cohort') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (chat.chat_type === 'direct') return 'bg-gray-100 text-gray-600 border-gray-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  if (loading) {
    return (
      <PageLayout userType={user?.userType} title="Chats" subtitle="Loading…">
        <div className="text-center py-12 text-gray-500">Loading chats…</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      userType={user?.userType}
      title="Chats"
      subtitle="Connect with your network"
      headerActions={
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => { setShowAdminFlags(!showAdminFlags); if (!showAdminFlags) fetchAdminFlags(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                showAdminFlags ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ShieldAlert size={14} /> Flagged {adminFlags.filter(f => f.status === 'pending').length > 0 && `(${adminFlags.filter(f => f.status === 'pending').length})`}
            </button>
          )}
          <button
            onClick={() => { setShowDiscover(!showDiscover); if (!showDiscover) fetchDiscoverChats(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              showDiscover ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
          <Compass size={14} /> Discover Groups
        </button>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} /> New Group
        </button>
      </div>
    }
    >
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${
          notification.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {notification.msg}
        </div>
      )}

      {/* Create Group Chat Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus size={16} className="text-blue-600" /> Create Group Chat
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Group Name *</label>
                <input type="text" value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Alumni Networking, Study Group…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
                <input type="text" value={createForm.description}
                  onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What's this group about?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              {/* Member search */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Add Members — members, schools, employers, sponsors (optional)</label>
                <div className="relative">
                  <input type="text" value={memberSearch}
                    onChange={e => { setMemberSearch(e.target.value); searchMembers(e.target.value); }}
                    placeholder="Search by name or company…"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  {(memberResults.length > 0 || searchingMembers) && (
                    <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {searchingMembers ? (
                        <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
                      ) : memberResults.map(m => (
                        <button type="button" key={m.id}
                          onClick={() => { setSelectedMembers(p => [...p, m]); setMemberResults([]); setMemberSearch(''); }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left text-xs">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">
                            {m.firstName?.[0]}{m.lastName?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{m.firstName} {m.lastName}</div>
                            <div className="text-gray-400 truncate">{m.company ? `${m.company} · ` : ''}{m.userType}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedMembers.map(m => (
                      <span key={m.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {m.firstName} {m.lastName}
                        <button type="button" onClick={() => setSelectedMembers(p => p.filter(x => x.id !== m.id))} className="hover:text-red-500 ml-0.5 font-bold">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => { setShowCreateModal(false); setCreateForm({ name: '', description: '' }); setSelectedMembers([]); setMemberSearch(''); setMemberResults([]); }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button
                  onClick={async () => {
                    if (!createForm.name.trim()) return;
                    setCreating(true);
                    try {
                      const r = await API.post('/chats', {
                        name: createForm.name.trim(),
                        description: createForm.description.trim() || undefined,
                        memberIds: selectedMembers.map(m => m.id)
                      });
                      notify(`Group "${createForm.name.trim()}" created! 🎉`);
                      setShowCreateModal(false);
                      setCreateForm({ name: '', description: '' });
                      setSelectedMembers([]);
                      setMemberSearch('');
                      setMemberResults([]);
                      await fetchChats();
                    } catch (err) {
                      notify(err.response?.data?.message || 'Failed to create group', 'error');
                    } finally {
                      setCreating(false);
                    }
                  }}
                  disabled={creating || !createForm.name.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                  {creating ? 'Creating…' : `Create${selectedMembers.length > 0 ? ` (+${selectedMembers.length} members)` : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flag reason modal */}
      {flagConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2"><Flag size={16} className="text-red-500" /> Flag Message</h3>
            <p className="text-sm text-gray-500 mb-3">
              "{flagConfirm.content?.slice(0, 100)}{flagConfirm.content?.length > 100 ? '…' : ''}"
            </p>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason (optional)</label>
            <textarea
              value={flagReason}
              onChange={e => setFlagReason(e.target.value)}
              rows={2}
              placeholder="Describe the issue…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 resize-none mb-3"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setFlagConfirm(null); setFlagReason(''); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleFlagMessage} disabled={!!flaggingId}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {flaggingId ? 'Flagging…' : '🚩 Flag this message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin flagged messages panel */}
      {showAdminFlags && isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b bg-red-50">
            <h3 className="font-semibold text-red-800 text-sm flex items-center gap-2"><ShieldAlert size={15} /> Flagged Messages</h3>
            <button onClick={() => setShowAdminFlags(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          {adminFlags.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6 italic">No pending flags. ✅</p>
          ) : (
            <div className="divide-y max-h-64 overflow-y-auto">
              {adminFlags.map(flag => (
                <div key={flag.id} className="p-4 flex gap-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">{flag.chat_name || 'Unknown chat'} · by {flag.sender_name}</p>
                    <p className="text-sm text-gray-800 bg-red-50 p-2 rounded text-xs border border-red-100 mb-1">
                      "{flag.message_content?.slice(0, 150)}{flag.message_content?.length > 150 ? '…' : ''}"
                    </p>
                    {flag.reason && <p className="text-xs text-gray-500">Reason: {flag.reason}</p>}
                    <p className="text-xs text-gray-400">Reported by {flag.reporter_first} {flag.reporter_last} · {new Date(flag.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => handleReviewFlag(flag.id, 'delete')}
                      className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700">
                      <Trash2 size={11} /> Delete
                    </button>
                    <button onClick={() => handleReviewFlag(flag.id, 'dismiss')}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300">
                      <CheckCircle size={11} /> Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discover groups panel */}
      {showDiscover && (
        <div className="bg-white rounded-xl shadow-sm border mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b bg-blue-50">
            <h3 className="font-semibold text-blue-800 text-sm flex items-center gap-2"><Compass size={15} /> Discover Groups to Join</h3>
            <button onClick={() => setShowDiscover(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          {discoverChats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6 italic">You're already in all available groups! 🎉</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 max-h-72 overflow-y-auto">
              {discoverChats.map(chat => (
                <div key={chat.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl">{getChatIcon(chat)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{getChatName(chat)}</p>
                      <p className="text-xs text-gray-400">{chat.member_count} members · {chat.chat_type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinChat(chat.id)}
                    disabled={joiningChat === chat.id}
                    className="ml-2 flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
                  >
                    <Plus size={12} /> {joiningChat === chat.id ? 'Joining…' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Main chat interface ── */}
      {chats.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Chats Yet</h2>
          <p className="text-gray-500 text-sm mb-4">Join a cohort or discover groups to start chatting</p>
          <button onClick={() => { setShowDiscover(true); fetchDiscoverChats(); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Discover Groups
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
          <div className="grid grid-cols-12 h-full">

            {/* ── Chat List ── */}
            <div className="col-span-12 md:col-span-4 border-r border-gray-200 overflow-y-auto flex flex-col">
              <div className="p-3 border-b bg-gray-50 flex-shrink-0 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Chats</p>
                  <button
                    onClick={() => { setShowNewDM(!showNewDM); setDmSearch(''); setDmMembers([]); }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    title="Start new direct message"
                  >
                    + New DM
                  </button>
                </div>
                {showNewDM && (
                  <div className="relative">
                    <input
                      type="text"
                      value={dmSearch}
                      onChange={e => { setDmSearch(e.target.value); fetchMembers(e.target.value); }}
                      placeholder="Search member to message…"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    {(dmMembers.length > 0 || dmLoading) && (
                      <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {dmLoading ? (
                          <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
                        ) : dmMembers.map(m => (
                          <button
                            key={m.id}
                            onClick={() => startDM(m.id)}
                            disabled={startingDM === m.id}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left text-xs"
                          >
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">
                              {m.firstName?.[0]}{m.lastName?.[0]}
                            </div>
                            <span className="font-medium text-gray-900">{m.firstName} {m.lastName}</span>
                            {m.jobTitle && <span className="text-gray-400 truncate">{m.jobTitle}</span>}
                            {startingDM === m.id && <span className="ml-auto text-gray-400">…</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
                {chats.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl mt-0.5 flex-shrink-0">{getChatIcon(chat)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{getChatName(chat)}</h4>
                          {chat.chat_type === 'staff' && (
                            <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">Staff</span>
                          )}
                          {chat.unread_count > 0 && (
                            <span className="ml-auto px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">{chat.unread_count}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{chat.last_message || 'No messages yet'}</p>
                        <p className="text-xs text-gray-300 mt-0.5">{chat.member_count} members</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="col-span-12 md:col-span-8 flex flex-col h-full">
              {selectedChat ? (
                <>
                  {/* Chat Header */}
                  <div className="px-4 py-3 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getChatIcon(selectedChat)}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{getChatName(selectedChat)}</h3>
                          <p className="text-xs text-gray-400">{selectedChat.member_count} members</p>
                        </div>
                        {selectedChat.chat_type === 'staff' && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium border border-purple-200">
                            🛡 Staff Only
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-400 py-12 text-sm">No messages yet. Start the conversation!</div>
                    ) : (
                      messages.map(msg => {
                        const isOwn = msg.sender_id === user?.id;
                        const isSystem = msg.message_type === 'system';

                        if (isSystem) {
                          return (
                            <div key={msg.id} className="text-center">
                              <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full border">{msg.content}</span>
                            </div>
                          );
                        }

                        return (
                          <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                            <div className={`flex items-start gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                              {!isOwn && (
                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0 mt-0.5">
                                  {msg.firstname?.[0]}{msg.lastname?.[0]}
                                </div>
                              )}
                              <div>
                                {!isOwn && (
                                  <p className="text-xs text-blue-600 hover:text-blue-800 mb-1 cursor-pointer"
                                    onClick={() => navigate(`/profile/${msg.sender_id}`)}>
                                    {msg.firstname} {msg.lastname}
                                  </p>
                                )}
                                <div className={`relative px-3 py-2 rounded-lg text-sm ${
                                  isOwn ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-200'
                                }`}>
                                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                  {/* Non-admin: flag button on others' messages */}
                                  {!isOwn && !isAdmin && (
                                    <button
                                      onClick={() => setFlagConfirm(msg)}
                                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 transition-all shadow-sm"
                                      title="Flag this message"
                                    >
                                      <Flag size={10} />
                                    </button>
                                  )}
                                  {/* Admin: BOTH flag and delete on non-own messages; just delete on own messages */}
                                  {isAdmin && !isOwn && (
                                    <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 flex gap-0.5 transition-all">
                                      <button
                                        onClick={() => setFlagConfirm(msg)}
                                        className="w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-orange-500 hover:border-orange-300 shadow-sm"
                                        title="Flag message"
                                      >
                                        <Flag size={9} />
                                      </button>
                                      <button
                                        onClick={() => handleAdminDeleteMessage(msg.id, selectedChat.id)}
                                        className="w-5 h-5 bg-white border border-red-200 rounded-full flex items-center justify-center text-red-400 hover:text-red-600 hover:border-red-400 shadow-sm"
                                        title="Delete message"
                                      >
                                        <Trash2 size={9} />
                                      </button>
                                    </div>
                                  )}
                                  {isAdmin && isOwn && (
                                    <button
                                      onClick={() => handleAdminDeleteMessage(msg.id, selectedChat.id)}
                                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 w-5 h-5 bg-white border border-red-200 rounded-full flex items-center justify-center text-red-400 hover:text-red-600 hover:border-red-400 transition-all shadow-sm"
                                      title="Delete own message"
                                    >
                                      <Trash2 size={9} />
                                    </button>
                                  )}
                                </div>
                                <p className={`text-xs text-gray-400 mt-0.5 ${isOwn ? 'text-right' : ''}`}>
                                  {msg.created_at
                                    ? new Date(msg.created_at + (msg.created_at.endsWith('Z') ? '' : ' UTC')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : 'Just now'}
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
                  <div className="p-3 border-t bg-white flex-shrink-0">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder={`Message ${getChatName(selectedChat)}…`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {sending ? '…' : 'Send'}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <div className="text-5xl mb-3">💬</div>
                    <p className="text-sm">Select a chat to start messaging</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </PageLayout>
  );
}
