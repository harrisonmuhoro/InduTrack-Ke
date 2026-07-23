import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Calendar, Clock } from 'lucide-react';
import api from '../../axios';

export default function SupervisorFieldVisits() {
  const [visits, setVisits] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ placement_id: '', visit_date: '', visit_time: '' });
  const navigate = useNavigate();

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
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="flex-1 p-margin-desktop w-full animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Field Visits</h2>
          <p className="text-on-surface-variant">Schedule and manage your physical or virtual visits.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition flex items-center gap-2">
          <span className="material-symbols-outlined">add</span>
          Schedule Visit
        </button>
      </div>

      {loading ? <p className="text-on-surface-variant">Loading...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visits.map(visit => (
            <div key={visit.id} className="bg-surface p-6 rounded-xl border border-border shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-on-surface">{visit.placement?.student?.user?.name}</h3>
                  <p className="flex items-center gap-1 text-sm text-on-surface-variant"><Building size={14} /> {visit.placement?.company?.name}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${visit.status === 'completed' ? 'bg-primary-subtle text-primary' : 'bg-secondary-fixed text-secondary-container'}`}>
                  {visit.status.toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-2 mb-4 text-sm text-on-surface-variant border-y border-border py-3">
                <p className="flex items-center gap-1"><Calendar size={14} /> <strong>Date:</strong> {visit.visit_date}</p>
                {visit.visit_time && <p className="flex items-center gap-1"><Clock size={14} /> <strong>Time:</strong> {visit.visit_time}</p>}
              </div>

              {visit.status === 'scheduled' && (
                <button onClick={() => markCompleted(visit.id)} className="w-full bg-primary-subtle hover:bg-primary-container/40 text-primary border border-primary-subtle py-2 rounded-lg text-sm font-medium transition">
                  Mark as Completed
                </button>
              )}
            </div>
          ))}
          {visits.length === 0 && <p className="text-on-surface-variant col-span-full">No field visits scheduled.</p>}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl shadow-xl p-6 w-full max-w-md border border-border">
            <h3 className="text-xl font-bold mb-4 text-on-surface">Schedule Field Visit</h3>
            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Student Placement</label>
                <select className="w-full border border-border rounded-lg px-3 py-2 text-sm" value={form.placement_id} onChange={e => setForm({...form, placement_id: e.target.value})} required>
                  <option value="">Select Student...</option>
                  {placements.map(p => (
                    <option key={p.id} value={p.id}>{p.student?.user?.name} at {p.company?.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Date</label>
                <input type="date" className="w-full border border-border rounded-lg px-3 py-2 text-sm" value={form.visit_date} onChange={e => setForm({...form, visit_date: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Time (Optional)</label>
                <input type="time" className="w-full border border-border rounded-lg px-3 py-2 text-sm" value={form.visit_time} onChange={e => setForm({...form, visit_time: e.target.value})} />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low rounded-lg transition">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg font-bold transition">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
