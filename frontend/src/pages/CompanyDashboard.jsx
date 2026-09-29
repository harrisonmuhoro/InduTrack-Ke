import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../axios';
import AppShell, { PageHeader, Stamp, Modal, EmptyState } from '../components/AppShell';

export default function CompanyDashboard() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    department: '',
    capacity: '',
    required_skills: '',
    duration: '3 Months',
    has_stipend: false,
    stipend_amount: '',
    description: '',
  });

  useEffect(() => {
    api.get('/companies/slots')
      .then(res => setSlots(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/companies/slots', form);
      setShowModal(false);
      const res = await api.get('/companies/slots');
      setSlots(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create slot.');
    }
  };

  return (
    <AppShell portal="company">
      <PageHeader
        kicker="Your floor"
        title="Attachment slots"
        subtitle="Post a desk, not a job advert. Students will read this the way they read a noticeboard."
        actions={<button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>Post a slot</button>}
      />

      {loading && <p className="text-[var(--ink-soft)]">Loading slots…</p>}

      {!loading && slots.length === 0 && (
        <EmptyState>
          <p className="mb-4">No slots on the board yet.</p>
          <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>Write the first one</button>
        </EmptyState>
      )}

      <div className="space-y-4">
        {slots.map(slot => (
          <article key={slot.id} className="sheet p-5">
            <div className="flex justify-between gap-4 items-start">
              <div>
                <h2 className="font-display text-xl">{slot.department}</h2>
                <p className="text-sm text-[var(--ink-soft)] mt-1">{slot.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {slot.required_skills?.split(',').filter(Boolean).map((s, i) => (
                    <span key={i} className="text-[0.75rem] border border-[var(--rule)] px-2 py-0.5">{s.trim()}</span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <Stamp tone={slot.status === 'open' ? 'open' : 'closed'}>{slot.status}</Stamp>
                <p className="text-sm text-[var(--ink-soft)] mt-3">Seats: {slot.capacity}</p>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-[var(--rule)]">
              <span className="text-sm text-[var(--ink-soft)]">{slot.duration}</span>
              <Link to={`/company/applicants?slot=${slot.id}`} className="btn btn-copper">Read applicants</Link>
            </div>
          </article>
        ))}
      </div>

      {showModal && (
        <Modal title="Post a new slot" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <label className="block text-sm">
              Department
              <input className="input mt-1" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} required />
            </label>
            <label className="block text-sm">
              Capacity
              <input type="number" className="input mt-1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} required />
            </label>
            <label className="block text-sm">
              Skills (comma-separated)
              <input className="input mt-1" value={form.required_skills} onChange={e => setForm({ ...form, required_skills: e.target.value })} />
            </label>
            <label className="block text-sm">
              Duration
              <input className="input mt-1" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
            </label>
            <label className="block text-sm">
              What they will actually do
              <textarea className="input mt-1 h-24 resize-none" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="stipend" checked={form.has_stipend} onChange={e => setForm({ ...form, has_stipend: e.target.checked })} />
              <label htmlFor="stipend" className="text-sm">Offers stipend</label>
              {form.has_stipend && (
                <input type="number" placeholder="KES / month" className="input flex-1" value={form.stipend_amount} onChange={e => setForm({ ...form, stipend_amount: e.target.value })} />
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn btn-primary flex-1">Post slot</button>
              <button type="button" className="btn btn-ghost flex-1" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
