import { useState, useEffect } from 'react';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';

export default function StudentEvaluationResults() {
  const { role, context } = useAuth();

  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/students/evaluations')
      .then(res => setEvaluations(res.data))
      .catch(err => setError('Could not load evaluation results.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-margin-desktop space-y-gutter max-w-container-max mx-auto animate-in fade-in duration-300 w-full">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">My Evaluation Results</h2>
      
      {loading && <p className="text-[var(--color-text-secondary)]">Loading results...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && evaluations.length === 0 && (
        <div className="text-center py-16 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm">
          <p className="text-[var(--color-text-secondary)]">No evaluations have been submitted for your placements yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {evaluations.map(evaluation => (
          <div key={evaluation.id} className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg text-[var(--color-text-primary)]">
                  {evaluation.evaluator_type.replace('_', ' ').toUpperCase()} EVALUATION
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Evaluator: {evaluation.evaluator?.name} • Submitted on {new Date(evaluation.submitted_at).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-primary-container text-on-primary px-4 py-2 rounded-lg text-center">
                <span className="block text-2xl font-bold">{evaluation.total_score}</span>
                <span className="block text-xs uppercase tracking-wider">Total Score</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Punctuality', score: evaluation.score_punctuality },
                { label: 'Attitude', score: evaluation.score_attitude },
                { label: 'Technical', score: evaluation.score_technical },
                { label: 'Teamwork', score: evaluation.score_teamwork },
                { label: 'Communication', score: evaluation.score_communication },
              ].map(metric => (
                <div key={metric.label} className="bg-surface-container-lowest p-3 rounded-lg border border-border text-center">
                  <span className="block text-xs font-semibold text-on-surface-variant uppercase">{metric.label}</span>
                  <span className="block text-xl font-bold text-primary mt-1">{metric.score}/5</span>
                </div>
              ))}
            </div>

            <div className="bg-secondary-container/20 p-4 rounded-lg mb-4">
              <h4 className="text-sm font-semibold text-secondary mb-1">Supervisor Remarks</h4>
              <p className="text-sm text-on-surface-variant">{evaluation.remarks || 'No remarks provided.'}</p>
            </div>

            <div className="border-t border-border pt-4">
              <a 
                href={`http://localhost:8000/api/students/placements/${evaluation.placement_id}/certificate`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#064D37] hover:bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                Download Completion Certificate
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
