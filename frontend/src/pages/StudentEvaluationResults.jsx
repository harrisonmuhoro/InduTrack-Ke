import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import api from '../axios';
import AppShell, { PageHeader, EmptyState } from '../components/AppShell';

export default function StudentEvaluationResults() {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/students/evaluations')
      .then(res => setEvaluations(res.data))
      .catch(() => setError('Could not load evaluation results.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell portal="student">
      <PageHeader kicker="Scores" title="Evaluation results" subtitle="How your supervisors marked the attachment, in plain numbers." />

      {loading && <p className="text-[var(--ink-soft)]">Loading…</p>}
      {error && <p className="text-[var(--stamp)]">{error}</p>}
      {!loading && !error && evaluations.length === 0 && (
        <EmptyState>No evaluations yet. They usually land after the last logbook week.</EmptyState>
      )}

      <div className="space-y-5">
        {evaluations.map(evaluation => (
          <article key={evaluation.id} className="sheet p-6">
            <div className="flex justify-between items-start gap-4 mb-5">
              <div>
                <h3 className="font-display text-xl capitalize">
                  {evaluation.evaluator_type.replace('_', ' ')}
                </h3>
                <p className="text-sm text-[var(--ink-soft)]">
                  {evaluation.evaluator?.name} · {new Date(evaluation.submitted_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <span className="font-display text-3xl text-[var(--forest)]">{evaluation.total_score}</span>
                <span className="block text-[0.65rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">Total</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
              {[
                { label: 'Punctuality', score: evaluation.score_punctuality },
                { label: 'Attitude', score: evaluation.score_attitude },
                { label: 'Technical', score: evaluation.score_technical },
                { label: 'Teamwork', score: evaluation.score_teamwork },
                { label: 'Communication', score: evaluation.score_communication },
              ].map(metric => (
                <div key={metric.label} className="border border-[var(--rule)] px-3 py-2">
                  <span className="block text-[0.65rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">{metric.label}</span>
                  <span className="font-display text-xl">{metric.score}<span className="text-sm text-[var(--ink-soft)]">/5</span></span>
                </div>
              ))}
            </div>
            <blockquote className="border-l-2 border-[var(--copper)] pl-4 text-sm italic text-[var(--ink-soft)] mb-5">
              {evaluation.remarks || 'No remarks.'}
            </blockquote>
            <a
              href={`http://localhost:8000/api/students/placements/${evaluation.placement_id}/certificate`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              <FileText size={16} /> Completion certificate
            </a>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
