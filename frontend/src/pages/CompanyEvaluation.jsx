import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, Zap, Book, Star } from 'lucide-react';

export default function CompanyEvaluation() {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Anonymous rating of ${rating}/5 submitted!`);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex">
      <div className="w-64 bg-[var(--color-primary-dark)] text-white p-6 flex flex-col">
        <h1 className="text-xl font-bold mb-8">InduTrack KE</h1>
        <nav className="flex-1 space-y-2">
          <Link to="/student" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90"><Home size={18} /> Find Slots</Link>
          <Link to="/student/match" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90"><Zap size={18} /> Smart Match</Link>
          <Link to="/student/logbook" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90"><Book size={18} /> Logbook</Link>
          <Link to="/student/evaluation" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white"><Star size={18} /> Evaluate Company</Link>
        </nav>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-primary-dark)]">Student Portal</h2>
          <div className="text-sm font-medium text-[var(--color-text-secondary)]">{localStorage.getItem('context')}</div>
        </header>
        <div className="flex-1 p-8 flex items-center justify-center overflow-y-auto">
          <div className="bg-[var(--color-surface)] p-8 rounded-xl border border-[var(--color-border)] shadow-sm max-w-lg w-full">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Evaluate Your Attachment</h2>
            <p className="text-[var(--color-text-secondary)] mb-6 text-sm">Your feedback is 100% anonymous and helps future students choose the best companies.</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-[var(--color-text-primary)] mb-2">Overall Rating (1-5)</label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    key={star} 
                    type="button" 
                    onClick={() => setRating(star)}
                    className={`${rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'} hover:text-yellow-300 transition`}
                  >
                    <Star size={32} strokeWidth={1} fill={rating >= star ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-[var(--color-text-primary)] mb-2">Written Feedback</label>
              <textarea 
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 h-32 resize-none" 
                placeholder="What was good? What could be improved?"
                required
              ></textarea>
            </div>
            
            <button type="submit" disabled={rating === 0} className="w-full bg-[var(--color-primary)] disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-[var(--color-primary-light)] text-white px-6 py-3 rounded-md font-bold transition">
              Submit Anonymous Review
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
