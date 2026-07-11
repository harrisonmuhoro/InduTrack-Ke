import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, Book, FolderOpen, Zap, Star, BarChart2, LogOut, FileText } from 'lucide-react';
import api from '../axios';

const Sidebar = ({ active }) => {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };
  const items = [
    { to: '/student', label: <><Home size={18} /> Find Slots</> },
    { to: '/student/applications', label: <><ClipboardList size={18} /> My Applications</> },
    { to: '/student/logbook', label: <><Book size={18} /> Logbook</> },
    { to: '/student/documents', label: <><FolderOpen size={18} /> Documents</> },
    { to: '/student/match', label: <><Zap size={18} /> Smart Match</> },
    { to: '/student/evaluation', label: <><Star size={18} /> Rate Company</> },
    { to: '/student/results', label: <><BarChart2 size={18} /> Evaluation Results</> },
  ];
  return (
    <div className="w-64 bg-[var(--color-primary-dark)] text-white p-6 flex flex-col flex-shrink-0">
      <h1 className="text-xl font-bold mb-8">InduTrack KE</h1>
      <nav className="flex-1 space-y-1">
        {items.map(item => (
          <Link key={item.to} to={item.to} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${active === item.to ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-primary)] text-white/90'}`}>{item.label}</Link>
        ))}
      </nav>
      <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left px-4 py-2 rounded-lg text-red-300 hover:bg-red-500/20 mt-4 text-sm transition"><LogOut size={18} /> Logout</button>
    </div>
  );
};

export default function StudentEvaluationResults() {
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
    <div className="min-h-screen bg-[var(--color-bg)] flex">
      <Sidebar active="/student/results" />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-primary-dark)]">Student Portal</h2>
          <div className="text-sm font-medium text-[var(--color-text-secondary)]">{localStorage.getItem('context')}</div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">My Evaluation Results</h2>
        
        {loading && <p className="text-[var(--color-text-secondary)]">Loading results...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && evaluations.length === 0 && (
          <div className="text-center py-16 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
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
                <div className="bg-[var(--color-primary-light)] text-white px-4 py-2 rounded-lg text-center">
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
                  <div key={metric.label} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                    <span className="block text-xs font-semibold text-gray-500 uppercase">{metric.label}</span>
                    <span className="block text-xl font-bold text-[var(--color-primary)] mt-1">{metric.score}/5</span>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-1">Supervisor Remarks</h4>
                <p className="text-sm text-blue-900">{evaluation.remarks || 'No remarks provided.'}</p>
              </div>

              <div className="border-t pt-4">
                <a 
                  href={`http://localhost:8000/api/students/placements/${evaluation.placement_id}/certificate`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  <FileText size={16} /> Download Completion Certificate
                </a>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
