import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, Book, MessageSquare } from 'lucide-react';
import api from '../axios';

export default function SupervisorDashboard() {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlacement, setSelectedPlacement] = useState(null);
  const [comment, setComment] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/supervisors/students')
      .then(res => setPlacements(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const openLogbook = async (placementId) => {
    const res = await api.get(`/supervisors/placements/${placementId}/logbook`);
    setSelectedPlacement(res.data);
  };

  const submitComment = async (entryId) => {
    if (!comment.trim()) return;
    await api.post(`/logbooks/${entryId}/comments`, { comment });
    setComment('');
    // Refresh placement
    openLogbook(selectedPlacement.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex">
      <div className="w-64 bg-[var(--color-primary-dark)] text-white p-6 flex flex-col flex-shrink-0">
        <h1 className="text-xl font-bold mb-8">Supervisor Portal</h1>
        <nav className="flex-1 space-y-1">
          <Link to="/supervisor" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm">
            <GraduationCap size={18} /> My Students
          </Link>
          <Link to="/messages" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90 text-sm">
            <MessageSquare size={18} /> Messages
          </Link>
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left px-4 py-2 rounded-lg text-red-300 hover:bg-red-500/20 mt-4 text-sm transition">
          <LogOut size={18} /> Logout
        </button>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-primary-dark)]">Supervisor Portal</h2>
          <div className="text-sm font-medium text-[var(--color-text-secondary)]">{localStorage.getItem('context')}</div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Students list */}
          <div className="w-96 p-6 border-r border-[var(--color-border)] overflow-y-auto">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Assigned Students</h2>
            {loading && <p className="text-[var(--color-text-secondary)]">Loading...</p>}
            <div className="space-y-3">
              {placements.map(p => (
                <button key={p.id} onClick={() => openLogbook(p.id)} className={`w-full text-left p-4 rounded-xl border transition ${selectedPlacement?.id === p.id ? 'border-[var(--color-primary)] bg-green-50' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary-light)]'}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center text-white font-bold">
                      {p.student?.user?.name?.charAt(0) ?? 'S'}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[var(--color-text-primary)]">{p.student?.user?.name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{p.student?.reg_number}</p>
                      <span className="inline-block mt-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{p.status}</span>
                    </div>
                  </div>
                </button>
              ))}
              {!loading && placements.length === 0 && (
                <p className="text-[var(--color-text-secondary)]">No students assigned yet.</p>
              )}
            </div>
          </div>

          {/* Logbook view */}
          <div className="flex-1 p-6 overflow-y-auto">
            {!selectedPlacement ? (
              <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
                Select a student to view their logbook.
              </div>
            ) : (
              <>
              <h3 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text-primary)] mb-4">
                <Book size={24} /> Logbook — {selectedPlacement.student?.user?.name}
              </h3>
              <div className="space-y-4">
                {selectedPlacement.logbook_entries?.map(entry => (
                  <div key={entry.id} className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)]">
                    <div className="flex justify-between mb-2">
                      <span className="font-bold text-[var(--color-primary)]">Week {entry.week_number}</span>
                      <span className="text-sm text-[var(--color-text-secondary)]">{entry.entry_date}</span>
                    </div>
                    <p className="text-[var(--color-text-primary)] mb-1"><strong>Activities:</strong> {entry.activities}</p>
                    {entry.lessons_learned && <p className="text-[var(--color-text-secondary)] text-sm"><strong>Lessons:</strong> {entry.lessons_learned}</p>}
                    
                    {/* Comments */}
                    {entry.comments?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-2">
                        {entry.comments.map(c => (
                          <div key={c.id} className="bg-blue-50 px-3 py-2 rounded-lg text-sm">
                            <span className="font-medium">{c.user?.name}:</span> {c.comment}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add Comment */}
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        className="flex-1 border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm"
                        placeholder="Add a comment..."
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                      />
                      <button onClick={() => submitComment(entry.id)} className="bg-[var(--color-primary)] text-white px-3 py-1.5 rounded-lg text-sm">Send</button>
                    </div>
                  </div>
                ))}
                {selectedPlacement.logbook_entries?.length === 0 && (
                  <p className="text-[var(--color-text-secondary)]">No logbook entries yet.</p>
                )}
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
