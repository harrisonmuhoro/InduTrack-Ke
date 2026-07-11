import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building, Users, LogOut, Calendar, MessageSquare, UserCircle } from 'lucide-react';
import api from '../axios';
import { useAuth } from '../context/AuthContext';

export default function CompanyDashboard() {
  const { role, context, logout } = useAuth();

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ department: '', capacity: '', required_skills: '', duration: '3 Months', has_stipend: false, stipend_amount: '', description: '' });
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex">
      {/* Sidebar */}
      <div className="w-64 bg-[var(--color-primary-dark)] text-white p-6 flex flex-col flex-shrink-0">
        <h1 className="text-xl font-bold mb-8">InduTrack KE</h1>
        <nav className="flex-1 space-y-1">
          <Link to="/company" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm">
            <Building size={18} /> My Slots
          </Link>
          <Link to="/company/applicants" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90 text-sm">
            <Users size={18} /> Applicants Inbox
          </Link>
          <Link to="/messages" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90 text-sm">
            <MessageSquare size={18} /> Messages
          </Link>
          <Link to="/profile" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90 text-sm">
            <UserCircle size={18} /> My Profile
          </Link>
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left px-4 py-2 rounded-lg text-red-300 hover:bg-red-500/20 mt-4 text-sm transition">
          <LogOut size={18} /> Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-primary-dark)]">Company Portal</h2>
          <div className="text-sm font-medium text-[var(--color-text-secondary)]">{context}</div>
        </header>
        <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Attachment Slots</h2>
            <p className="text-[var(--color-text-secondary)]">Manage your open attachment positions.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white px-4 py-2 rounded-lg font-medium transition text-sm">
            + Create New Slot
          </button>
        </div>

        {loading && <p className="text-[var(--color-text-secondary)]">Loading slots...</p>}

        <div className="space-y-4">
          {slots.map(slot => (
            <div key={slot.id} className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-[var(--color-text-primary)] text-lg">{slot.department}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-2">{slot.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {slot.required_skills?.split(',').map((s, i) => (
                      <span key={i} className="bg-[var(--color-bg)] border border-[var(--color-border)] text-xs px-2 py-0.5 rounded-full">{s.trim()}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${slot.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {slot.status?.toUpperCase()}
                  </span>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2">Capacity: {slot.capacity}</p>
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-[var(--color-border)] mt-4 pt-4">
                <span className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
                  <Calendar size={16} /> {slot.duration}
                </span>
                <Link to={`/company/applicants?slot=${slot.id}`}>
                  <button className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white px-4 py-1.5 rounded-lg text-sm font-medium transition">
                    View Applicants
                  </button>
                </Link>
              </div>
            </div>
          ))}
          {!loading && slots.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[var(--color-text-secondary)] mb-4">No slots created yet.</p>
              <button onClick={() => setShowModal(true)} className="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg">Create Your First Slot</button>
            </div>
          )}
          </div>
      </div>
      </div>

      {/* Create Slot Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl w-full max-w-lg shadow-xl max-h-screen overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Create New Slot</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={form.department} onChange={e => setForm({...form, department: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Capacity</label>
                <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Required Skills (comma-separated)</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={form.required_skills} onChange={e => setForm({...form, required_skills: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Duration</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20" value={form.description} onChange={e => setForm({...form, description: e.target.value})}></textarea>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="stipend" checked={form.has_stipend} onChange={e => setForm({...form, has_stipend: e.target.checked})} className="h-4 w-4" />
                <label htmlFor="stipend" className="text-sm font-medium">Offers Stipend?</label>
                {form.has_stipend && (
                  <input type="number" placeholder="Amount (KES)" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.stipend_amount} onChange={e => setForm({...form, stipend_amount: e.target.value})} />
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-[var(--color-primary)] text-white py-2 rounded-lg font-medium">Create Slot</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
