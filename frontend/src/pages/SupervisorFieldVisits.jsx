import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building, Calendar, Clock } from 'lucide-react';
import api from '../axios';

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
        api.get('/supervisors/students') // academic supervisors get their assigned students
      ]);
      setVisits(visitsRes.data);
      setPlacements(placementsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
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
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-[var(--color-primary-dark)]">Supervisor Portal</h1>
          <nav className="flex gap-4">
            <Link to="/supervisor" className="text-gray-600 hover:text-[var(--color-primary)] font-medium text-sm">Dashboard</Link>
            <Link to="/supervisor/visits" className="text-[var(--color-primary)] font-medium text-sm">Field Visits</Link>
          </nav>
        </div>
        <button onClick={handleLogout} className="text-sm font-medium text-red-500 hover:text-red-700">Logout</button>
      </header>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-primary-dark)]">Supervisor Portal</h2>
          <div className="text-sm font-medium text-[var(--color-text-secondary)]">{localStorage.getItem('context')}</div>
        </header>
        <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Field Visits</h2>
            <p className="text-[var(--color-text-secondary)]">Schedule and manage your physical or virtual visits.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-light)] transition">
            + Schedule Visit
          </button>
        </div>

        {loading ? <p className="text-gray-500">Loading...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visits.map(visit => (
              <div key={visit.id} className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-[var(--color-text-primary)]">{visit.placement?.student?.user?.name}</h3>
                    <p className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]"><Building size={14} /> {visit.placement?.company?.name}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${visit.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {visit.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4 text-sm text-gray-700 border-y py-3">
                  <p className="flex items-center gap-1"><Calendar size={14} /> <strong>Date:</strong> {visit.visit_date}</p>
                  {visit.visit_time && <p className="flex items-center gap-1"><Clock size={14} /> <strong>Time:</strong> {visit.visit_time}</p>}
                </div>

                {visit.status === 'scheduled' && (
                  <button onClick={() => markCompleted(visit.id)} className="w-full bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 py-2 rounded-lg text-sm font-medium transition">
                    Mark as Completed
                  </button>
                )}
              </div>
            ))}
            {visits.length === 0 && <p className="text-gray-500 col-span-full">No field visits scheduled.</p>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Schedule Field Visit</h3>
            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Placement</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.placement_id} onChange={e => setForm({...form, placement_id: e.target.value})} required>
                  <option value="">Select Student...</option>
                  {placements.map(p => (
                    <option key={p.id} value={p.id}>{p.student?.user?.name} at {p.company?.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.visit_date} onChange={e => setForm({...form, visit_date: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time (Optional)</label>
                <input type="time" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.visit_time} onChange={e => setForm({...form, visit_time: e.target.value})} />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
