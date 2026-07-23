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

function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('en-KE', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return '—';
    }
}

export default function InstitutionPlacements() {
    const [pendingPlacements, setPendingPlacements] = useState([]);
    const [pendingTotal, setPendingTotal] = useState(0);
    const [actionBusy, setActionBusy] = useState(null);
    const [expandedPlacement, setExpandedPlacement] = useState(null);

    useEffect(() => {
        api.get('/admin/placements', { params: { status: 'pending' } })
            .then((res) => {
                setPendingPlacements(res.data.data || []);
                setPendingTotal(res.data.total ?? (res.data.data || []).length);
            })
            .catch(() => {});
    }, []);

    const handleApprove = async (id) => {
        setActionBusy(id);
        try {
            await api.put(`/admin/placements/${id}/approve`);
            setPendingPlacements((prev) => prev.filter((p) => p.id !== id));
            setPendingTotal((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error(err);
        } finally {
            setActionBusy(null);
        }
    };

    const handleReject = async (id) => {
        setActionBusy(id);
        try {
            await api.put(`/admin/placements/${id}/reject`);
            setPendingPlacements((prev) => prev.filter((p) => p.id !== id));
            setPendingTotal((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error(err);
        } finally {
            setActionBusy(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl border border-border shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-headline-sm font-headline-sm">Approval Queue & Placement Tracker</h3>
                    <span className="text-label-caps bg-surface-container px-3 py-1 rounded-full font-bold">
                        {pendingTotal} New Applications
                    </span>
                </div>
                <div className="space-y-4">
                    {pendingPlacements.length === 0 && (
                        <p className="text-body-sm text-on-surface-variant">No pending placements awaiting approval.</p>
                    )}
                    {pendingPlacements.map((placement) => {
                        const studentName = placement.student?.user?.name || 'Unknown Student';
                        const program = placement.student?.program || placement.student?.department || 'Student';
                        const companyName = placement.company?.name || 'Unknown Company';
                        const periodName = placement.period?.name || 'Attachment';
                        const isExpanded = expandedPlacement === placement.id;

                        return (
                            <div className="p-4 border border-border rounded-lg group hover:border-primary-container transition-colors" key={placement.id}>
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-12 h-12 rounded bg-surface-container text-primary flex items-center justify-center font-bold text-sm p-1 border border-border">
                                            {initialsOf(companyName)}
                                        </div>
                                        <div>
                                            <h4 className="text-body-md font-bold">{studentName} — {program}</h4>
                                            <p className="text-body-sm text-on-surface-variant">{companyName} • {periodName}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            className="px-4 py-2 text-primary border border-primary hover:bg-primary-subtle rounded-lg text-body-sm font-bold transition-colors"
                                            onClick={() => setExpandedPlacement((cur) => (cur === placement.id ? null : placement.id))}
                                        >
                                            {isExpanded ? 'Hide' : 'Details'}
                                        </button>
                                        <button
                                            className="px-4 py-2 border border-error text-error hover:bg-error-container/20 rounded-lg text-body-sm font-bold transition-colors"
                                            disabled={actionBusy === placement.id}
                                            onClick={() => handleReject(placement.id)}
                                        >
                                            Reject
                                        </button>
                                        <button
                                            className="px-4 py-2 bg-primary-container text-white hover:bg-primary-hover rounded-lg text-body-sm font-bold transition-colors"
                                            disabled={actionBusy === placement.id}
                                            onClick={() => handleApprove(placement.id)}
                                        >
                                            {actionBusy === placement.id ? '...' : 'Approve'}
                                        </button>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-x-6 gap-y-2">
                                        <p className="text-body-sm text-on-surface-variant">Period: <span className="font-bold text-text-main">{periodName}</span></p>
                                        <p className="text-body-sm text-on-surface-variant">Status: <span className="font-bold text-text-main">{placement.status ? placement.status.charAt(0).toUpperCase() + placement.status.slice(1) : 'Pending'}</span></p>
                                        <p className="text-body-sm text-on-surface-variant">Start Date: <span className="font-bold text-text-main">{formatDate(placement.period?.start_date)}</span></p>
                                        <p className="text-body-sm text-on-surface-variant">End Date: <span className="font-bold text-text-main">{formatDate(placement.period?.end_date)}</span></p>
                                        <p className="text-body-sm text-on-surface-variant">Student Program: <span className="font-bold text-text-main">{program}</span></p>
                                        <p className="text-body-sm text-on-surface-variant">Applied: <span className="font-bold text-text-main">{formatDate(placement.created_at)}</span></p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
