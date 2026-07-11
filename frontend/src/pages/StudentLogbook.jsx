import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, Book, FolderOpen, Zap, Star, LogOut, Lock } from 'lucide-react';
import api from '../axios';

const Sidebar = ({ active }) => {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };
  const items = [
    { to: '/student', label: <><Home size={18} /> Find Slots</> },
    { to: '/student/applications', label: <><ClipboardList size={18} /> My Applications</> },
    { to: '/student/logbook', label: <><Book size={18} /> Logbook</> },
    { to: '/student/documents', label: <><FolderOpen size={18} /> Documents</> },
    { to: '/student/match', label: <><Zap size={18} /> Smart Match</> },
    { to: '/student/evaluation', label: <><Star size={18} /> Rate Company</> },
  ];
  return (
    <div className="w-64 bg-[var(--color-primary-dark)] text-white p-6 flex flex-col flex-shrink-0">
      <h1 className="text-xl font-bold mb-8">InduTrack KE</h1>
      <nav className="flex-1 space-y-1">
        {items.map(item => (
          <Link key={item.to} to={item.to} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${active === item.to ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-primary)] text-white/90'}`}>{item.label}</Link>
        ))}
      </nav>
      <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left px-4 py-2 rounded-lg text-red-300 hover:bg-red-500/20 mt-4 text-sm transition"><LogOut size={18} /> Logout</button>
    </div>
  );
};

export default function StudentLogbook() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ week_number: '', entry_date: '', activities: '', lessons_learned: '', challenges: '', plan_next_week: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/logbooks')
      .then(res => setLogs(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/logbooks', form);
      const res = await api.get('/logbooks');
      setLogs(res.data);
      setForm({ week_number: '', entry_date: '', activities: '', lessons_learned: '', challenges: '', plan_next_week: '' });
      alert('Logbook entry submitted successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex">
      <Sidebar active="/student/logbook" />
      <div className="flex-1 flex gap-0">
        {/* Entry Form */}
        <div className="w-96 flex-shrink-0 p-6 border-r border-[var(--color-border)] overflow-y-auto">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">New Entry</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Week #</label>
                <input type="number" min="1" className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm" value={form.week_number} onChange={e => setForm({...form, week_number: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Date</label>
                <input type="date" className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm" value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Activities</label>
              <textarea className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 h-24 text-sm resize-none" value={form.activities} onChange={e => setForm({...form, activities: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Lessons Learned</label>
              <textarea className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 h-20 text-sm resize-none" value={form.lessons_learned} onChange={e => setForm({...form, lessons_learned: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Challenges</label>
              <textarea className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 h-20 text-sm resize-none" value={form.challenges} onChange={e => setForm({...form, challenges: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Plan for Next Week</label>
              <textarea className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 h-20 text-sm resize-none" value={form.plan_next_week} onChange={e => setForm({...form, plan_next_week: e.target.value})} />
            </div>
            <button type="submit" disabled={submitting} className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white py-2 rounded-lg font-medium text-sm transition disabled:opacity-60">
              {submitting ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        </div>

        {/* Logbook History */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-primary-dark)]">Student Portal</h2>
          <div className="text-sm font-medium text-[var(--color-text-secondary)]">{localStorage.getItem('context')}</div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Logbook History</h2>
          {loading && <p className="text-[var(--color-text-secondary)]">Loading...</p>}
          <div className="space-y-4">
            {logs.map(log => (
              <div key={log.id} className={`p-5 rounded-xl border shadow-sm ${log.is_editable ? 'bg-[var(--color-surface)] border-[var(--color-border)]' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between mb-3 items-center">
                  <span className="font-bold text-[var(--color-primary)]">Week {log.week_number}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--color-text-secondary)]">{log.entry_date}</span>
                    {!log.is_editable && (
                      <span className="inline-flex items-center gap-1 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                        <Lock size={12} /> Locked
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <p className="text-[var(--color-text-primary)]"><strong>Activities:</strong> {log.activities}</p>
                  {log.lessons_learned && <p className="text-[var(--color-text-secondary)]"><strong>Lessons:</strong> {log.lessons_learned}</p>}
                  {log.challenges && <p className="text-[var(--color-text-secondary)]"><strong>Challenges:</strong> {log.challenges}</p>}
                  {log.plan_next_week && <p className="text-[var(--color-text-secondary)]"><strong>Plan for next week:</strong> {log.plan_next_week}</p>}
                </div>

                {log.comments?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                    <p className="text-xs font-bold text-[var(--color-text-secondary)] mb-2">SUPERVISOR COMMENTS</p>
                    {log.comments.map(c => (
                      <div key={c.id} className="bg-blue-50 px-3 py-2 rounded-lg text-sm mb-2">
                        <span className="font-medium text-blue-800">{c.user?.name}:</span> {c.comment}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!loading && logs.length === 0 && (
              <p className="text-[var(--color-text-secondary)]">No entries yet. Fill your first logbook entry!</p>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
