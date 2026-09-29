import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../axios';
import AppShell, { PageHeader, Stamp, EmptyState } from '../components/AppShell';

export default function CompanyApplicants() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const slotId = searchParams.get('slot');

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
      setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  return (
    <AppShell portal="company">
      <PageHeader
        kicker="Inbox"
        title="Applicants"
        subtitle="Read the letter. Shortlist people you’d actually put on the floor."
      />
      {loading && <p className="text-[var(--ink-soft)]">Loading…</p>}
      {!loading && applicants.length === 0 && (
        <EmptyState>No letters in this pile yet.</EmptyState>
      )}
      <div className="space-y-4">
        {applicants.map(app => (
          <article key={app.id} className="sheet p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="h-11 w-11 shrink-0 bg-[var(--forest)] text-[#f7f1e6] flex items-center justify-center font-display text-lg">
                  {app.student?.user?.name?.charAt(0) ?? 'S'}
                </div>
                <div>
                  <h3 className="font-display text-lg">{app.student?.user?.name ?? 'Student'}</h3>
                  <p className="text-sm text-[var(--ink-soft)]">{app.student?.reg_number} · {app.student?.department}</p>
                  <p className="text-sm mt-2 leading-relaxed">{app.cover_letter}</p>
                </div>
              </div>
              <Stamp tone={app.status}>{app.status}</Stamp>
            </div>
            {(app.status === 'submitted' || app.status === 'shortlisted') && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[var(--rule)]">
                {app.status === 'submitted' && (
                  <button type="button" onClick={() => updateStatus(app.id, 'shortlisted')} className="btn btn-ghost">Shortlist</button>
                )}
                <button type="button" onClick={() => updateStatus(app.id, 'accepted')} className="btn btn-primary">Accept</button>
                <button type="button" onClick={() => updateStatus(app.id, 'rejected')} className="btn btn-danger">Turn down</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </AppShell>
  );
}
