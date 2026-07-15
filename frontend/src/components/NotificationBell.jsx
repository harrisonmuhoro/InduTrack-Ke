import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../axios';

// Relative-time helper shared by the dropdown items
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

const TYPE_ICONS = {
  broadcast: 'campaign',
  placement: 'work',
  logbook: 'menu_book',
  flag: 'flag',
  document: 'description',
  message: 'mail',
};

/**
 * Notification bell + dropdown wired to GET /notifications and POST /notifications/read.
 * `buttonClassName` lets each dashboard keep its existing header button styling.
 */
export default function NotificationBell({ buttonClassName = 'relative p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors' }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const unread = items.filter(n => !n.read_at).length;

  const load = useCallback(() => {
    setLoading(true);
    api.get('/notifications')
      .then(res => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read');
      setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    } catch { /* keep local state as-is on failure */ }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-surface rounded-xl border border-border shadow-lg z-[60] overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h4 className="text-body-md font-bold text-text-main">Notifications</h4>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-label-caps text-primary font-bold hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-border">
            {loading && items.length === 0 && (
              <p className="px-4 py-6 text-body-sm text-on-surface-variant text-center">Loading…</p>
            )}
            {!loading && items.length === 0 && (
              <p className="px-4 py-6 text-body-sm text-on-surface-variant text-center">No notifications yet.</p>
            )}
            {items.map(n => (
              <div key={n.id} className={`px-4 py-3 flex gap-3 items-start ${n.read_at ? '' : 'bg-primary-subtle/40'}`}>
                <div className="w-8 h-8 rounded-full bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">
                    {TYPE_ICONS[n.data?.type] || 'notifications'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-body-sm text-text-main leading-snug">{n.data?.message || n.data?.title || 'Notification'}</p>
                  <p className="text-label-caps text-on-surface-variant mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
