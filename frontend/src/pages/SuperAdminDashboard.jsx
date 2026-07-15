import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../axios';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';

// ── Helpers ──────────────────────────────────────────────────────────────────
function initialsOf(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('');
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const then = new Date(dateStr).getTime();
    if (Number.isNaN(then)) return '';
    const secs = Math.floor((Date.now() - then) / 1000);
    if (secs < 60) return 'Just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} Minute${mins === 1 ? '' : 's'} Ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} Hour${hrs === 1 ? '' : 's'} Ago`;
    const days = Math.floor(hrs / 24);
    return `${days} Day${days === 1 ? '' : 's'} Ago`;
}

function fmt(n) {
    if (n === null || n === undefined) return '0';
    return Number(n).toLocaleString();
}

export default function SuperAdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // ── Data state ────────────────────────────────────────────────────────────
    const [stats, setStats] = useState(null);          // GET /superadmin/dashboard
    const [systemStats, setSystemStats] = useState(null); // GET /superadmin/system-stats
    const [institutions, setInstitutions] = useState([]); // GET /superadmin/institutions
    const [auditLogs, setAuditLogs] = useState([]);        // GET /superadmin/audit-logs
    const [latency, setLatency] = useState(null);
    const [lastRefreshed, setLastRefreshed] = useState(null);

    // ── UI state ──────────────────────────────────────────────────────────────
    const [toast, setToast] = useState({ visible: false, title: '', body: '' });
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [broadcastSending, setBroadcastSending] = useState(false);
    const [broadcastError, setBroadcastError] = useState('');
    const [showAddInstitution, setShowAddInstitution] = useState(false);
    const [instForm, setInstForm] = useState({ name: '', domain: '', contact_email: '' });
    const [instSaving, setInstSaving] = useState(false);
    const [instError, setInstError] = useState('');
    const [showAllInstitutions, setShowAllInstitutions] = useState(false);
    const [instFilter, setInstFilter] = useState('all'); // 'all' | 'active' | 'inactive'

    // ── Section refs for sidebar scroll navigation ────────────────────────────
    const statsRef = useRef(null);
    const institutionsRef = useRef(null);
    const systemHealthRef = useRef(null);

    const scrollToSection = (ref) => (e) => {
        e.preventDefault();
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const showToast = (title, body) => {
        setToast({ visible: true, title, body });
        setTimeout(() => setToast((t) => ({ ...t, visible: false })), 5000);
    };

    // ── Fetch on mount ────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        const t0 = performance.now();

        api.get('/superadmin/dashboard')
            .then((res) => {
                if (cancelled) return;
                setStats(res.data);
                setLatency(Math.round(performance.now() - t0));
                setLastRefreshed(new Date());
            })
            .catch(() => { if (!cancelled) setStats({}); });

        api.get('/superadmin/system-stats')
            .then((res) => { if (!cancelled) setSystemStats(res.data); })
            .catch(() => { if (!cancelled) setSystemStats({}); });

        api.get('/superadmin/institutions')
            .then((res) => { if (!cancelled) setInstitutions(Array.isArray(res.data) ? res.data : []); })
            .catch(() => { if (!cancelled) setInstitutions([]); });

        api.get('/superadmin/audit-logs')
            .then((res) => {
                if (cancelled) return;
                const rows = Array.isArray(res.data?.data) ? res.data.data : [];
                setAuditLogs(rows);
            })
            .catch(() => { if (!cancelled) setAuditLogs([]); });

        return () => { cancelled = true; };
    }, []);

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (!broadcastMsg.trim()) return;
        setBroadcastSending(true);
        setBroadcastError('');
        try {
            const res = await api.post('/superadmin/broadcast', { message: broadcastMsg.trim() });
            setShowBroadcast(false);
            setBroadcastMsg('');
            showToast('Announcement sent', res.data?.message || 'Broadcast delivered to all users.');
        } catch (err) {
            setBroadcastError(err.response?.data?.message || 'Failed to send announcement. Please try again.');
        } finally {
            setBroadcastSending(false);
        }
    };

    const handleAddInstitution = async (e) => {
        e.preventDefault();
        if (!instForm.name.trim()) return;
        setInstSaving(true);
        setInstError('');
        try {
            const payload = { name: instForm.name.trim() };
            if (instForm.domain.trim()) payload.domain = instForm.domain.trim();
            if (instForm.contact_email.trim()) payload.contact_email = instForm.contact_email.trim();
            const res = await api.post('/superadmin/institutions', payload);
            setInstitutions((prev) => [...prev, res.data].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
            setShowAddInstitution(false);
            setInstForm({ name: '', domain: '', contact_email: '' });
            showToast('Institution added', `${res.data?.name || 'Institution'} has been registered.`);
        } catch (err) {
            setInstError(err.response?.data?.message || 'Failed to add institution. Check the details and try again.');
        } finally {
            setInstSaving(false);
        }
    };

    const handleToggleInstitution = async (inst) => {
        try {
            const res = await api.put(`/superadmin/institutions/${inst.id}/toggle`);
            const updated = res.data?.institution;
            if (updated) {
                setInstitutions((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            }
            showToast('Institution updated', res.data?.message || 'Status changed.');
        } catch {
            showToast('Update failed', 'Could not change institution status.');
        }
    };

    const cycleInstFilter = () => {
        setInstFilter((f) => (f === 'all' ? 'active' : f === 'active' ? 'inactive' : 'all'));
    };

    const handleDownloadInstitutions = () => {
        const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const header = ['Name', 'Domain', 'Contact', 'Status', 'Registered'];
        const rows = institutions.map((inst) => [
            esc(inst.name),
            esc(inst.domain || ''),
            esc(inst.contact_email || ''),
            esc(inst.is_active !== false ? 'Active' : 'Inactive'),
            esc(inst.created_at ? new Date(inst.created_at).toLocaleDateString() : ''),
        ].join(','));
        const csv = [header.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'institutions.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Export ready', `Downloaded ${institutions.length} institution record${institutions.length === 1 ? '' : 's'} as CSV.`);
    };

    // ── Derived values ────────────────────────────────────────────────────────
    const activeInstitutions = stats?.activeInstitutions ?? 0;
    const totalInstitutions = stats?.totalInstitutions ?? 0;
    const flaggedCount = institutions.filter((i) => i.is_active === false).length;
    const storageUsed = systemStats?.storage_used || '0 MB';
    const storageMb = parseFloat(storageUsed) || 0;
    const storagePct = Math.min(100, Math.round((storageMb / 1024) * 100));
    const filteredInstitutions = institutions.filter((i) =>
        instFilter === 'all' ? true : instFilter === 'active' ? i.is_active !== false : i.is_active === false
    );
    const visibleInstitutions = showAllInstitutions ? filteredInstitutions : filteredInstitutions.slice(0, 5);
    const topInstitutions = institutions.filter((i) => i.is_active !== false).slice(0, 3);

    return (
        <div className="font-body-md text-body-md overflow-x-hidden min-h-screen bg-[var(--color-bg)]">


<aside className="fixed left-0 top-0 h-screen w-sidebar-width bg-[#064D37] flex flex-col py-gutter z-50 shadow-sm overflow-y-auto">
<div className="px-6 mb-10">
<h1 className="text-surface font-headline-md text-headline-md font-bold tracking-tight">InduTrack KE</h1>
<p className="text-surface-variant/70 text-label-caps font-label-caps uppercase mt-1">Super Admin Portal</p>
</div>
<nav className="flex-1 space-y-1">
<Link className="flex items-center gap-3 bg-primary-container text-on-primary border-l-4 border-[#F59E0B] px-4 py-3 relative group transition-transform duration-200 translate-x-1" to="/superadmin">
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
<span className="font-label-caps text-label-caps">Dashboard</span>
</Link>
<a className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-4 py-3 transition-colors duration-200" href="#" onClick={scrollToSection(institutionsRef)}>
<span className="material-symbols-outlined">domain</span>
<span className="font-label-caps text-label-caps">Institutions</span>
</a>
<a className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-4 py-3 transition-colors duration-200" href="#" onClick={scrollToSection(statsRef)}>
<span className="material-symbols-outlined">handshake</span>
<span className="font-label-caps text-label-caps">Industry Partners</span>
</a>
<a className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-4 py-3 transition-colors duration-200" href="#" onClick={scrollToSection(systemHealthRef)}>
<span className="material-symbols-outlined">menu_book</span>
<span className="font-label-caps text-label-caps">Student Logbooks</span>
</a>
<a className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-4 py-3 transition-colors duration-200" href="#" onClick={scrollToSection(statsRef)}>
<span className="material-symbols-outlined">location_on</span>
<span className="font-label-caps text-label-caps">Placement Tracker</span>
</a>
<Link className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-4 py-3 transition-colors duration-200" to="/messages">
<span className="material-symbols-outlined">chat</span>
<span className="font-label-caps text-label-caps">Messages</span>
</Link>
<Link className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-4 py-3 transition-colors duration-200" to="/profile">
<span className="material-symbols-outlined">settings</span>
<span className="font-label-caps text-label-caps">Settings</span>
</Link>
</nav>
<div className="mt-auto px-4 space-y-1 border-t border-surface-variant/10 pt-4">
<button className="w-full flex items-center justify-center gap-2 bg-[#F59E0B] hover:bg-accent-hover text-on-secondary-container font-bold py-3 rounded-lg transition-all active:scale-95 mb-6" onClick={() => setShowBroadcast(true)}>
<span className="material-symbols-outlined text-[20px]">add</span>
<span className="font-label-caps text-label-caps">New Announcement</span>
</button>
<a className="flex items-center gap-3 text-surface-variant/80 hover:text-surface px-4 py-2 transition-colors duration-200" href="mailto:support@indutrack.ke">
<span className="material-symbols-outlined">help</span>
<span className="font-label-caps text-label-caps">Help Center</span>
</a>
<button className="w-full flex items-center gap-3 text-surface-variant/80 hover:text-error px-4 py-2 transition-colors duration-200" onClick={handleLogout}>
<span className="material-symbols-outlined">logout</span>
<span className="font-label-caps text-label-caps">Logout</span>
</button>
</div>
</aside>

<main className="ml-sidebar-width min-h-screen pb-12">

<header className="sticky top-0 bg-surface z-40 border-b border-border h-16 flex items-center justify-between px-margin-desktop">
<div className="flex items-center gap-4 bg-surface-container-low px-4 py-2 rounded-full w-96">
<span className="material-symbols-outlined text-outline">search</span>
<input className="bg-transparent border-none focus:ring-0 text-body-sm font-body-sm w-full" placeholder="Search system records, student IDs..." type="text"/>
</div>
<div className="flex items-center gap-6">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary">circle</span>
<span className="font-label-caps text-label-caps text-primary">System Online</span>
</div>
<div className="h-6 w-[1px] bg-border"></div>
<NotificationBell buttonClassName="relative text-on-surface-variant hover:text-primary transition-colors" />
<div className="flex items-center gap-3">
<div className="text-right">
<p className="text-body-sm font-bold leading-none">{user?.name || 'Super Admin'}</p>
<p className="text-[10px] text-outline font-label-caps uppercase tracking-widest mt-1">Global Permissions</p>
</div>
<div className="w-10 h-10 rounded-full border-2 border-primary bg-primary-container text-on-primary flex items-center justify-center font-bold text-body-sm">
{initialsOf(user?.name || 'Super Admin')}
</div>
</div>
</div>
</header>
<div className="px-margin-desktop mt-8 space-y-gutter max-w-container-max mx-auto">

<div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
<div>
<h2 className="font-headline-md text-headline-md text-text-main">System Dashboard</h2>
<div className="flex items-center gap-3 mt-1 text-on-surface-variant">
<span className="font-label-code text-label-code bg-surface-container-low px-2 py-0.5 rounded border border-border">USERS: {fmt(stats?.totalUsers)}</span>
<span className="text-body-sm font-body-sm">•</span>
<span className="text-body-sm font-body-sm">{lastRefreshed ? `Last refreshed: ${lastRefreshed.toLocaleTimeString()}` : 'Loading system data...'}</span>
</div>
</div>
<button className="flex items-center gap-2 bg-[#F59E0B] hover:bg-accent-hover text-[#2a1700] px-6 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-95" onClick={() => setShowBroadcast(true)}>
<span className="material-symbols-outlined">campaign</span>
<span className="font-label-caps text-label-caps uppercase tracking-wider">Broadcast Announcement</span>
</button>
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-gutter" ref={statsRef}>

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

<div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">

<div className="lg:col-span-2 space-y-gutter">

<div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm" ref={institutionsRef}>
<div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white">
<h4 className="font-headline-sm text-headline-sm">Institution Performance</h4>
<div className="flex gap-2">
{instFilter !== 'all' && (
<span className="text-primary text-[12px] font-bold self-center">{instFilter === 'active' ? 'Showing: Active' : 'Showing: Inactive'}</span>
)}
<button className="p-2 border border-border rounded-lg text-outline hover:bg-surface-container-low transition-colors" onClick={cycleInstFilter} title={`Filter: ${instFilter === 'all' ? 'All' : instFilter === 'active' ? 'Active only' : 'Inactive only'} — click to change`}>
<span className="material-symbols-outlined">filter_list</span>
</button>
<button className="p-2 border border-border rounded-lg text-outline hover:bg-surface-container-low transition-colors" onClick={handleDownloadInstitutions} title="Download institutions as CSV">
<span className="material-symbols-outlined">download</span>
</button>
</div>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left">
<thead className="bg-background">
<tr>
<th className="px-6 py-4 font-label-caps text-label-caps text-outline uppercase">Institution</th>
<th className="px-6 py-4 font-label-caps text-label-caps text-outline uppercase">Contact</th>
<th className="px-6 py-4 font-label-caps text-label-caps text-outline uppercase">Registered</th>
<th className="px-6 py-4 font-label-caps text-label-caps text-outline uppercase">Status</th>
<th className="px-6 py-4 font-label-caps text-label-caps text-outline uppercase">Actions</th>
</tr>
</thead>
<tbody className="divide-y divide-border">
{visibleInstitutions.length === 0 && (
<tr>
<td className="px-6 py-8 text-body-sm text-outline text-center" colSpan={5}>No institutions registered yet.</td>
</tr>
)}
{visibleInstitutions.map((inst) => (
<tr className="hover:bg-background transition-colors group" key={inst.id}>
<td className="px-6 py-4">
<div className="flex flex-col">
<span className="text-body-sm font-bold">{inst.name}</span>
<span className="text-[11px] font-label-code text-outline uppercase tracking-tight">{inst.domain ? inst.domain : `ID: ${inst.id}`}</span>
</div>
</td>
<td className="px-6 py-4 text-body-sm">{inst.contact_email || '—'}</td>
<td className="px-6 py-4 text-body-sm">{inst.created_at ? new Date(inst.created_at).toLocaleDateString() : '—'}</td>
<td className="px-6 py-4">
{inst.is_active !== false ? (
<span className="flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary-subtle px-2 py-1 rounded-full w-fit">
<span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                                ACTIVE
                                            </span>
) : (
<span className="flex items-center gap-1.5 text-[11px] font-bold text-error bg-error-container px-2 py-1 rounded-full w-fit">
<span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                                                INACTIVE
                                            </span>
)}
</td>
<td className="px-6 py-4">
<button className="text-outline hover:text-primary transition-colors" onClick={() => handleToggleInstitution(inst)} title={inst.is_active !== false ? 'Deactivate institution' : 'Activate institution'}>
<span className="material-symbols-outlined">{inst.is_active !== false ? 'toggle_on' : 'toggle_off'}</span>
</button>
</td>
</tr>
))}
</tbody>
</table>
</div>
<div className="p-4 bg-background border-t border-border flex justify-center">
<button className="text-primary font-bold text-body-sm hover:underline" onClick={() => setShowAllInstitutions((v) => !v)}>
{showAllInstitutions ? 'Show Fewer Institutions' : `View All Institutions (${fmt(filteredInstitutions.length)})`}
</button>
</div>
</div>

<div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
<div className="flex items-center justify-between mb-6">
<h4 className="font-headline-sm text-headline-sm">System Audit Log</h4>
<span className="font-label-code text-label-code text-outline">Real-time update</span>
</div>
<div className="space-y-6">
{auditLogs.length === 0 && (
<p className="text-body-sm text-outline">No audit log entries recorded yet.</p>
)}
{auditLogs.slice(0, 6).map((log, idx) => (
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

<div className="space-y-gutter">

<div className="bg-[#0b1c30] text-white rounded-xl p-6 shadow-xl relative overflow-hidden" ref={systemHealthRef}>

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
<div className="grid grid-cols-2 gap-4">
<div className="bg-white/5 p-4 rounded-lg border border-white/10">
<p className="text-surface-variant/60 text-label-caps text-label-caps uppercase text-[10px]">Logbook Entries</p>
<p className="text-headline-sm font-headline-sm mt-1">{fmt(systemStats?.total_logbook_entries)}</p>
</div>
<div className="bg-white/5 p-4 rounded-lg border border-white/10">
<p className="text-surface-variant/60 text-label-caps text-label-caps uppercase text-[10px]">Documents</p>
<p className="text-headline-sm font-headline-sm mt-1">{fmt(systemStats?.total_documents)}</p>
</div>
<div className="bg-white/5 p-4 rounded-lg border border-white/10">
<p className="text-surface-variant/60 text-label-caps text-label-caps uppercase text-[10px]">Evaluations</p>
<p className="text-headline-sm font-headline-sm mt-1">{fmt(systemStats?.total_evaluations)}</p>
</div>
<div className="bg-white/5 p-4 rounded-lg border border-white/10">
<p className="text-surface-variant/60 text-label-caps text-label-caps uppercase text-[10px]">Messages</p>
<p className="text-headline-sm font-headline-sm mt-1">{fmt(systemStats?.total_messages)}</p>
</div>
</div>
<div className="flex items-center justify-between pt-2 border-t border-white/10">
<span className="text-body-sm text-surface-variant/70">Server Latency</span>
<span className="text-body-sm font-bold text-primary-fixed">{latency !== null ? `${latency}ms` : '—'}</span>
</div>
</div>
</div>
</div>

<div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
<div className="flex items-center justify-between mb-6">
<h4 className="font-headline-sm text-headline-sm">Top Institutions</h4>
<button className="text-primary hover:text-primary-hover transition-colors" onClick={() => setShowAddInstitution(true)}>
<span className="material-symbols-outlined">add_circle</span>
</button>
</div>
<div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
{topInstitutions.length === 0 && (
<p className="text-body-sm text-outline">No active institutions yet. Add one below.</p>
)}
{topInstitutions.map((inst) => (
<div className="p-4 border border-border rounded-lg hover:border-primary-subtle hover:bg-primary-subtle/20 transition-all cursor-pointer group" key={inst.id}>
<div className="flex items-start justify-between">
<div>
<p className="font-bold text-body-sm">{inst.name}</p>
<p className="text-[11px] text-outline font-label-code">{inst.domain || inst.contact_email || '—'}</p>
</div>
<span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">arrow_forward</span>
</div>
<div className="mt-3 flex items-center gap-4">
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-[14px] text-outline">check_circle</span>
<span className="text-[12px] font-bold">{inst.is_active !== false ? 'Active' : 'Inactive'}</span>
</div>
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-[14px] text-outline">calendar_month</span>
<span className="text-[12px] font-bold">{inst.created_at ? new Date(inst.created_at).toLocaleDateString() : '—'}</span>
</div>
</div>
</div>
))}
</div>
<button className="w-full mt-6 bg-[#F59E0B] hover:bg-accent-hover text-[#2a1700] font-bold py-3 rounded-lg transition-all shadow-sm" onClick={() => setShowAddInstitution(true)}>
                            Add Institution
                        </button>
</div>
</div>
</div>
</div>
</main>

{showBroadcast && (
<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
<div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
<div className="flex items-center justify-between mb-4">
<h4 className="font-headline-sm text-headline-sm flex items-center gap-2">
<span className="material-symbols-outlined text-primary">campaign</span>
                        Broadcast Announcement
                    </h4>
<button className="text-outline hover:text-primary transition-colors" onClick={() => setShowBroadcast(false)}>
<span className="material-symbols-outlined">close</span>
</button>
</div>
<form onSubmit={handleBroadcast}>
<p className="text-body-sm text-on-surface-variant mb-3">This message will be sent to every user on the platform.</p>
<textarea
className="w-full border border-border rounded-lg p-3 text-body-sm focus:ring-primary focus:border-primary bg-surface-container-low"
maxLength={1000}
placeholder="Type your announcement (max 1000 characters)..."
required
rows={4}
value={broadcastMsg}
onChange={(e) => setBroadcastMsg(e.target.value)}
/>
{broadcastError && <p className="text-error text-body-sm mt-2">{broadcastError}</p>}
<div className="flex justify-end gap-3 mt-4">
<button className="px-4 py-2 border border-border rounded-lg text-body-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors" onClick={() => setShowBroadcast(false)} type="button">Cancel</button>
<button className="flex items-center gap-2 bg-[#F59E0B] hover:bg-accent-hover text-[#2a1700] px-5 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95 disabled:opacity-60" disabled={broadcastSending || !broadcastMsg.trim()} type="submit">
<span className="material-symbols-outlined text-[18px]">send</span>
{broadcastSending ? 'Sending...' : 'Send Broadcast'}
</button>
</div>
</form>
</div>
</div>
)}

{showAddInstitution && (
<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
<div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
<div className="flex items-center justify-between mb-4">
<h4 className="font-headline-sm text-headline-sm flex items-center gap-2">
<span className="material-symbols-outlined text-primary">account_balance</span>
                        Add Institution
                    </h4>
<button className="text-outline hover:text-primary transition-colors" onClick={() => setShowAddInstitution(false)}>
<span className="material-symbols-outlined">close</span>
</button>
</div>
<form onSubmit={handleAddInstitution}>
<div className="space-y-4">
<div>
<label className="block font-label-caps text-label-caps text-outline uppercase mb-1">Institution Name</label>
<input
className="w-full border border-border rounded-lg p-3 text-body-sm focus:ring-primary focus:border-primary bg-surface-container-low"
placeholder="e.g. University of Nairobi"
required
type="text"
value={instForm.name}
onChange={(e) => setInstForm((f) => ({ ...f, name: e.target.value }))}
/>
</div>
<div>
<label className="block font-label-caps text-label-caps text-outline uppercase mb-1">Domain (optional)</label>
<input
className="w-full border border-border rounded-lg p-3 text-body-sm focus:ring-primary focus:border-primary bg-surface-container-low"
placeholder="e.g. uonbi.ac.ke"
type="text"
value={instForm.domain}
onChange={(e) => setInstForm((f) => ({ ...f, domain: e.target.value }))}
/>
</div>
<div>
<label className="block font-label-caps text-label-caps text-outline uppercase mb-1">Contact Email (optional)</label>
<input
className="w-full border border-border rounded-lg p-3 text-body-sm focus:ring-primary focus:border-primary bg-surface-container-low"
placeholder="e.g. liaison@uonbi.ac.ke"
type="email"
value={instForm.contact_email}
onChange={(e) => setInstForm((f) => ({ ...f, contact_email: e.target.value }))}
/>
</div>
</div>
{instError && <p className="text-error text-body-sm mt-2">{instError}</p>}
<div className="flex justify-end gap-3 mt-4">
<button className="px-4 py-2 border border-border rounded-lg text-body-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors" onClick={() => setShowAddInstitution(false)} type="button">Cancel</button>
<button className="flex items-center gap-2 bg-[#F59E0B] hover:bg-accent-hover text-[#2a1700] px-5 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95 disabled:opacity-60" disabled={instSaving || !instForm.name.trim()} type="submit">
<span className="material-symbols-outlined text-[18px]">add</span>
{instSaving ? 'Saving...' : 'Add Institution'}
</button>
</div>
</form>
</div>
</div>
)}

<div className={`fixed bottom-10 right-10 z-[60] transform transition-all duration-500 ${toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`} id="system-toast">
<div className="bg-primary text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4">
<span className="material-symbols-outlined">info</span>
<div>
<p className="font-bold text-body-sm">{toast.title}</p>
<p className="text-[12px] opacity-80">{toast.body}</p>
</div>
<button className="ml-4 opacity-60 hover:opacity-100" onClick={() => setToast((t) => ({ ...t, visible: false }))}>
<span className="material-symbols-outlined text-[18px]">close</span>
</button>
</div>
</div>


        </div>
    );
}
