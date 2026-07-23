import React, { useEffect, useState } from 'react';
import api from '../../axios';

function initialsOf(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('');
}

export default function InstitutionStudents() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        setLoading(true);
        api.get('/admin/students', { params: { page, search: search || undefined } })
            .then((res) => {
                setStudents(res.data.data || []);
                setTotalPages(res.data.last_page || 1);
            })
            .catch(() => setStudents([]))
            .finally(() => setLoading(false));
    }, [page, search]);

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <h2 className="text-headline-sm font-headline-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">groups</span>
                    Students &amp; Cohorts
                </h2>
                <div className="flex items-center bg-surface-container-low px-4 py-2 rounded-full w-80 border border-border">
                    <span className="material-symbols-outlined text-on-surface-variant text-sm">search</span>
                    <input
                        className="bg-transparent border-none focus:ring-0 text-body-sm w-full ml-2 placeholder:text-on-surface-variant/60"
                        placeholder="Search by name, reg number..."
                        type="text"
                        value={search}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-surface-container-low text-label-caps text-on-surface-variant border-b border-border">
                            <tr>
                                <th className="px-6 py-3 font-bold">Student</th>
                                <th className="px-6 py-3 font-bold">Reg. Number</th>
                                <th className="px-6 py-3 font-bold">Program</th>
                                <th className="px-6 py-3 font-bold">Department</th>
                                <th className="px-6 py-3 font-bold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading && (
                                <tr>
                                    <td className="px-6 py-8 text-center text-body-sm text-on-surface-variant" colSpan={5}>
                                        Loading students...
                                    </td>
                                </tr>
                            )}
                            {!loading && students.length === 0 && (
                                <tr>
                                    <td className="px-6 py-8 text-center text-body-sm text-on-surface-variant" colSpan={5}>
                                        No students found.
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                students.map((student) => {
                                    const name = student.user?.name || 'Unknown';
                                    const regNo = student.registration_number || student.reg_number || '—';
                                    const program = student.program || '—';
                                    const department = student.department || '—';
                                    const hasPlacement = student.placements_count > 0 || student.active_placement;
                                    return (
                                        <tr className="hover:bg-background transition-colors" key={student.id}>
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-surface-container text-primary flex items-center justify-center font-bold text-xs">
                                                    {initialsOf(name)}
                                                </div>
                                                <span className="text-body-sm font-medium">{name}</span>
                                            </td>
                                            <td className="px-6 py-4 text-body-sm font-mono">{regNo}</td>
                                            <td className="px-6 py-4 text-body-sm">{program}</td>
                                            <td className="px-6 py-4 text-body-sm">{department}</td>
                                            <td className="px-6 py-4">
                                                {hasPlacement ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-subtle text-primary text-[10px] font-bold">
                                                        <span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Placed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-bold">
                                                        <span className="w-1.5 h-1.5 bg-on-surface-variant rounded-full"></span> Unplaced
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                        <p className="text-body-sm text-on-surface-variant">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                className="px-3 py-1.5 border border-border rounded-lg text-body-sm font-bold hover:bg-surface-container transition-colors disabled:opacity-40"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                Previous
                            </button>
                            <button
                                className="px-3 py-1.5 border border-border rounded-lg text-body-sm font-bold hover:bg-surface-container transition-colors disabled:opacity-40"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
