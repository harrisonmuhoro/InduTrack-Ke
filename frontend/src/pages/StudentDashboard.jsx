import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, Book, Zap, Star, LogOut, Calendar, MessageSquare } from 'lucide-react';
import api from '../axios';

export default function StudentDashboard() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check 2fa status from profile
    api.get('/auth/profile').then(res => setIs2faEnabled(res.data.two_factor_enabled));

    api.get('/students/slots')
      .then(res => setSlots(res.data))
      .catch(() => setError('Could not load slots.'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const toggle2FA = async () => {
    try {
      const res = await api.post('/auth/2fa/toggle');
      setIs2faEnabled(res.data.enabled);
      alert(res.data.message + '. ' + (res.data.enabled ? 'Please log out and log back in to set up your Authenticator app.' : ''));
    } catch (err) {
      alert('Failed to toggle 2FA.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex">
      {/* Sidebar */}
      <div className="w-64 bg-[var(--color-primary-dark)] text-white p-6 flex flex-col flex-shrink-0">
        <h1 className="text-xl font-bold mb-8">InduTrack KE</h1>
        <nav className="flex-1 space-y-1">
          <Link to="/student" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white">
            <Home size={18} /> Find Slots
          </Link>
          <Link to="/student/applications" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90">
            <ClipboardList size={18} /> My Applications
          </Link>
          <Link to="/student/logbook" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90">
            <Book size={18} /> Logbook
          </Link>
          <Link to="/student/match" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90">
            <Zap size={18} /> Smart Match
          </Link>
          <Link to="/student/evaluation" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90">
            <Star size={18} /> Rate Company
          </Link>
          <Link to="/messages" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90">
            <MessageSquare size={18} /> Messages
          </Link>
        </nav>
        <button onClick={toggle2FA} className="flex items-center gap-2 w-full text-left px-4 py-2 rounded-lg text-blue-300 hover:bg-blue-500/20 mt-4 transition">
          <Zap size={18} /> {is2faEnabled ? 'Disable 2FA' : 'Enable 2FA'}
        </button>
        <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left px-4 py-2 rounded-lg text-red-300 hover:bg-red-500/20 mt-2 transition">
          <LogOut size={18} /> Logout
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-primary-dark)]">Student Portal</h2>
          <div className="text-sm font-medium text-[var(--color-text-secondary)]">{localStorage.getItem('context')}</div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Open Attachment Slots</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">Browse and apply to available attachment positions.</p>

        {loading && <p className="text-[var(--color-text-secondary)]">Loading slots...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {slots.map(slot => (
            <div key={slot.id} className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{slot.company?.name ?? 'N/A'}</h3>
                  <p className="text-[var(--color-primary)] font-medium">{slot.department}</p>
                </div>
                {slot.has_stipend && (
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full">
                    KES {slot.stipend_amount?.toLocaleString()}/mo
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">{slot.description}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {slot.required_skills?.split(',').map((s, i) => (
                  <span key={i} className="bg-[var(--color-bg)] border border-[var(--color-border)] text-xs px-2 py-1 rounded-full">{s.trim()}</span>
                ))}
              </div>
              <div className="flex justify-between items-center border-t border-[var(--color-border)] pt-4">
                <span className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
                  <Calendar size={16} /> {slot.duration}
                </span>
                <Link to={`/student/applications?apply=${slot.id}`}>
                  <button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white px-4 py-1.5 rounded-lg text-sm font-medium transition">
                    Apply Now
                  </button>
                </Link>
              </div>
            </div>
          ))}
          {!loading && slots.length === 0 && !error && (
            <p className="text-[var(--color-text-secondary)] col-span-2">No open slots found.</p>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
