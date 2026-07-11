import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, Zap, Book, Star } from 'lucide-react';

export default function StudentSmartMatch() {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    // Dummy fetch for smart matches
    setMatches([
      { id: 1, company: { name: 'Safaricom' }, department: 'Software Engineering', required_skills: 'React, Laravel' },
      { id: 2, company: { name: 'KRA' }, department: 'Data Science', required_skills: 'Python, SQL' },
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex">
      <div className="w-64 bg-[var(--color-primary-dark)] text-white p-6 flex flex-col">
        <h1 className="text-xl font-bold mb-8">InduTrack KE</h1>
        <nav className="flex-1 space-y-2">
          <Link to="/student" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90"><Home size={18} /> Find Slots</Link>
          <Link to="/student/match" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white"><Zap size={18} /> Smart Match</Link>
          <Link to="/student/logbook" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90"><Book size={18} /> Logbook</Link>
          <Link to="/student/evaluation" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90"><Star size={18} /> Evaluate Company</Link>
        </nav>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-primary-dark)]">Student Portal</h2>
          <div className="text-sm font-medium text-[var(--color-text-secondary)]">{localStorage.getItem('context')}</div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Recommended For You</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">Based on your department and skills, we think you'd be a great fit for these roles:</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map(slot => (
            <div key={slot.id} className="bg-[var(--color-surface)] p-6 rounded-xl border-l-4 border-[var(--color-accent)] shadow-sm">
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{slot.company.name}</h3>
              <p className="text-[var(--color-text-secondary)] font-medium mb-2">{slot.department}</p>
              <div className="mb-4">
                <span className="text-sm font-bold text-[var(--color-text-secondary)]">Required Skills: </span>
                <span className="text-sm text-[var(--color-text-primary)]">{slot.required_skills}</span>
              </div>
              <button className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white px-4 py-2 rounded-md font-medium transition">
                Apply Now
              </button>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
