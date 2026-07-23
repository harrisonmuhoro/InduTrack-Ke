import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import api from '../../axios';
import { fmt, timeAgo } from './shared';

const quickLinks = [
    {
        to: '/superadmin/institutions',
        icon: 'domain',
        title: 'Institutions',
        description: 'Register, activate and manage partner institutions.',
    },
    {
        to: '/superadmin/users',
        icon: 'group',
        title: 'Users',
        description: 'Browse and administer every account on the platform.',
    },
    {
        to: '/superadmin/audit-logs',
        icon: 'history_edu',
        title: 'Audit Logs',
        description: 'Review the full trail of system actions and events.',
    },
    {
        to: '/superadmin/system',
        icon: 'dns',
        title: 'System Health',
        description: 'Monitor storage, records and platform-wide metrics.',
    },
];

export default function OverviewPage() {
    const { openBroadcast } = useOutletContext();

    // ── Data state ────────────────────────────────────────────────────────────
    const [stats, setStats] = useState(null);          // GET /superadmin/dashboard
    const [flaggedCount, setFlaggedCount] = useState(0); // GET /superadmin/institutions
    const [auditLogs, setAuditLogs] = useState([]);       // GET /superadmin/audit-logs
    const [lastRefreshed, setLastRefreshed] = useState(null);

    // ── Fetch on mount ────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        api.get('/superadmin/dashboard')
            .then((res) => {
                if (cancelled) return;
                setStats(res.data);
                setLastRefreshed(new Date());
            })
            .catch(() => { if (!cancelled) setStats({}); });

        api.get('/superadmin/institutions')
            .then((res) => {
                if (cancelled) return;
                const rows = Array.isArray(res.data) ? res.data : [];
                setFlaggedCount(rows.filter((i) => i.is_active === false).length);
            })
            .catch(() => { if (!cancelled) setFlaggedCount(0); });

        api.get('/superadmin/audit-logs')
            .then((res) => {
                if (cancelled) return;
                const rows = Array.isArray(res.data?.data) ? res.data.data : [];
                setAuditLogs(rows.slice(0, 5));
            })
            .catch(() => { if (!cancelled) setAuditLogs([]); });

        return () => { cancelled = true; };
    }, []);

    // ── Derived values ────────────────────────────────────────────────────────
    const activeInstitutions = stats?.activeInstitutions ?? 0;
    const totalInstitutions = stats?.totalInstitutions ?? 0;

    return (
        <div className="space-y-gutter">

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="font-headline-md text-headline-md text-text-main">System Dashboard</h2>
                    <div className="flex items-center gap-3 mt-1 text-on-surface-variant">
                        <span className="font-label-code text-label-code bg-surface-container-low px-2 py-0.5 rounded border border-border">USERS: {fmt(stats?.totalUsers)}</span>
                        <span className="text-body-sm font-body-sm">•</span>
                        <span className="text-body-sm font-body-sm">{lastRefreshed ? `Last refreshed: ${lastRefreshed.toLocaleTimeString()}` : 'Loading system data...'}</span>
                    </div>
                </div>
                <button className="flex items-center gap-2 bg-[#F59E0B] hover:bg-accent-hover text-[#2a1700] px-6 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-95" onClick={openBroadcast}>
                    <span className="material-symbols-outlined">campaign</span>
                    <span className="font-label-caps text-label-caps uppercase tracking-wider">Broadcast Announcement</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-gutter">

                <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-primary-subtle p-2 rounded-lg">
                            <span className="material-symbols-outlined text-primary">account_balance</span>
                        </div>
                        <span className="text-primary text-[12px] font-bold">{fmt(totalInstitutions)} total</span>
                    </div>
                    <p className="text-outline font-label-caps text-label-caps uppercase">Active Institutions</p>
                    <h3 className="font-headline-md text-headline-md mt-1">{fmt(activeInstitutions)}</h3>
                </div>

                <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-surface-container p-2 rounded-lg">
                            <span className="material-symbols-outlined text-secondary">groups</span>
                        </div>
                        <span className="text-secondary text-[12px] font-bold">All time</span>
                    </div>
                    <p className="text-outline font-label-caps text-label-caps uppercase">Total Students</p>
                    <h3 className="font-headline-md text-headline-md mt-1">{fmt(stats?.totalStudents)}</h3>
                </div>

                <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-tertiary-fixed p-2 rounded-lg">
                            <span className="material-symbols-outlined text-tertiary">assignment_turned_in</span>
                        </div>
                        <span className="text-tertiary text-[12px] font-bold">All time</span>
                    </div>
                    <p className="text-outline font-label-caps text-label-caps uppercase">Total Placements</p>
                    <h3 className="font-headline-md text-headline-md mt-1">{fmt(stats?.totalPlacements)}</h3>
                </div>

                <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-surface-container-high p-2 rounded-lg">
                            <span className="material-symbols-outlined text-on-surface">verified</span>
                        </div>
                        <span className="text-on-surface-variant text-[12px] font-medium">Global</span>
                    </div>
                    <p className="text-outline font-label-caps text-label-caps uppercase">Companies Verified</p>
                    <h3 className="font-headline-md text-headline-md mt-1">{fmt(stats?.totalCompanies)}</h3>
                </div>

                <div className={flaggedCount > 0 ? 'bg-error-container border border-error/20 rounded-xl p-5 shadow-sm pulsing-red' : 'bg-error-container border border-error/20 rounded-xl p-5 shadow-sm'}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-white/50 p-2 rounded-lg">
                            <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                        </div>
                        <span className="text-error text-[12px] font-bold">{flaggedCount > 0 ? 'ATTENTION' : 'CLEAR'}</span>
                    </div>
                    <p className="text-error font-label-caps text-label-caps uppercase">Inactive Institutions</p>
                    <h3 className="font-headline-md text-headline-md mt-1 text-on-error-container">{String(flaggedCount).padStart(2, '0')}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                {quickLinks.map((link) => (
                    <Link className="p-4 bg-surface border border-border rounded-lg hover:border-primary-subtle hover:bg-primary-subtle/20 transition-all cursor-pointer group" key={link.to} to={link.to}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div className="bg-primary-subtle p-2 rounded-lg">
                                    <span className="material-symbols-outlined text-primary">{link.icon}</span>
                                </div>
                                <div>
                                    <p className="font-bold text-body-sm">{link.title}</p>
                                    <p className="text-[11px] text-outline font-label-code">{link.description}</p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">arrow_forward</span>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h4 className="font-headline-sm text-headline-sm">Recent Activity</h4>
                    <Link className="text-primary font-bold text-body-sm hover:underline" to="/superadmin/audit-logs">View all</Link>
                </div>
                <div className="space-y-6">
                    {auditLogs.length === 0 && (
                        <p className="text-body-sm text-outline">No audit log entries recorded yet.</p>
                    )}
                    {auditLogs.map((log, idx) => (
                        <div className="flex gap-4" key={log.id || idx}>
                            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                                <span className="material-symbols-outlined text-outline">history_edu</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-body-sm"><span className="font-bold">{log.user_name || log.actor || 'System'}</span> {log.action || log.event || 'performed an action'}{log.description ? ` — ${log.description}` : ''}</p>
                                <p className="text-[11px] text-outline mt-1 uppercase tracking-wider">{timeAgo(log.created_at)}{log.id ? ` • ID #LOG-${log.id}` : ''}</p>
                            </div>
                            <span className="material-symbols-outlined text-primary-hover">history_edu</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
