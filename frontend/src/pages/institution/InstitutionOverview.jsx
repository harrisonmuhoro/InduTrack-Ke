import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';

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

export default function InstitutionOverview() {
    const { context } = useAuth();
    const navigate = useNavigate();
    const institutionName = context || 'Institution';

    const [analytics, setAnalytics] = useState({
        totalStudents: 0,
        activePlacements: 0,
        completedPlacements: 0,
        flaggedStudents: 0,
        placementRate: 0,
    });
    const [pendingTotal, setPendingTotal] = useState(0);
    const [flaggedRows, setFlaggedRows] = useState([]);
    
    const [showAllFlags, setShowAllFlags] = useState(false);
    const [quickActionNotice, setQuickActionNotice] = useState('');
    const [showUpdateDetails, setShowUpdateDetails] = useState(false);
    const [actionBusy, setActionBusy] = useState(null);

    useEffect(() => {
        api.get('/admin/dashboard')
            .then((res) => setAnalytics((prev) => ({ ...prev, ...res.data })))
            .catch(() => {});

        api.get('/admin/compliance')
            .then((res) => setFlaggedRows(res.data.flagged_students || []))
            .catch(() => {});

        api.get('/admin/placements', { params: { status: 'pending' } })
            .then((res) => setPendingTotal(res.data.total ?? (res.data.data || []).length))
            .catch(() => {});
    }, []);

    const handleResolveFlag = async (flagId) => {
        setActionBusy(`flag-${flagId}`);
        try {
            await api.put(`/admin/flags/${flagId}/resolve`);
            setFlaggedRows((prev) => prev.filter((f) => f.id !== flagId));
            setAnalytics((prev) => ({
                ...prev,
                flaggedStudents: Math.max(0, prev.flaggedStudents - 1),
            }));
        } catch (err) {
            console.error(err);
        } finally {
            setActionBusy(null);
        }
    };

    const displayedFlags = showAllFlags ? flaggedRows : flaggedRows.slice(0, 2);

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Hero Section */}
            <div className="flex justify-between items-end bg-gradient-to-r from-error to-[#93000a] p-8 rounded-xl text-white shadow-lg overflow-hidden relative">
                <div className="z-10">
                    <h1 className="font-headline-md text-headline-md mb-1">Admin Dashboard — {institutionName}</h1>
                    <p className="text-body-md opacity-90">Reporting Period: {new Date().toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}</p>
                </div>
                <button
                    className="z-10 flex items-center gap-3 bg-[#F59E0B] hover:bg-accent-hover text-on-secondary-container font-bold px-6 py-3 rounded-lg transition-transform active:scale-95 shadow-md"
                    onClick={() => navigate('/institution/placements')}
                >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
                    Approve Placements ({pendingTotal})
                </button>
                <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <span className="material-symbols-outlined text-primary">groups</span>
                    </div>
                    <p className="text-label-caps text-on-surface-variant">Total Students</p>
                    <h3 className="text-headline-sm font-headline-sm">{analytics.totalStudents.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <span className="material-symbols-outlined text-primary">check_circle</span>
                        <span className="text-[10px] font-bold text-primary bg-primary-subtle px-2 py-0.5 rounded-full">Goal: 95%</span>
                    </div>
                    <p className="text-label-caps text-on-surface-variant">Placed %</p>
                    <h3 className="text-headline-sm font-headline-sm">{analytics.placementRate}%</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <span className="material-symbols-outlined text-tertiary">work_history</span>
                    </div>
                    <p className="text-label-caps text-on-surface-variant">Active</p>
                    <h3 className="text-headline-sm font-headline-sm">{analytics.activePlacements.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <span className="material-symbols-outlined text-primary-container">assignment_turned_in</span>
                    </div>
                    <p className="text-label-caps text-on-surface-variant">Completed</p>
                    <h3 className="text-headline-sm font-headline-sm">{analytics.completedPlacements.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[#F59E0B]/30 bg-[#FFFBEB] shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <span className="material-symbols-outlined text-secondary-container">pending_actions</span>
                    </div>
                    <p className="text-label-caps text-[#B45309]">Pending</p>
                    <h3 className="text-headline-sm font-headline-sm text-[#B45309]">{pendingTotal.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-error/20 bg-error-container/20 shadow-sm flex flex-col gap-2 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <span className="material-symbols-outlined text-error">report</span>
                        <div className="w-2.5 h-2.5 bg-error rounded-full pulsing-dot"></div>
                    </div>
                    <p className="text-label-caps text-error">Flagged</p>
                    <h3 className="text-headline-sm font-headline-sm text-error">{analytics.flaggedStudents.toLocaleString()}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Urgent Action Required */}
                    <div className="bg-white rounded-xl border-t-4 border-error shadow-sm border-x border-b border-border overflow-hidden">
                        <div className="p-4 border-b border-border flex justify-between items-center">
                            <h3 className="text-headline-sm font-headline-sm text-error flex items-center gap-2">
                                <span className="material-symbols-outlined">warning</span>
                                Urgent Action Required
                            </h3>
                            <button
                                className="text-label-caps text-primary font-bold hover:underline"
                                onClick={() => setShowAllFlags((v) => !v)}
                            >
                                {showAllFlags ? 'Show Less' : `View All${flaggedRows.length > 0 ? ` (${flaggedRows.length})` : ''}`}
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-surface-container-low text-label-caps text-on-surface-variant border-b border-border">
                                    <tr>
                                        <th className="px-6 py-3 font-bold">Student</th>
                                        <th className="px-6 py-3 font-bold">Company</th>
                                        <th className="px-6 py-3 font-bold">Severity</th>
                                        <th className="px-6 py-3 font-bold">Date</th>
                                        <th className="px-6 py-3 font-bold">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {displayedFlags.length === 0 && (
                                        <tr>
                                            <td className="px-6 py-4 text-body-sm text-on-surface-variant" colSpan={5}>
                                                No urgent actions — no unresolved flags.
                                            </td>
                                        </tr>
                                    )}
                                    {displayedFlags.map((flag) => {
                                        const studentName = flag.placement?.student?.user?.name || 'Unknown Student';
                                        const companyName = flag.placement?.company?.name || '—';
                                        const isHigh = (flag.severity || '').toLowerCase() === 'high';
                                        return (
                                            <tr className="hover:bg-background transition-colors" key={flag.id}>
                                                <td className="px-6 py-4 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-surface-container text-primary flex items-center justify-center font-bold text-xs">
                                                        {initialsOf(studentName)}
                                                    </div>
                                                    <span className="text-body-sm font-medium">{studentName}</span>
                                                </td>
                                                <td className="px-6 py-4 text-body-sm">{companyName}</td>
                                                <td className="px-6 py-4">
                                                    {isHigh ? (
                                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container text-error text-[10px] font-bold">
                                                            <span className="w-1.5 h-1.5 bg-error rounded-full"></span> High
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed-dim/20 text-secondary-container text-[10px] font-bold">
                                                            <span className="w-1.5 h-1.5 bg-secondary-container rounded-full"></span>{' '}
                                                            {flag.severity ? flag.severity.charAt(0).toUpperCase() + flag.severity.slice(1) : 'Medium'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-body-sm text-on-surface-variant">{formatDate(flag.created_at)}</td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        className="text-primary hover:text-primary-hover font-bold text-body-sm"
                                                        disabled={actionBusy === `flag-${flag.id}`}
                                                        onClick={() => handleResolveFlag(flag.id)}
                                                    >
                                                        {actionBusy === `flag-${flag.id}` ? '...' : 'Resolve'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Quick Actions */}
                    <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                        <h3 className="text-headline-sm font-headline-sm mb-6">Quick Actions</h3>
                        {quickActionNotice && (
                            <div className="mb-4 p-3 border border-border rounded-lg bg-surface-container-low flex items-start justify-between gap-2">
                                <p className="text-body-sm text-on-surface-variant">{quickActionNotice}</p>
                                <button
                                    className="text-on-surface-variant hover:text-primary transition-colors"
                                    onClick={() => setQuickActionNotice('')}
                                    aria-label="Dismiss"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                className="flex flex-col items-center justify-center gap-2 p-4 border border-border rounded-lg hover:border-primary hover:text-primary transition-all group"
                                onClick={() => setQuickActionNotice('Adding companies is coming soon — manage host companies via the Super Admin.')}
                            >
                                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">domain_add</span>
                                <span className="text-label-caps text-center">Add Company</span>
                            </button>
                            <button
                                className="flex flex-col items-center justify-center gap-2 p-4 border border-border rounded-lg hover:border-primary hover:text-primary transition-all group"
                                onClick={() => setQuickActionNotice('Supervisor assignment is coming soon — manage supervisors via the Super Admin.')}
                            >
                                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">person_add</span>
                                <span className="text-label-caps text-center">Assign Supv.</span>
                            </button>
                            <button
                                className="flex flex-col items-center justify-center gap-2 p-4 border border-border rounded-lg hover:border-primary hover:text-primary transition-all group"
                                onClick={() => window.open('http://localhost:8000/api/admin/reports/placements?format=csv', '_blank')}
                            >
                                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">download</span>
                                <span className="text-label-caps text-center">Export Reports</span>
                            </button>
                            <button
                                className="flex flex-col items-center justify-center gap-2 p-4 border border-border rounded-lg hover:border-primary hover:text-primary transition-all group"
                                onClick={() => navigate('/messages')}
                            >
                                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">mail</span>
                                <span className="text-label-caps text-center">Bulk Notify</span>
                            </button>
                        </div>
                    </div>

                    {/* System Update */}
                    <div className="bg-primary-subtle p-6 rounded-xl border border-primary-container/20">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="material-symbols-outlined text-primary-container">info</span>
                            <h4 className="font-bold text-primary-container">System Update</h4>
                        </div>
                        <p className="text-body-sm text-on-primary-fixed-variant leading-relaxed mb-4">
                            Logbook validation now requires supervisor digital signature. New templates available in the settings.
                        </p>
                        {showUpdateDetails && (
                            <p className="text-body-sm text-on-primary-fixed-variant leading-relaxed mb-4 pt-3 border-t border-primary-container/20">
                                Supervisors now sign off each logbook week digitally before it can be counted toward the required attachment weeks. Ask your academic supervisors to review pending entries under their dashboards, and download the updated logbook templates from Settings.
                            </p>
                        )}
                        <a
                            className="text-body-sm font-bold text-primary hover:underline flex items-center gap-1"
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                setShowUpdateDetails((v) => !v);
                            }}
                        >
                            {showUpdateDetails ? 'Show Less' : 'Learn More'}{' '}
                            <span className="material-symbols-outlined text-sm">{showUpdateDetails ? 'expand_less' : 'arrow_forward'}</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
