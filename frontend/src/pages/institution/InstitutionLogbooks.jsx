import React, { useEffect, useState } from 'react';
import api from '../../axios';

export default function InstitutionLogbooks() {
    const [analytics, setAnalytics] = useState({
        totalStudents: 0,
        activePlacements: 0,
    });

    const [compliance, setCompliance] = useState({
        inactive_students: [],
        flagged_students: [],
        pending_documents: [],
    });

    useEffect(() => {
        api.get('/admin/dashboard')
            .then((res) => setAnalytics((prev) => ({ ...prev, ...res.data })))
            .catch(() => {});

        api.get('/admin/compliance')
            .then((res) =>
                setCompliance({
                    inactive_students: res.data.inactive_students || [],
                    flagged_students: res.data.flagged_students || [],
                    pending_documents: res.data.pending_documents || [],
                })
            )
            .catch(() => {});
    }, []);

    const docsBar =
        analytics.totalStudents > 0
            ? Math.max(
                  0,
                  Math.round(
                      (1 - compliance.pending_documents.length / analytics.totalStudents) * 100
                  )
              )
            : 100;

    const logbookBar =
        analytics.activePlacements > 0
            ? Math.max(
                  0,
                  Math.round(
                      (1 - compliance.inactive_students.length / analytics.activePlacements) * 100
                  )
              )
            : 100;

    const evalBar =
        analytics.activePlacements > 0
            ? Math.max(
                  0,
                  Math.round(
                      (1 - compliance.flagged_students.length / analytics.activePlacements) * 100
                  )
              )
            : 100;

    const aggregateScore = Math.round((docsBar + logbookBar + evalBar) / 3);

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-headline-sm font-headline-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">security</span>
                        Institutional Compliance Health
                    </h2>
                    <span className="text-body-sm text-on-surface-variant font-medium">
                        Aggregate Score: <span className="text-primary font-bold">{aggregateScore}%</span>
                    </span>
                </div>
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between text-label-caps mb-2">
                            <span>Docs Approved (Insurance/Clearance)</span>
                            <span className="font-bold">{docsBar}%</span>
                        </div>
                        <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                            <div className="compliance-bar h-full bg-primary" style={{ width: `${docsBar}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-label-caps mb-2">
                            <span>Logbook Submission Rate (Bi-Weekly)</span>
                            <span className="font-bold">{logbookBar}%</span>
                        </div>
                        <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                            <div className="compliance-bar h-full bg-primary" style={{ width: `${logbookBar}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-label-caps mb-2">
                            <span>Evaluations Submitted (Industry Supervisors)</span>
                            <span className="font-bold">{evalBar}%</span>
                        </div>
                        <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                            <div className="compliance-bar h-full bg-[#F59E0B]" style={{ width: `${evalBar}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
