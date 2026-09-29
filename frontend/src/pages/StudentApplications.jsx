import { useState, useEffect } from 'react';
import api from '../axios';
import AppShell, { PageHeader, Stamp, Modal, EmptyState } from '../components/AppShell';

export default function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [slots, setSlots] = useState([]);
  const [applyForm, setApplyForm] = useState({ slot_id: '', cover_letter: '' });

  useEffect(() => {
    api.get('/students/applications')
      .then(res => setApplications(res.data))
      .catch(() => setError('Could not load applications.'))
      .finally(() => setLoading(false));
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      await api.post('/applications', applyForm);
      alert('Application submitted!');
      setShowApplyModal(false);
      const res = await api.get('/students/applications');
      setApplications(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to apply.');
    }
  };

  const openApplyModal = async () => {
    const res = await api.get('/students/slots');
    setSlots(res.data);
    setShowApplyModal(true);
  };

  const tone = {
    draft: 'draft',
    submitted: 'submitted',
    shortlisted: 'shortlisted',
    accepted: 'accepted',
    rejected: 'rejected',
  };

  return (
    <AppShell portal="student">
      <PageHeader
        kicker="Paper trail"
        title="Your applications"
        subtitle="Who you wrote to, and where that letter sits now."
        actions={<button type="button" className="btn btn-primary" onClick={openApplyModal}>New letter</button>}
      />

      {loading && <p className="text-[var(--ink-soft)]">Loading…</p>}
      {error && <p className="text-[var(--stamp)]">{error}</p>}

      {!loading && !error && applications.length === 0 && (
        <EmptyState>
          <p className="mb-4">You haven’t sent anything yet.</p>
          <button type="button" className="btn btn-primary" onClick={openApplyModal}>Browse slots</button>
        </EmptyState>
      )}

      <div className="space-y-3">
        {applications.map(app => (
          <div key={app.id} className="sheet px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg">{app.slot?.company?.name ?? 'Company'}</h3>
              <p className="text-sm text-[var(--ink-soft)]">{app.slot?.department}</p>
            </div>
            <Stamp tone={tone[app.status] || 'draft'}>{app.status}</Stamp>
          </div>
        ))}
      </div>

      {showApplyModal && (
        <Modal title="Send an application" onClose={() => setShowApplyModal(false)}>
          <form onSubmit={handleApply} className="space-y-3">
            <label className="block text-sm">
              Slot
              <select className="input mt-1" value={applyForm.slot_id} onChange={e => setApplyForm({ ...applyForm, slot_id: e.target.value })} required>
                <option value="">Choose a desk…</option>
                {slots.map(s => (
                  <option key={s.id} value={s.id}>{s.company?.name} — {s.department}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Cover letter
              <textarea className="input mt-1 h-32 resize-none" value={applyForm.cover_letter} onChange={e => setApplyForm({ ...applyForm, cover_letter: e.target.value })} required />
            </label>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn btn-primary flex-1">Submit</button>
              <button type="button" className="btn btn-ghost flex-1" onClick={() => setShowApplyModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
