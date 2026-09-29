import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../axios';
import AppShell, { PageHeader } from '../components/AppShell';

export default function CompanyEvaluationForm() {
  const [placement, setPlacement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const placementId = searchParams.get('placementId');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    score_punctuality: 5,
    score_attitude: 5,
    score_technical: 5,
    score_teamwork: 5,
    score_communication: 5,
    remarks: '',
    would_accept_again: true,
  });

  useEffect(() => {
    if (!placementId) return setLoading(false);
    api.get('/supervisors/students')
      .then(res => {
        const found = res.data.find(p => p.id == placementId);
        if (found) setPlacement(found);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [placementId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/evaluations', {
        placement_id: placementId,
        evaluator_type: 'company_supervisor',
        ...form
      });
      alert('Evaluation submitted successfully');
      navigate('/company');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!placementId) {
    return (
      <AppShell portal="company">
        <div className="sheet p-8 max-w-md">
          <p className="text-[var(--stamp)] mb-4">No placement specified for evaluation.</p>
          <Link to="/company" className="btn btn-ghost">Back to slots</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell portal="company">
      <div className="max-w-2xl">
        <PageHeader kicker="End of attachment" title="Mark the student" subtitle="Score the work you actually saw, not the CV." />
        {loading ? (
          <p className="text-[var(--ink-soft)]">Loading…</p>
        ) : (
          <>
            {placement && (
              <div className="sheet p-4 mb-5">
                <p className="font-display text-lg">{placement.student?.user?.name}</p>
                <p className="text-sm text-[var(--ink-soft)]">{placement.student?.reg_number} · {placement.student?.department}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="sheet p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="font-display text-lg border-b border-[var(--rule)] pb-2">Rubric (1 poor — 5 excellent)</h3>
                {['punctuality', 'attitude', 'technical', 'teamwork', 'communication'].map(metric => (
                  <div key={metric} className="flex items-center justify-between gap-4">
                    <label className="text-sm capitalize w-1/3">{metric}</label>
                    <div className="flex gap-4">
                      {[1, 2, 3, 4, 5].map(score => (
                        <label key={score} className="flex items-center gap-1 cursor-pointer text-sm">
                          <input
                            type="radio"
                            name={metric}
                            value={score}
                            checked={form[`score_${metric}`] === score}
                            onChange={() => setForm({ ...form, [`score_${metric}`]: score })}
                          />
                          {score}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <label className="block text-sm font-semibold">
                Remarks
                <textarea
                  className="input mt-2 h-32 resize-none font-normal"
                  value={form.remarks}
                  onChange={e => setForm({ ...form, remarks: e.target.value })}
                  required
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.would_accept_again}
                  onChange={e => setForm({ ...form, would_accept_again: e.target.checked })}
                />
                Would take this student again
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--rule)]">
                <Link to="/company" className="btn btn-ghost">Cancel</Link>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Submitting…' : 'Submit evaluation'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
}
