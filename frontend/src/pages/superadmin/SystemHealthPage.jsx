import React, { useCallback, useEffect, useState } from 'react';
import api from '../../axios';
import { fmt } from './shared';

const STAT_TILES = [
    { key: 'total_logbook_entries', label: 'Logbook Entries' },
    { key: 'total_documents', label: 'Documents' },
    { key: 'total_evaluations', label: 'Evaluations' },
    { key: 'total_field_visits', label: 'Field Visits' },
    { key: 'total_messages', label: 'Messages' },
];

export default function SystemHealthPage() {
    const [systemStats, setSystemStats] = useState(null); // GET /superadmin/system-stats
    const [stats, setStats] = useState(null);             // GET /superadmin/dashboard
    const [latency, setLatency] = useState(null);
    const [lastRefreshed, setLastRefreshed] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const fetchSystemStats = useCallback(() => {
        const t0 = performance.now();
        return api.get('/superadmin/system-stats')
            .then((res) => {
                setSystemStats(res.data);
                setLatency(Math.round(performance.now() - t0));
                setLastRefreshed(new Date());
            })
            .catch(() => setSystemStats((s) => s || {}));
    }, []);

    // ── Fetch on mount ────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        fetchSystemStats();

        api.get('/superadmin/dashboard')
            .then((res) => { if (!cancelled) setStats(res.data); })
            .catch(() => { if (!cancelled) setStats({}); });

        return () => { cancelled = true; };
    }, [fetchSystemStats]);

    // ── Auto-refresh every 30s while enabled ──────────────────────────────────
    useEffect(() => {
        if (!autoRefresh) return undefined;
        const id = setInterval(fetchSystemStats, 30000);
        return () => clearInterval(id);
    }, [autoRefresh, fetchSystemStats]);

    // ── Derived values ────────────────────────────────────────────────────────
    const storageUsed = systemStats?.storage_used || '0 MB';
    const storageMb = parseFloat(storageUsed) || 0;
    const storagePct = Math.min(100, Math.round((storageMb / 1024) * 100));

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="font-headline-md text-headline-md text-text-main">System Health</h2>
                    <div className="flex items-center gap-3 mt-1 text-on-surface-variant">
                        <span className="font-label-code text-label-code bg-surface-container-low px-2 py-0.5 rounded border border-border">STORAGE: {storageUsed}</span>
                        <span className="text-body-sm font-body-sm">•</span>
                        <span className="text-body-sm font-body-sm">{lastRefreshed ? `Last refreshed ${lastRefreshed.toLocaleTimeString()}` : 'Loading system data...'}</span>
                    </div>
                </div>
                <button
                    className={autoRefresh
                        ? 'flex items-center gap-2 bg-primary-container text-on-primary px-6 py-3 rounded-lg font-bold shadow-md transition-all active:scale-95'
                        : 'flex items-center gap-2 bg-surface border border-border text-on-surface-variant px-6 py-3 rounded-lg font-bold shadow-sm hover:shadow-md transition-all active:scale-95'}
                    onClick={() => setAutoRefresh((v) => !v)}
                >
                    <span className="material-symbols-outlined">{autoRefresh ? 'toggle_on' : 'toggle_off'}</span>
                    <span className="font-label-caps text-label-caps uppercase tracking-wider">{autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}</span>
                </button>
            </div>

            <div className="bg-[#0b1c30] text-white rounded-xl p-6 shadow-xl relative overflow-hidden">

                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 blur-3xl rounded-full"></div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="font-headline-sm text-headline-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary-fixed">dns</span>
                            System Health
                        </h4>
                        <span className="bg-primary/20 text-primary-fixed text-[10px] px-2 py-0.5 rounded-full border border-primary/30">NOMINAL</span>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-label-caps text-label-caps uppercase mb-2">
                                <span className="text-surface-variant/70">Storage Used</span>
                                <span>{storageUsed}</span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="bg-[#F59E0B] h-full" style={{ width: `${storagePct}%` }}></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {STAT_TILES.map((tile) => (
                                <div className="bg-white/5 p-4 rounded-lg border border-white/10" key={tile.key}>
                                    <p className="text-surface-variant/60 text-label-caps text-label-caps uppercase text-[10px]">{tile.label}</p>
                                    <p className="text-headline-sm font-headline-sm mt-1">{fmt(systemStats?.[tile.key])}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <span className="text-body-sm text-surface-variant/70">Server Latency</span>
                            <span className="text-body-sm font-bold text-primary-fixed">{latency !== null ? `${latency}ms` : '—'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-gutter">

                <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-primary-subtle p-2 rounded-lg">
                            <span className="material-symbols-outlined text-primary">group</span>
                        </div>
                        <span className="text-primary text-[12px] font-bold">All time</span>
                    </div>
                    <p className="text-outline font-label-caps text-label-caps uppercase">Total Users</p>
                    <h3 className="font-headline-md text-headline-md mt-1">{fmt(stats?.totalUsers)}</h3>
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

                <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-primary-subtle p-2 rounded-lg">
                            <span className="material-symbols-outlined text-primary">account_balance</span>
                        </div>
                        <span className="text-primary text-[12px] font-bold">{fmt(stats?.activeInstitutions)} active</span>
                    </div>
                    <p className="text-outline font-label-caps text-label-caps uppercase">Institutions</p>
                    <h3 className="font-headline-md text-headline-md mt-1">{fmt(stats?.totalInstitutions)}</h3>
                </div>
            </div>
        </>
    );
}
