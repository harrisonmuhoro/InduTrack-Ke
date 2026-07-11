import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Building, Users, LogOut } from 'lucide-react';
import api from '../axios';

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
    
    // In a real app we'd fetch the specific placement details to show who we're evaluating
    // Here we'll just mock it or skip it, but let's assume we fetch supervisor's assigned students
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
        evaluator_type: 'company_supervisor', // or get from auth context
        ...form
      });
      alert('Evaluation submitted successfully');
      navigate('/company'); // Redirect to dashboard
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  if (!placementId) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <p className="text-red-500 mb-4">No placement specified for evaluation.</p>
          <Link to="/company" className="text-blue-500 underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex">
      {/* Sidebar */}
      <div className="w-64 bg-[var(--color-primary-dark)] text-white p-6 flex flex-col flex-shrink-0">
        <h1 className="text-xl font-bold mb-8">InduTrack KE</h1>
        <nav className="flex-1 space-y-1">
          <Link to="/company" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm">
            <Building size={18} /> My Slots / Students
          </Link>
          <Link to="/company/applicants" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90 text-sm">
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
          <div className="text-sm font-medium text-[var(--color-text-secondary)]">{localStorage.getItem('context')}</div>
        </header>
        <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">End of Attachment Evaluation</h2>
          
          {loading ? (
            <p className="text-[var(--color-text-secondary)]">Loading placement details...</p>
          ) : (
            <>
              {placement && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h3 className="font-semibold text-blue-800">Evaluating Student: {placement.student?.user?.name}</h3>
                  <p className="text-sm text-blue-600">Reg No: {placement.student?.reg_number} | Dept: {placement.student?.department}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm space-y-6">
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Rubric Scoring (1 - Poor, 5 - Excellent)</h3>
                  
                  {['punctuality', 'attitude', 'technical', 'teamwork', 'communication'].map(metric => (
                    <div key={metric} className="flex items-center justify-between">
                      <label className="text-sm font-medium text-[var(--color-text-primary)] capitalize w-1/3">
                        {metric}
                      </label>
                      <div className="flex gap-4 w-2/3">
                        {[1, 2, 3, 4, 5].map(score => (
                          <label key={score} className="flex items-center gap-1 cursor-pointer">
                            <input 
                              type="radio" 
                              name={metric} 
                              value={score} 
                              checked={form[`score_${metric}`] === score}
                              onChange={() => setForm({...form, [`score_${metric}`]: score})}
                              className="text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                            />
                            <span className="text-sm">{score}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Overall Remarks</label>
                  <textarea 
                    className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2 h-32 resize-none"
                    value={form.remarks}
                    onChange={e => setForm({...form, remarks: e.target.value})}
                    placeholder="Provide specific feedback about the student's performance..."
                    required
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="accept_again"
                    checked={form.would_accept_again}
                    onChange={e => setForm({...form, would_accept_again: e.target.checked})}
                    className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  <label htmlFor="accept_again" className="text-sm font-medium text-[var(--color-text-primary)]">
                    Would you accept this student again for future roles?
                  </label>
                </div>

                <div className="pt-4 border-t border-[var(--color-border)] flex justify-end gap-3">
                  <Link to="/company" className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Cancel</Link>
                  <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg transition disabled:opacity-50">
                    {submitting ? 'Submitting...' : 'Submit Evaluation'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
