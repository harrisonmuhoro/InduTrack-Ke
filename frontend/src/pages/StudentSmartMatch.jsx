import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../axios';
import AppShell, { PageHeader } from '../components/AppShell';

export default function StudentSmartMatch() {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    setMatches([
      { id: 1, company: { name: 'Safaricom' }, department: 'Software Engineering', required_skills: 'React, Laravel' },
      { id: 2, company: { name: 'KRA' }, department: 'Data Science', required_skills: 'Python, SQL' },
    ]);
  }, []);

  return (
    <AppShell portal="student">
      <PageHeader
        kicker="Worth a look"
        title="Suggested desks"
        subtitle="Matches from your department and skills — treat them as a shortlist, not a verdict."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {matches.map(slot => (
          <article key={slot.id} className="sheet p-6 border-l-4 border-l-[var(--copper)]">
            <h3 className="font-display text-2xl">{slot.company.name}</h3>
            <p className="text-[var(--forest)] font-semibold mt-1">{slot.department}</p>
            <p className="mt-4 text-sm text-[var(--ink-soft)]">
              <span className="uppercase tracking-[0.1em] text-[0.68rem] font-bold">They asked for </span>
              {slot.required_skills}
            </p>
            <Link to="/student/applications" className="btn btn-primary w-full mt-5">Write to them</Link>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
