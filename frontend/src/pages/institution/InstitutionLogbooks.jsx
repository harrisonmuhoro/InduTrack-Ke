import React, { useEffect, useState } from 'react';
import { Eye, CheckCircle, AlertCircle, FileText, X } from 'lucide-react';
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

    const [placements, setPlacements] = useState([]);
    const [selectedPlacement, setSelectedPlacement] = useState(null);
    const [logbookData, setLogbookData] = useState(null);
    const [loadingLogbook, setLoadingLogbook] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/admin/dashboard').catch(() => ({ data: {} })),
            api.get('/admin/compliance').catch(() => ({ data: {} })),
            api.get('/admin/placements?status=active').catch(() => ({ data: { data: [] } })),
        ]).then(([dashRes, compRes, placeRes]) => {
            if (dashRes.data) setAnalytics((prev) => ({ ...prev, ...dashRes.data }));
            if (compRes.data) {
                setCompliance({
                    inactive_students: compRes.data.inactive_students || [],
                    flagged_students: compRes.data.flagged_students || [],
                    pending_documents: compRes.data.pending_documents || [],
                });
            }
            if (placeRes.data) {
                setPlacements(placeRes.data.data || placeRes.data || []);
            }
            setLoading(false);
        });
    }, []);

    const viewStudentLogbook = async (placement) => {
        setSelectedPlacement(placement);
        setLoadingLogbook(true);
        try {
            const res = await api.get(`/admin/placements/${placement.id}/logbook`);
            setLogbookData(res.data);
        } catch (err) {
            console.error(err);
            alert('Failed to load student logbook entries.');
        } finally {
            setLoadingLogbook(false);
        }
    };

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
            {/* Compliance Stats Bar */}
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

            {/* Active Placements & Student Logbook Review Table */}
            <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-primary" />
                    Student Logbook Records & Academic Review Queue
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    Inspect weekly submissions, lock status, and supervisor comments across active attachments within your institution.
                </p>

                {loading ? (
                    <p className="text-sm text-gray-500">Loading student placements...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600 border-collapse">
                            <thead>
                                <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-700 uppercase">
                                    <th className="py-3 px-4">Student</th>
                                    <th className="py-3 px-4">Host Company</th>
                                    <th className="py-3 px-4">Attachment Period</th>
                                    <th className="py-3 px-4">Placement Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {placements.map((p) => (
                                    <tr key={p.id} className="border-b hover:bg-gray-50/50 transition">
                                        <td className="py-3 px-4 font-semibold text-gray-900">{p.student?.user?.name || 'Student'}</td>
                                        <td className="py-3 px-4">{p.company?.name || 'Company'}</td>
                                        <td className="py-3 px-4 text-xs text-gray-500">{p.period?.name || 'Current'}</td>
                                        <td className="py-3 px-4">
                                            <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold capitalize">
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => viewStudentLogbook(p)}
                                                className="inline-flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-hover transition"
                                            >
                                                <Eye size={14} /> View Logbook
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {placements.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="py-4 text-center text-gray-400">
                                            No active student placements found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: View Student Logbook Detail */}
            {selectedPlacement && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-border p-6">
                        <div className="flex justify-between items-start border-b pb-4 mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    Logbook: {selectedPlacement.student?.user?.name}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Company: <strong>{selectedPlacement.company?.name}</strong>
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedPlacement(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {loadingLogbook ? (
                            <p className="text-sm text-gray-500 py-6 text-center">Loading weekly entries...</p>
                        ) : logbookData?.logbook_entries?.length === 0 ? (
                            <p className="text-sm text-gray-400 py-6 text-center">No weekly entries recorded yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {logbookData?.logbook_entries?.map((entry) => (
                                    <div key={entry.id} className="border rounded-xl p-4 bg-gray-50/50 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-sm text-gray-800">
                                                Week {entry.week_number} ({entry.entry_date})
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                                                        entry.status === 'approved'
                                                            ? 'bg-green-100 text-green-700'
                                                            : entry.status === 'rejected'
                                                            ? 'bg-red-100 text-red-700'
                                                            : entry.status === 'flagged'
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : 'bg-blue-100 text-blue-700'
                                                    }`}
                                                >
                                                    {entry.status}
                                                </span>
                                                {entry.locked_at && (
                                                    <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                                                        Locked
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-xs space-y-1 text-gray-700">
                                            <p>
                                                <strong>Key Activities:</strong> {entry.activities}
                                            </p>
                                            {entry.lessons_learned && (
                                                <p>
                                                    <strong>Lessons Learned:</strong> {entry.lessons_learned}
                                                </p>
                                            )}
                                            {entry.challenges && (
                                                <p>
                                                    <strong>Challenges & Solutions:</strong> {entry.challenges}
                                                </p>
                                            )}
                                            {entry.plan_next_week && (
                                                <p>
                                                    <strong>Plan for Next Week:</strong> {entry.plan_next_week}
                                                </p>
                                            )}
                                        </div>

                                        {entry.comments?.length > 0 && (
                                            <div className="mt-3 pt-2 border-t text-xs space-y-1">
                                                <p className="font-bold text-gray-700">Supervisor Feedback / Comments:</p>
                                                {entry.comments.map((c) => (
                                                    <p key={c.id} className="text-gray-600 bg-white p-2 rounded border">
                                                        <span className="font-semibold text-gray-800">{c.user?.name}:</span> {c.comment}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-6 pt-4 border-t flex justify-end">
                            <button
                                onClick={() => setSelectedPlacement(null)}
                                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
