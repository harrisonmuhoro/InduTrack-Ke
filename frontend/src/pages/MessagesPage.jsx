import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../axios';
import { useAuth } from '../context/AuthContext';

export default function MessagesPage() {
  const { role, context, logout } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  // Just grabbing current user ID from token or making assumption. 
  // We don't have it directly in state without profile fetch, so we'll just rely on what the API returns.

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activePartnerId) {
      fetchMessages(activePartnerId);
    }
  }, [activePartnerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchMessages = async (partnerId) => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/messages/thread/${partnerId}`);
      setMessages(res.data);
      // Refresh conversations to update unread count
      fetchConversations();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activePartnerId) return;

    try {
      const res = await api.post('/messages', {
        receiver_id: activePartnerId,
        body: newMessage
      });
      setMessages([...messages, res.data]);
      setNewMessage('');
      fetchConversations(); // update latest message snippet
    } catch (err) {
      alert('Failed to send message');
    }
  };

  const handleGoBack = () => {
    if (role === 'student') navigate('/student');
    else if (role === 'company_supervisor') navigate('/company');
    else if (role === 'institution_supervisor') navigate('/supervisor');
    else if (role === 'institution_admin') navigate('/institution');
    else navigate(-1);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={handleGoBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <h1 className="text-xl font-bold text-[var(--color-primary-dark)]">Messages</h1>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Conversations List */}
        <div className="w-80 bg-white border-r border-[var(--color-border)] flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-bold text-gray-800">Recent Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? <p className="p-4 text-gray-500 text-sm">Loading...</p> : (
              conversations.map(conv => (
                <button
                  key={conv.partner_id}
                  onClick={() => setActivePartnerId(conv.partner_id)}
                  className={`w-full text-left p-4 border-b hover:bg-gray-50 transition flex items-center justify-between ${activePartnerId === conv.partner_id ? 'bg-blue-50' : ''}`}
                >
                  <div className="overflow-hidden">
                    <p className="font-semibold text-sm text-gray-900 truncate">{conv.partner_name}</p>
                    <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {conv.unread_count}
                    </span>
                  )}
                </button>
              ))
            )}
            {!loading && conversations.length === 0 && (
              <p className="p-4 text-gray-500 text-sm">No conversations yet.</p>
            )}
          </div>
        </div>

        {/* Main: Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {!activePartnerId ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a conversation to start messaging
            </div>
          ) : (
            <>
              <div className="p-4 bg-white border-b shadow-sm flex items-center justify-between">
                <h3 className="font-bold text-gray-800">
                  {conversations.find(c => c.partner_id === activePartnerId)?.partner_name || 'Chat'}
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingMessages ? <p className="text-gray-500 text-center">Loading messages...</p> : (
                  messages.map(msg => {
                    const isMine = msg.sender_id !== activePartnerId; // Approximate
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${isMine ? 'bg-[var(--color-primary)] text-white rounded-br-none' : 'bg-white border text-gray-800 rounded-bl-none'}`}>
                          {msg.body}
                          <div className={`text-[10px] mt-1 text-right ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-white border-t">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-[var(--color-primary)] text-sm"
                  />
                  <button type="submit" disabled={!newMessage.trim()} className="bg-[var(--color-primary)] text-white rounded-full px-6 py-2 text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50">
                    Send
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
