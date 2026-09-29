import { useState, useEffect } from 'react';
import api from '../axios';
import AppShell, { PageHeader, Stamp, Modal, EmptyState } from '../components/AppShell';

export default function SupervisorFieldVisits() {
  const [visits, setVisits] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ placement_id: '', visit_date: '', visit_time: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitsRes, placementsRes] = await Promise.all([
        api.get('/field-visits'),
        api.get('/supervisors/students')
      ]);
      setVisits(visitsRes.data);
      setPlacements(placementsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    try {
      await api.post('/field-visits', form);
      fetchData();
      setShowModal(false);
      setForm({ placement_id: '', visit_date: '', visit_time: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to schedule visit');
    }
  };

  const markCompleted = async (id) => {
    try {
      await api.put(`/field-visits/${id}`, { status: 'completed' });
      fetchData();
    } catch {
      alert('Failed to update status');
    }
  };

  return (
    <AppShell portal="supervisor">
      <PageHeader
        kicker="On site"
        title="Field visits"
        subtitle="Put a date on the calendar. The student should know you’re coming."
        actions={<button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>Schedule a visit</button>}
      />

      {loading ? (
        <p className="text-[var(--ink-soft)]">Loading…</p>
      ) : visits.length === 0 ? (
        <EmptyState>No visits booked.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visits.map(visit => (
            <article key={visit.id} className="sheet p-5">
              <div className="flex justify-between items-start gap-3 mb-3">
                <div>
                  <h3 className="font-display text-xl">{visit.placement?.student?.user?.name}</h3>
                  <p className="text-sm text-[var(--ink-soft)]">{visit.placement?.company?.name}</p>
                </div>
                <Stamp tone={visit.status === 'completed' ? 'completed' : 'scheduled'}>{visit.status}</Stamp>
              </div>
              <p className="text-sm border-y border-[var(--rule)] py-3">
                {visit.visit_date}{visit.visit_time ? ` · ${visit.visit_time}` : ''}
              </p>
              {visit.status === 'scheduled' && (
                <button type="button" onClick={() => markCompleted(visit.id)} className="btn btn-ghost w-full mt-4">
                  Mark as done
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Schedule a field visit" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSchedule} className="space-y-3">
            <label className="block text-sm">
              Student
              <select className="input mt-1" value={form.placement_id} onChange={e => setForm({ ...form, placement_id: e.target.value })} required>
                <option value="">Select…</option>
                {placements.map(p => (
                  <option key={p.id} value={p.id}>{p.student?.user?.name} at {p.company?.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Date
              <input type="date" className="input mt-1" value={form.visit_date} onChange={e => setForm({ ...form, visit_date: e.target.value })} required />
            </label>
            <label className="block text-sm">
              Time (optional)
              <input type="time" className="input mt-1" value={form.visit_time} onChange={e => setForm({ ...form, visit_time: e.target.value })} />
            </label>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Schedule</button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
