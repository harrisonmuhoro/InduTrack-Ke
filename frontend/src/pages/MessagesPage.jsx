import { useState, useEffect, useRef } from 'react';
import api from '../axios';
import { useAuth } from '../context/AuthContext';
import AppShell, { portalFromRole } from '../components/AppShell';

export default function MessagesPage() {
  const { role } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
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

  return (
    <AppShell portal={portalFromRole(role)} pad={false}>
      <div className="flex h-full min-h-0">
        <div className="w-72 shrink-0 bg-[var(--sheet)] border-r border-[var(--rule)] flex flex-col">
          <div className="p-4 border-b border-[var(--rule)]">
            <p className="page-kicker">Mail</p>
            <h2 className="font-display text-xl">Threads</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? <p className="p-4 text-[var(--ink-soft)] text-sm">Loading…</p> : (
              conversations.map(conv => (
                <button
                  key={conv.partner_id}
                  type="button"
                  onClick={() => setActivePartnerId(conv.partner_id)}
                  className={`w-full text-left p-4 border-b border-[var(--rule)] flex items-center justify-between ${activePartnerId === conv.partner_id ? 'bg-[rgba(184,92,56,0.08)]' : ''}`}
                >
                  <div className="overflow-hidden">
                    <p className="font-semibold text-sm truncate">{conv.partner_name}</p>
                    <p className="text-xs text-[var(--ink-soft)] truncate">{conv.last_message}</p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="bg-[var(--stamp)] text-white text-[10px] font-bold px-2 py-0.5">
                      {conv.unread_count}
                    </span>
                  )}
                </button>
              ))
            )}
            {!loading && conversations.length === 0 && (
              <p className="p-4 text-[var(--ink-soft)] text-sm">No conversations yet.</p>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {!activePartnerId ? (
            <div className="flex-1 flex items-center justify-center text-[var(--ink-soft)] px-6 text-center">
              Pick a thread. Keep it short — like a note left on a desk.
            </div>
          ) : (
            <>
              <div className="p-4 bg-[var(--sheet)] border-b border-[var(--rule)]">
                <h3 className="font-display text-xl">
                  {conversations.find(c => c.partner_id === activePartnerId)?.partner_name || 'Chat'}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {loadingMessages ? <p className="text-[var(--ink-soft)] text-center">Loading…</p> : (
                  messages.map(msg => {
                    const isMine = msg.sender_id !== activePartnerId;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-3 py-2 text-sm ${isMine ? 'bg-[var(--forest)] text-[#f7f1e6]' : 'sheet'}`}>
                          {msg.body}
                          <div className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-[var(--ink-soft)]'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 bg-[var(--sheet)] border-t border-[var(--rule)]">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Write a note…"
                    className="input flex-1"
                  />
                  <button type="submit" disabled={!newMessage.trim()} className="btn btn-primary">
                    Send
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
