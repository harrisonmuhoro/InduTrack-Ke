import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../axios';

export default function StudentSmartMatch() {
  const { role, context } = useAuth();

  const [matches, setMatches] = useState([]);

  useEffect(() => {
    // Dummy fetch for smart matches
    setMatches([
      { id: 1, company: { name: 'Safaricom' }, department: 'Software Engineering', required_skills: 'React, Laravel' },
      { id: 2, company: { name: 'KRA' }, department: 'Data Science', required_skills: 'Python, SQL' },
    ]);
  }, []);

  return (
    <div className="p-margin-desktop space-y-gutter max-w-container-max mx-auto animate-in fade-in duration-300 w-full">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Recommended For You</h2>
      <p className="text-[var(--color-text-secondary)] mb-6">Based on your department and skills, we think you'd be a great fit for these roles:</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {matches.map(slot => (
          <div key={slot.id} className="bg-[var(--color-surface)] p-6 rounded-xl border-l-4 border-primary shadow-sm">
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
  );
}
