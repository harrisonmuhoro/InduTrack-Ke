import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import api from '../axios';
import AppShell, { PageHeader } from '../components/AppShell';

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
    <AppShell portal="student" pad={false}>
      <div className="flex flex-col lg:flex-row h-full min-h-0">
        <div className="lg:w-[22rem] shrink-0 p-6 border-b lg:border-b-0 lg:border-r border-[var(--rule)] overflow-y-auto bg-[var(--sheet)]">
          <p className="page-kicker">Weekly page</p>
          <h2 className="font-display text-2xl mb-4">New entry</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                Week
                <input type="number" min="1" className="input mt-1" value={form.week_number} onChange={e => setForm({ ...form, week_number: e.target.value })} required />
              </label>
              <label className="block text-sm">
                Date
                <input type="date" className="input mt-1" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} required />
              </label>
            </div>
            <label className="block text-sm">
              What you did
              <textarea className="input mt-1 h-24 resize-none" value={form.activities} onChange={e => setForm({ ...form, activities: e.target.value })} required />
            </label>
            <label className="block text-sm">
              What you learned
              <textarea className="input mt-1 h-20 resize-none" value={form.lessons_learned} onChange={e => setForm({ ...form, lessons_learned: e.target.value })} />
            </label>
            <label className="block text-sm">
              What got in the way
              <textarea className="input mt-1 h-20 resize-none" value={form.challenges} onChange={e => setForm({ ...form, challenges: e.target.value })} />
            </label>
            <label className="block text-sm">
              Next week
              <textarea className="input mt-1 h-20 resize-none" value={form.plan_next_week} onChange={e => setForm({ ...form, plan_next_week: e.target.value })} />
            </label>
            <button type="submit" disabled={submitting} className="btn btn-primary w-full">
              {submitting ? 'Saving…' : 'File this week'}
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10">
          <PageHeader kicker="History" title="Logbook" subtitle="Write like someone will visit the floor and ask you about Friday." />
          {loading && <p className="text-[var(--ink-soft)]">Loading…</p>}
          <div className="space-y-4">
            {logs.map(log => (
              <article key={log.id} className={`sheet p-5 ${!log.is_editable ? 'opacity-90' : ''}`}>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-display text-lg text-[var(--forest)]">Week {log.week_number}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--ink-soft)]">{log.entry_date}</span>
                    {!log.is_editable && (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--ink-soft)] border border-[var(--rule)] px-2 py-0.5">
                        <Lock size={11} /> Locked
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-sm leading-relaxed">
                  <p><strong>Work:</strong> {log.activities}</p>
                  {log.lessons_learned && <p className="text-[var(--ink-soft)]"><strong>Lessons:</strong> {log.lessons_learned}</p>}
                  {log.challenges && <p className="text-[var(--ink-soft)]"><strong>Snags:</strong> {log.challenges}</p>}
                  {log.plan_next_week && <p className="text-[var(--ink-soft)]"><strong>Next:</strong> {log.plan_next_week}</p>}
                </div>
                {log.comments?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[var(--rule)]">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-[var(--ink-soft)] mb-2">Supervisor notes</p>
                    {log.comments.map(c => (
                      <p key={c.id} className="text-sm mb-2 pl-3 border-l-2 border-[var(--copper)]">
                        <span className="font-semibold">{c.user?.name}:</span> {c.comment}
                      </p>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {!loading && logs.length === 0 && (
              <p className="text-[var(--ink-soft)]">No weeks filed yet. Start with Monday.</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
