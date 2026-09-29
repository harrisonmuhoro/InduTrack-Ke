import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import api from '../axios';
import AppShell, { Stamp } from '../components/AppShell';

export default function SupervisorDashboard() {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlacement, setSelectedPlacement] = useState(null);
  const [comment, setComment] = useState('');

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
    openLogbook(selectedPlacement.id);
  };

  return (
    <AppShell portal="supervisor" pad={false}>
      <div className="flex flex-col lg:flex-row h-full min-h-0">
        <div className="lg:w-[22rem] shrink-0 p-5 border-b lg:border-b-0 lg:border-r border-[var(--rule)] overflow-y-auto bg-[var(--sheet)]">
          <p className="page-kicker">Cohort</p>
          <h2 className="font-display text-2xl mb-4">Assigned students</h2>
          {loading && <p className="text-[var(--ink-soft)] text-sm">Loading…</p>}
          <div className="space-y-2">
            {placements.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => openLogbook(p.id)}
                className={`w-full text-left p-3 border transition ${
                  selectedPlacement?.id === p.id
                    ? 'border-[var(--copper)] bg-[rgba(184,92,56,0.08)]'
                    : 'border-[var(--rule)] bg-[var(--sheet)] hover:border-[var(--forest)]'
                }`}
              >
                <p className="font-semibold text-sm">{p.student?.user?.name}</p>
                <p className="text-xs text-[var(--ink-soft)]">{p.student?.reg_number}</p>
                <div className="mt-2"><Stamp tone={p.status === 'active' ? 'active' : 'draft'}>{p.status}</Stamp></div>
              </button>
            ))}
            {!loading && placements.length === 0 && (
              <p className="text-sm text-[var(--ink-soft)]">No students assigned yet.</p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {!selectedPlacement ? (
            <div className="h-full flex items-center justify-center text-[var(--ink-soft)] text-center px-6">
              Pick a student. Their logbook should read like a week on the floor, not a template.
            </div>
          ) : (
            <>
              <h3 className="flex items-center gap-2 font-display text-2xl mb-5">
                <BookOpen size={22} strokeWidth={1.6} /> {selectedPlacement.student?.user?.name}
              </h3>
              <div className="space-y-4">
                {selectedPlacement.logbook_entries?.map(entry => (
                  <article key={entry.id} className="sheet p-5">
                    <div className="flex justify-between mb-2">
                      <span className="font-display text-[var(--forest)]">Week {entry.week_number}</span>
                      <span className="text-sm text-[var(--ink-soft)]">{entry.entry_date}</span>
                    </div>
                    <p className="mb-1"><strong>Work:</strong> {entry.activities}</p>
                    {entry.lessons_learned && <p className="text-sm text-[var(--ink-soft)]"><strong>Lessons:</strong> {entry.lessons_learned}</p>}
                    {entry.comments?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[var(--rule)] space-y-2">
                        {entry.comments.map(c => (
                          <p key={c.id} className="text-sm pl-3 border-l-2 border-[var(--copper)]">
                            <span className="font-semibold">{c.user?.name}:</span> {c.comment}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        className="input flex-1"
                        placeholder="Leave a note…"
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                      />
                      <button type="button" onClick={() => submitComment(entry.id)} className="btn btn-primary">Note</button>
                    </div>
                  </article>
                ))}
                {selectedPlacement.logbook_entries?.length === 0 && (
                  <p className="text-[var(--ink-soft)]">No logbook entries yet.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
