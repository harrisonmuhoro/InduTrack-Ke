import React, { useCallback, useEffect, useState } from 'react';
import api from '../../axios';
import { timeAgo, fmt } from './shared';

const CLIENT_CHUNK = 20;

export default function AuditLogsPage() {
    // ── Data state ────────────────────────────────────────────────────────────
    const [logs, setLogs] = useState([]);
    const [meta, setMeta] = useState(null); // { current_page, last_page, total } when backend paginates
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    // ── UI state ──────────────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(CLIENT_CHUNK); // client-side fallback
    const [refreshing, setRefreshing] = useState(false);
    const [justUpdated, setJustUpdated] = useState(false);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchLogs = useCallback((pageNum, { silent = false } = {}) => {
        let cancelled = false;
        if (!silent) setLoading(true);
        api.get('/superadmin/audit-logs', { params: { page: pageNum } })
            .then((res) => {
                if (cancelled) return;
                const rows = Array.isArray(res.data?.data) ? res.data.data : [];
                setLogs(rows);
                if (res.data?.last_page !== undefined) {
                    setMeta({
                        current_page: res.data.current_page || pageNum,
                        last_page: res.data.last_page || 1,
                        total: res.data.total ?? rows.length,
                    });
                } else {
                    setMeta(null);
                }
            })
            .catch(() => {
                if (cancelled) return;
                setLogs([]);
                setMeta(null);
            })
            .finally(() => {
                if (cancelled) return;
                setLoading(false);
                setRefreshing(false);
            });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => fetchLogs(page), [page, fetchLogs]);

    const handleRefresh = () => {
        if (refreshing) return;
        setRefreshing(true);
        fetchLogs(page, { silent: true });
        setJustUpdated(true);
        setTimeout(() => setJustUpdated(false), 2500);
    };

    // ── Derived values ────────────────────────────────────────────────────────
    const query = search.trim().toLowerCase();
    const filteredLogs = query
        ? logs.filter((log) =>
            [log.user_name, log.actor, log.action, log.event, log.description]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(query)
        )
        : logs;
    const serverPaginated = meta !== null && meta.last_page > 1;
    const visibleLogs = serverPaginated ? filteredLogs : filteredLogs.slice(0, visibleCount);

    return (
        <div className="space-y-gutter">

<div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
<div>
<h2 className="font-headline-md text-headline-md text-text-main">System Audit Log</h2>
<div className="flex items-center gap-3 mt-1 text-on-surface-variant">
{meta !== null && (
<span className="font-label-code text-label-code bg-surface-container-low px-2 py-0.5 rounded border border-border">ENTRIES: {fmt(meta.total)}</span>
)}
<span className="text-body-sm font-body-sm">{loading ? 'Loading audit trail...' : 'Chronological record of system activity'}</span>
</div>
</div>
<div className="flex items-center gap-3">
<span className={`text-[11px] font-bold text-primary uppercase tracking-wider transition-opacity duration-500 ${justUpdated ? 'opacity-100' : 'opacity-0'}`}>Updated</span>
<button className="p-2 border border-border rounded-lg text-outline hover:bg-surface-container-low transition-colors disabled:opacity-60" disabled={refreshing} onClick={handleRefresh} title="Refresh audit log">
<span className={`material-symbols-outlined ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
</button>
</div>
</div>

<div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
<div className="flex items-center justify-between mb-6 gap-4">
<h4 className="font-headline-sm text-headline-sm">System Audit Log</h4>
<span className="font-label-code text-label-code text-outline">Real-time update</span>
</div>

<div className="flex items-center gap-4 bg-surface-container-low px-4 py-2 rounded-full mb-6">
<span className="material-symbols-outlined text-outline">search</span>
<input
className="bg-transparent border-none focus:ring-0 text-body-sm font-body-sm w-full"
placeholder="Search by actor, action or description..."
type="text"
value={search}
onChange={(e) => { setSearch(e.target.value); setVisibleCount(CLIENT_CHUNK); }}
/>
{search && (
<button className="text-outline hover:text-primary transition-colors" onClick={() => setSearch('')} title="Clear search">
<span className="material-symbols-outlined text-[18px]">close</span>
</button>
)}
</div>

<div className="space-y-6">
{!loading && visibleLogs.length === 0 && (
<p className="text-body-sm text-outline">{query ? 'No audit log entries match your search.' : 'No audit log entries recorded yet.'}</p>
)}
{visibleLogs.map((log, idx) => (
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

{serverPaginated && (
<div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
<button className="flex items-center gap-1 px-4 py-2 border border-border rounded-lg text-body-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-40" disabled={loading || meta.current_page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
<span className="material-symbols-outlined text-[18px]">chevron_left</span>
                            Prev
                        </button>
<span className="font-label-code text-label-code text-outline">Page {fmt(meta.current_page)} of {fmt(meta.last_page)}</span>
<button className="flex items-center gap-1 px-4 py-2 border border-border rounded-lg text-body-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-40" disabled={loading || meta.current_page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
                            Next
<span className="material-symbols-outlined text-[18px]">chevron_right</span>
</button>
</div>
)}

{!serverPaginated && filteredLogs.length > visibleCount && (
<div className="mt-6 pt-4 border-t border-border flex justify-center">
<button className="text-primary font-bold text-body-sm hover:underline" onClick={() => setVisibleCount((c) => c + CLIENT_CHUNK)}>
                            Load More Entries ({fmt(filteredLogs.length - visibleCount)} remaining)
                        </button>
</div>
)}
</div>
        </div>
    );
}
