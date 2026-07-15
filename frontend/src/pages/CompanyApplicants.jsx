import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building, Users, LogOut } from 'lucide-react';
import api from '../axios';
import { useAuth } from '../context/AuthContext';

export default function CompanyApplicants() {
  const { role, context, logout } = useAuth();

  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const slotId = searchParams.get('slot');
  const navigate = useNavigate();

  useEffect(() => {
    const url = slotId ? `/companies/slots/${slotId}/applicants` : '/companies/applicants';
    api.get(url)
      .then(res => setApplicants(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [slotId]);

  const updateStatus = async (appId, status) => {
    try {
      await api.put(`/applications/${appId}/status`, { status });
      setApplicants(prev => prev.map(a => a.id === appId ? {...a, status} : a));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const statusColors = {
    submitted: 'bg-blue-100 text-blue-700',
    shortlisted: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    draft: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex">
      <div className="w-64 bg-[var(--color-primary-dark)] text-white p-6 flex flex-col flex-shrink-0">
        <h1 className="text-xl font-bold mb-8">InduTrack KE</h1>
        <nav className="flex-1 space-y-1">
          <Link to="/company" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90 text-sm">
            <Building size={18} /> My Slots
          </Link>
          <Link to="/company/applicants" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm">
            <Users size={18} /> Applicants Inbox
          </Link>
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left px-4 py-2 rounded-lg text-red-300 hover:bg-red-500/20 mt-4 text-sm transition">
          <LogOut size={18} /> Logout
        </button>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-primary-dark)]">Company Portal</h2>
          <div className="text-sm font-medium text-[var(--color-text-secondary)]">{context}</div>
        </header>
        <div className="flex-1 p-8 overflow-y-auto">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Applicants Inbox</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">Review and manage incoming attachment applications.</p>

        {loading && <p className="text-[var(--color-text-secondary)]">Loading applicants...</p>}

        <div className="space-y-4">
          {applicants.map(app => (
            <div key={app.id} className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center text-white font-bold text-lg">
                    {app.student?.user?.name?.charAt(0) ?? 'S'}
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--color-text-primary)]">{app.student?.user?.name ?? 'Student'}</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">{app.student?.reg_number} · {app.student?.department}</p>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">{app.cover_letter?.substring(0, 80)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[app.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {app.status?.toUpperCase()}
                  </span>
                </div>
              </div>
              {(app.status === 'submitted' || app.status === 'shortlisted') && (
                <div className="flex gap-3 border-t border-[var(--color-border)] mt-4 pt-4">
                  {app.status === 'submitted' && (
                    <button onClick={() => updateStatus(app.id, 'shortlisted')} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition">
                      Shortlist
                    </button>
                  )}
                  <button onClick={() => updateStatus(app.id, 'accepted')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition">
                    Accept
                  </button>
                  <button onClick={() => updateStatus(app.id, 'rejected')} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition">
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
          {!loading && applicants.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[var(--color-text-secondary)]">No applicants yet for this slot.</p>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
