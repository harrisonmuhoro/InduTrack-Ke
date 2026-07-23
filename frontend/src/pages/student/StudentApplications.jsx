import { useState, useEffect } from 'react';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';

export default function StudentApplications() {
  const { role, context } = useAuth();

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

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    shortlisted: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-margin-desktop space-y-gutter max-w-container-max mx-auto animate-in fade-in duration-300 w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">My Applications</h2>
          <p className="text-[var(--color-text-secondary)]">Track the status of all your attachment applications.</p>
        </div>
        <button onClick={openApplyModal} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white px-4 py-2 rounded-lg font-medium transition text-sm">
          + New Application
        </button>
      </div>

      {loading && <p className="text-[var(--color-text-secondary)]">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="space-y-4">
        {applications.map(app => (
          <div key={app.id} className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[var(--color-text-primary)]">{app.slot?.company?.name ?? 'Company'}</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">{app.slot?.department}</p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusColors[app.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {app.status?.toUpperCase()}
            </span>
          </div>
        ))}
        {!loading && applications.length === 0 && !error && (
          <div className="text-center py-16">
            <p className="text-[var(--color-text-secondary)] mb-4">You haven't applied to any slots yet.</p>
            <button onClick={openApplyModal} className="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg">Browse & Apply</button>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl w-full max-w-lg shadow-xl">
            <h3 className="text-xl font-bold mb-4">Submit Application</h3>
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Slot</label>
                <select className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2" value={applyForm.slot_id} onChange={e => setApplyForm({...applyForm, slot_id: e.target.value})} required>
                  <option value="">-- Choose a slot --</option>
                  {slots.map(s => <option key={s.id} value={s.id}>{s.company?.name} - {s.department}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cover Letter</label>
                <textarea className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 h-32" value={applyForm.cover_letter} onChange={e => setApplyForm({...applyForm, cover_letter: e.target.value})} required></textarea>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-[var(--color-primary)] text-white py-2 rounded-lg font-medium">Submit</button>
                <button type="button" onClick={() => setShowApplyModal(false)} className="flex-1 border border-[var(--color-border)] py-2 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
