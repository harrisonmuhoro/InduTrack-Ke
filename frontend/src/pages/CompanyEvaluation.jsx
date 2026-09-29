import { useState } from 'react';
import { Star } from 'lucide-react';
import AppShell, { PageHeader } from '../components/AppShell';

export default function CompanyEvaluation() {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Anonymous rating of ${rating}/5 submitted!`);
  };

  return (
    <AppShell portal="student">
      <div className="max-w-lg">
        <PageHeader
          kicker="After the last week"
          title="How was the attachment?"
          subtitle="Anonymous. The next cohort will thank you for being specific, not polite."
        />
        <form onSubmit={handleSubmit} className="sheet p-6 space-y-6">
          <div>
            <p className="text-sm font-semibold mb-2">Overall (1–5)</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={rating >= star ? 'text-[var(--copper)]' : 'text-[var(--rule)]'}
                  aria-label={`${star} stars`}
                >
                  <Star size={28} strokeWidth={1.4} fill={rating >= star ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm font-semibold">
            What should the next student know?
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              className="input mt-2 h-32 resize-none font-normal"
              required
            />
          </label>
          <button type="submit" disabled={rating === 0} className="btn btn-primary w-full">
            Send anonymous review
          </button>
        </form>
      </div>
    </AppShell>
  );
}
