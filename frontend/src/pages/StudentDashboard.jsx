import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import api from '../axios';
import { useAuth } from '../context/AuthContext';
import AppShell, { PageHeader, EmptyState } from '../components/AppShell';

export default function StudentDashboard() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [is2faEnabled, setIs2faEnabled] = useState(false);

  useEffect(() => {
    api.get('/profile').then(res => setIs2faEnabled(res.data.user?.two_factor_enabled || false));
    api.get('/students/slots')
      .then(res => setSlots(res.data))
      .catch(() => setError('Could not load slots.'))
      .finally(() => setLoading(false));
  }, []);

  const toggle2FA = async () => {
    try {
      const res = await api.post('/auth/2fa/toggle');
      setIs2faEnabled(res.data.enabled);
      alert(res.data.message + '. ' + (res.data.enabled ? 'Please log out and log back in to set up your Authenticator app.' : ''));
    } catch {
      alert('Failed to toggle 2FA.');
    }
  };

  return (
    <AppShell
      portal="student"
      footerExtra={
        <button type="button" onClick={toggle2FA} className="btn btn-ghost w-full justify-start text-[0.85rem]">
          <Shield size={15} /> {is2faEnabled ? 'Turn off 2FA' : 'Turn on 2FA'}
        </button>
      }
    >
      <PageHeader
        kicker="This season"
        title="Places still taking students"
        subtitle="Read the brief, check the skills, then send a short letter. No racing the clock — apply when the fit is real."
      />

      {loading && <p className="text-[var(--ink-soft)]">Fetching open desks…</p>}
      {error && <p className="text-[var(--stamp)]">{error}</p>}

      {!loading && !error && slots.length === 0 && (
        <EmptyState>Nothing posted yet. Check again after your industrial liaison office opens the period.</EmptyState>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {slots.map(slot => (
          <article key={slot.id} className="sheet p-6 flex flex-col">
            <div className="flex justify-between gap-4 items-start">
              <div>
                <h2 className="font-display text-[1.35rem]">{slot.company?.name ?? 'Company'}</h2>
                <p className="text-[var(--forest)] font-semibold mt-0.5">{slot.department}</p>
              </div>
              {slot.has_stipend && (
                <p className="text-right text-sm whitespace-nowrap">
                  <span className="block text-[0.65rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">Stipend</span>
                  <span className="font-display text-lg">KES {slot.stipend_amount?.toLocaleString()}</span>
                  <span className="text-[var(--ink-soft)] text-xs"> / mo</span>
                </p>
              )}
            </div>
            {slot.description && (
              <p className="mt-3 text-[0.95rem] text-[var(--ink-soft)] leading-relaxed">{slot.description}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {slot.required_skills?.split(',').filter(Boolean).map((s, i) => (
                <span key={i} className="text-[0.75rem] border border-[var(--rule)] px-2 py-0.5 text-[var(--ink-soft)]">
                  {s.trim()}
                </span>
              ))}
            </div>
            <div className="mt-auto pt-5 flex items-center justify-between">
              <span className="text-sm text-[var(--ink-soft)]">{slot.duration}</span>
              <Link to={`/student/applications?apply=${slot.id}`} className="btn btn-primary">
                Apply
              </Link>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
