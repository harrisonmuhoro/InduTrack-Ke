import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../axios';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import AppsMenu from '../components/AppsMenu';

const STUDENT_APP_LINKS = [
    { to: '/student', icon: 'dashboard', label: 'Dashboard' },
    { to: '/student/logbook', icon: 'menu_book', label: 'Logbook' },
    { to: '/student/applications', icon: 'work', label: 'Applications' },
    { to: '/student/documents', icon: 'description', label: 'Documents' },
    { to: '/student/match', icon: 'travel_explore', label: 'Smart Match' },
    { to: '/student/results', icon: 'grade', label: 'Results' },
    { to: '/messages', icon: 'mail', label: 'Messages' },
    { to: '/profile', icon: 'person', label: 'Profile' },
];

function initialsOf(name) {
    if (!name) return '?';
    return name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_STYLES = {
    reviewed: { pill: 'bg-primary-subtle text-primary', dot: 'bg-primary', label: 'Reviewed' },
    approved: { pill: 'bg-primary-subtle text-primary', dot: 'bg-primary', label: 'Approved' },
    submitted: { pill: 'bg-secondary-fixed/30 text-secondary', dot: 'bg-secondary-container', label: 'Submitted' },
    draft: { pill: 'bg-secondary-fixed/30 text-secondary', dot: 'bg-secondary-container', label: 'Draft' },
    rejected: { pill: 'bg-error-container/20 text-error', dot: 'bg-error', label: 'Rejected' },
    flagged: { pill: 'bg-error-container/20 text-error', dot: 'bg-error', label: 'Flagged' },
};

const ALERT_ICONS = {
    application_status_changed: { icon: 'description', wrap: 'bg-secondary-fixed/20 text-secondary group-hover:bg-secondary-container group-hover:text-white', text: 'group-hover:text-secondary' },
    logbook_reminder: { icon: 'warning', wrap: 'bg-error-container/20 text-error group-hover:bg-error group-hover:text-white', text: 'group-hover:text-error' },
    evaluation_submitted: { icon: 'comment', wrap: 'bg-primary-subtle text-primary group-hover:bg-primary group-hover:text-white', text: 'group-hover:text-primary' },
    system_announcement: { icon: 'campaign', wrap: 'bg-primary-subtle text-primary group-hover:bg-primary group-hover:text-white', text: 'group-hover:text-primary' },
};
const DEFAULT_ALERT_ICON = { icon: 'notifications', wrap: 'bg-primary-subtle text-primary group-hover:bg-primary group-hover:text-white', text: 'group-hover:text-primary' };

export default function StudentDashboard() {
    const { user, context, logout } = useAuth();
    const navigate = useNavigate();

    const [placement, setPlacement] = useState(null);
    const [entries, setEntries] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/student/match?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.post('/notifications/read');
            setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
        } catch { /* keep local state as-is on failure */ }
    };

    useEffect(() => {
        let mounted = true;
        Promise.allSettled([
            api.get('/students/placement'),
            api.get('/logbooks'),
            api.get('/notifications'),
            api.get('/documents'),
        ]).then(([placementRes, logbookRes, notifRes, docRes]) => {
            if (!mounted) return;
            if (placementRes.status === 'fulfilled') setPlacement(placementRes.value.data || null);
            if (logbookRes.status === 'fulfilled') setEntries(Array.isArray(logbookRes.value.data) ? logbookRes.value.data : []);
            if (notifRes.status === 'fulfilled') setNotifications(Array.isArray(notifRes.value.data) ? notifRes.value.data : []);
            if (docRes.status === 'fulfilled') setDocuments(Array.isArray(docRes.value.data) ? docRes.value.data : []);
            setLoading(false);
        });
        return () => { mounted = false; };
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // ── Derived data ────────────────────────────────────────────────────────
    const totalWeeks = placement?.period?.required_weeks || 16;
    const completedWeeks = [...new Set(entries.map((e) => e.week_number))];
    const weeksDone = completedWeeks.length;
    const maxWeek = completedWeeks.length ? Math.max(...completedWeeks) : 0;
    const progressPct = totalWeeks > 0 ? Math.min(100, Math.round((weeksDone / totalWeeks) * 1000) / 10) : 0;
    const pendingEntries = entries.filter((e) => e.status === 'draft' || e.status === 'submitted').length;

    const approvedDocs = documents.filter((d) => d.status === 'approved').length;
    const docsPct = documents.length ? Math.round((approvedDocs / documents.length) * 100) : null;

    const companyName = placement?.company?.name || null;
    const supervisorName = placement?.company_supervisor?.user?.name || null;
    const department = placement?.company?.industry || null;

    const nextWeek = maxWeek + 1;
    const lastEntryDate = entries.length ? entries.reduce((a, b) => (new Date(a.entry_date) > new Date(b.entry_date) ? a : b)).entry_date : null;
    const nextDeadlineDate = placement && nextWeek <= totalWeeks
        ? new Date((lastEntryDate ? new Date(lastEntryDate) : new Date()).getTime() + 7 * 86400000)
        : null;
    const daysToDeadline = nextDeadlineDate ? Math.max(0, Math.ceil((nextDeadlineDate.getTime() - Date.now()) / 86400000)) : null;

    const unreadNotifs = notifications.filter((n) => !n.read_at).length;
    const recentEntries = [...entries].sort((a, b) => b.week_number - a.week_number).slice(0, 3);
    const recentAlerts = notifications.slice(0, 3);

    const deadlines = [];
    if (placement && nextDeadlineDate) {
        deadlines.push({
            date: nextDeadlineDate,
            title: `Week ${nextWeek} Log Entry`,
            desc: `Mandatory weekly submission for ${companyName || 'your'} placement.`,
            dot: 'bg-error border-2 border-surface',
            dateClass: 'text-error',
        });
        if (nextWeek + 1 <= totalWeeks) {
            deadlines.push({
                date: new Date(nextDeadlineDate.getTime() + 7 * 86400000),
                title: `Week ${nextWeek + 1} Log Entry`,
                desc: 'Upcoming weekly logbook submission.',
                dot: 'bg-secondary-container border-2 border-surface',
                dateClass: 'text-on-surface-variant',
            });
        }
        deadlines.push({
            date: null,
            title: 'Final Logbook Submission',
            desc: `Complete all ${totalWeeks} weekly entries to finalise your attachment.`,
            dot: 'bg-primary-subtle border-2 border-primary',
            dateClass: 'text-on-surface-variant',
        });
    }

    const firstName = user?.name ? user.name.split(' ')[0] : 'Student';

    return (
        <div className="font-body-md text-body-md overflow-x-hidden min-h-screen bg-[var(--color-bg)]">


<aside className="fixed left-0 top-0 h-screen w-sidebar-width bg-[#064D37] flex flex-col py-gutter z-50">
<div className="px-6 mb-10">
<h2 className="text-surface font-headline-md text-headline-md font-bold tracking-tight">InduTrack KE</h2>
<p className="text-primary-fixed/60 font-label-caps text-[10px] mt-1 uppercase tracking-widest">Student Portal</p>
</div>
<nav className="flex-1 space-y-1">
<Link className="relative flex items-center gap-3 bg-primary-container text-on-primary px-6 py-3 transition-transform duration-200 translate-x-1" to="/student">
<div className="sidebar-active-indicator"></div>
<span className="material-symbols-outlined">dashboard</span>
<span className="font-label-caps text-label-caps">Dashboard</span>
</Link>
<Link className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-6 py-3 transition-colors duration-200" to="/student/match">
<span className="material-symbols-outlined">domain</span>
<span className="font-label-caps text-label-caps">Institutions</span>
</Link>
<Link className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-6 py-3 transition-colors duration-200" to="/student/match">
<span className="material-symbols-outlined">handshake</span>
<span className="font-label-caps text-label-caps">Industry Partners</span>
</Link>
<Link className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-6 py-3 transition-colors duration-200" to="/student/logbook">
<span className="material-symbols-outlined">menu_book</span>
<span className="font-label-caps text-label-caps">Student Logbooks</span>
</Link>
<Link className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-6 py-3 transition-colors duration-200" to="/student/applications">
<span className="material-symbols-outlined">location_on</span>
<span className="font-label-caps text-label-caps">Placement Tracker</span>
</Link>
<Link className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-6 py-3 transition-colors duration-200" to="/profile">
<span className="material-symbols-outlined">settings</span>
<span className="font-label-caps text-label-caps">Settings</span>
</Link>
</nav>
<div className="mt-auto px-6 space-y-1 border-t border-primary-container/30 pt-6">
<a className="flex items-center gap-3 text-surface-variant/80 hover:text-surface py-2 transition-colors" href="mailto:support@indutrack.ke">
<span className="material-symbols-outlined">help</span>
<span className="font-label-caps text-label-caps text-[11px]">Help Center</span>
</a>
<button className="w-full flex items-center gap-3 text-surface-variant/80 hover:text-surface py-2 transition-colors" onClick={handleLogout} type="button">
<span className="material-symbols-outlined">logout</span>
<span className="font-label-caps text-label-caps text-[11px]">Logout</span>
</button>
</div>
</aside>

<main className="ml-sidebar-width min-h-screen">

<header className="sticky top-0 z-40 bg-surface border-b border-border h-16 flex items-center justify-between px-margin-desktop">
<div className="flex items-center gap-6">
<div className="relative group">
<span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
<span className="material-symbols-outlined text-[20px]">search</span>
</span>
<input className="bg-surface-container-low border-border rounded-full pl-10 pr-4 py-1.5 text-body-sm w-80 focus:ring-2 focus:ring-primary-subtle focus:border-primary transition-all" onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Search resources, placements..." type="text" value={searchQuery}/>
</div>
</div>
<div className="flex items-center gap-4">
<div className="flex items-center bg-primary-subtle px-4 py-1.5 rounded-full border border-primary/10">
<div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
<span className="text-primary font-label-caps text-[11px]">{companyName ? `Active: ${companyName}` : 'No Active Placement'}</span>
</div>
<NotificationBell buttonClassName="relative p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors" />
<AppsMenu buttonClassName="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors" links={STUDENT_APP_LINKS} />
<div className="h-8 w-[1px] bg-border mx-2"></div>
<div className="flex items-center gap-3">
<div className="text-right hidden lg:block">
<p className="text-on-surface font-label-caps text-label-caps">{user?.name || 'Student'}</p>
<p className="text-on-surface-variant text-[11px]">{context || user?.email || 'Student'}</p>
</div>
<div className="w-10 h-10 rounded-full border-2 border-primary-subtle overflow-hidden">
<div className="w-full h-full bg-primary-subtle text-primary flex items-center justify-center font-bold text-body-sm">{initialsOf(user?.name)}</div>
</div>
</div>
</div>
</header>

<div className="p-margin-desktop space-y-gutter max-w-container-max mx-auto">

<div className="flex justify-between items-end">
<div>
<h1 className="font-headline-md text-headline-md text-text-main">Dashboard</h1>
<p className="text-on-surface-variant font-body-md">{placement ? `Welcome back, ${firstName}. You're on track with your placement goals.` : `Welcome back, ${firstName}. Find and secure your industrial attachment.`}</p>
</div>
<button className="bg-secondary-container hover:bg-accent-hover text-on-secondary-container font-label-caps text-label-caps px-6 py-3 rounded-lg shadow-sm transition-all duration-200 transform hover:scale-[1.02] flex items-center gap-2" onClick={() => navigate('/student/logbook')} type="button">
<span className="material-symbols-outlined text-[18px]">add_circle</span>
                    New Log Entry
                </button>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">

<div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex items-center gap-5 hover:border-primary-subtle transition-colors group">
<div className="relative w-16 h-16">
<svg className="w-full h-full" viewBox="0 0 36 36">
<circle className="text-surface-container-high" cx="18" cy="18" fill="transparent" r="16" stroke="currentColor" strokeWidth="3"></circle>
<circle className="text-primary progress-ring-circle" cx="18" cy="18" fill="transparent" r="16" stroke="currentColor" strokeDasharray="100" strokeDashoffset={100 - progressPct} strokeLinecap="round" strokeWidth="3"></circle>
</svg>
<div className="absolute inset-0 flex items-center justify-center font-label-caps text-[11px] text-primary">{weeksDone}/{totalWeeks}</div>
</div>
<div>
<p className="text-on-surface-variant font-label-caps text-[11px]">Weeks Completed</p>
<h3 className="text-headline-sm font-headline-sm mt-1">{loading ? '—' : `${progressPct}%`}</h3>
</div>
</div>

<div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex items-center gap-5 hover:border-primary-subtle transition-colors">
<div className="w-12 h-12 rounded-full bg-secondary-fixed/20 flex items-center justify-center text-secondary">
<span className="material-symbols-outlined">pending_actions</span>
</div>
<div>
<p className="text-on-surface-variant font-label-caps text-[11px]">Logbook Status</p>
<h3 className="text-headline-sm font-headline-sm mt-1">{loading ? '—' : `${pendingEntries} Pending`}</h3>
</div>
</div>

<div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex items-center gap-5 hover:border-primary-subtle transition-colors">
<div className="w-12 h-12 rounded-full bg-primary-subtle flex items-center justify-center text-primary">
<span className="material-symbols-outlined">verified</span>
</div>
<div>
<p className="text-on-surface-variant font-label-caps text-[11px]">Documents</p>
<h3 className="text-headline-sm font-headline-sm mt-1">{docsPct === null ? '—' : `${docsPct}% Approved`}</h3>
</div>
</div>

<div className="bg-surface p-6 rounded-xl border border-border shadow-sm flex items-center gap-5 hover:border-primary-subtle transition-colors">
<div className="w-12 h-12 rounded-full bg-error-container/20 flex items-center justify-center text-error">
<span className="material-symbols-outlined">event_busy</span>
</div>
<div>
<div className="flex items-center gap-2">
<p className="text-on-surface-variant font-label-caps text-[11px]">Next Deadline</p>
{daysToDeadline !== null && <span className="bg-error text-on-error text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">{daysToDeadline} DAYS</span>}
</div>
<h3 className="text-headline-sm font-headline-sm mt-1">{placement && nextWeek <= totalWeeks ? `Submit W${nextWeek}` : '—'}</h3>
</div>
</div>
</div>

<div className="grid grid-cols-12 gap-gutter">

<div className="col-span-12 lg:col-span-8 space-y-gutter">
<div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden flex flex-col group">
<div className="bg-[#064D37] p-6 flex justify-between items-start">
<div className="flex items-center gap-4">
<div className="w-14 h-14 rounded-lg bg-white p-2 shadow-sm flex items-center justify-center">
<span className="material-symbols-outlined text-primary text-[28px]">corporate_fare</span>
</div>
<div>
<h3 className="text-surface font-headline-sm text-headline-sm">{companyName || 'No Active Placement'}</h3>
<p className="text-primary-fixed/70 text-body-sm">{placement ? (placement.company?.description || placement.company?.industry || '—') : 'Apply for an attachment slot to get started.'}</p>
</div>
</div>
<span className="bg-primary-hover text-white text-[10px] font-label-caps px-3 py-1 rounded-full border border-white/20">{placement ? 'Active Placement' : 'Not Placed'}</span>
</div>
<div className="p-6 grid grid-cols-3 gap-6 border-b border-border bg-surface-container-low/30">
<div>
<p className="text-on-surface-variant font-label-caps text-[10px]">Supervisor</p>
<p className="font-body-md text-text-main mt-1 flex items-center gap-2">
                                    {supervisorName || '—'} {supervisorName && <span className="text-primary text-[14px] material-symbols-outlined">verified_user</span>}
</p>
</div>
<div>
<p className="text-on-surface-variant font-label-caps text-[10px]">Current Week</p>
<p className="font-body-md text-text-main mt-1">{placement ? `Week ${Math.min(nextWeek, totalWeeks)} of ${totalWeeks}` : '—'}</p>
</div>
<div>
<p className="text-on-surface-variant font-label-caps text-[10px]">Department</p>
<p className="font-body-md text-text-main mt-1">{department || '—'}</p>
</div>
</div>
<div className="p-6">
<div className="flex justify-between items-center mb-2">
<span className="font-label-caps text-[11px] text-on-surface-variant">Overall Progress</span>
<span className="font-label-caps text-[11px] text-primary">{progressPct}% Complete</span>
</div>
<div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
<div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }}></div>
</div>
</div>
</div>

<div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
<div className="p-4 border-b border-border flex justify-between items-center">
<h3 className="font-headline-sm text-[18px]">Recent Logbook Entries</h3>
<button className="text-primary font-label-caps text-label-caps hover:underline" onClick={() => navigate('/student/logbook')} type="button">View All</button>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left">
<thead>
<tr className="bg-primary-container text-on-primary">
<th className="px-6 py-3 font-label-caps text-label-caps">Week</th>
<th className="px-6 py-3 font-label-caps text-label-caps">Summary</th>
<th className="px-6 py-3 font-label-caps text-label-caps">Date</th>
<th className="px-6 py-3 font-label-caps text-label-caps">Status</th>
<th className="px-6 py-3 font-label-caps text-label-caps text-right">Actions</th>
</tr>
</thead>
<tbody className="divide-y divide-border">
{recentEntries.length === 0 && (
<tr>
<td className="px-6 py-4 text-body-sm text-on-surface-variant" colSpan="5">{loading ? 'Loading entries...' : 'No logbook entries yet. Create your first entry to get started.'}</td>
</tr>
)}
{recentEntries.map((entry) => {
    const style = STATUS_STYLES[entry.status] || STATUS_STYLES.draft;
    return (
<tr className="hover:bg-surface-container-low transition-colors group" key={entry.id}>
<td className="px-6 py-4 font-label-code text-label-code">WEEK {String(entry.week_number).padStart(2, '0')}</td>
<td className="px-6 py-4 text-body-sm max-w-xs truncate">{entry.activities || '—'}</td>
<td className="px-6 py-4 text-body-sm text-on-surface-variant">{formatDate(entry.entry_date)}</td>
<td className="px-6 py-4">
<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.pill}`}>
<span className={`status-dot ${style.dot}`}></span>{style.label}
                                            </span>
</td>
<td className="px-6 py-4 text-right">
<button className="text-on-surface-variant hover:text-primary transition-colors" onClick={() => navigate('/student/logbook')} type="button">
<span className="material-symbols-outlined text-[20px]">{entry.is_editable ? 'edit' : 'visibility'}</span>
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

<div className="col-span-12 lg:col-span-4 space-y-gutter">

<div className="bg-surface rounded-xl border border-border shadow-sm p-6 overflow-hidden relative">
<div className="flex justify-between items-center mb-6">
<h3 className="font-headline-sm text-[18px]">Alerts</h3>
{unreadNotifs > 0 && <span className="bg-error text-on-error font-label-caps text-[10px] px-2 py-0.5 rounded-full">{unreadNotifs} NEW</span>}
</div>
<div className="space-y-5">
{recentAlerts.length === 0 && (
<p className="text-body-sm text-on-surface-variant">{loading ? 'Loading alerts...' : 'No new alerts.'}</p>
)}
{recentAlerts.map((n) => {
    const meta = ALERT_ICONS[n.data?.type] || DEFAULT_ALERT_ICON;
    return (
<div className="flex gap-4 group cursor-pointer" key={n.id}>
<div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${meta.wrap}`}>
<span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
</div>
<div>
<p className={`text-body-sm text-text-main font-medium transition-colors ${meta.text}`}>{n.data?.message || 'Notification'}</p>
<p className="text-[11px] text-on-surface-variant mt-1">{timeAgo(n.created_at)}</p>
</div>
</div>
    );
})}
</div>
<button className="w-full mt-6 py-2 text-on-surface-variant hover:text-primary font-label-caps text-[11px] border-t border-border pt-4 transition-colors" onClick={handleMarkAllRead} type="button">View All Notifications</button>
</div>

<div className="bg-surface rounded-xl border border-border shadow-sm p-6 overflow-hidden">
<h3 className="font-headline-sm text-[18px] mb-6">Upcoming Deadlines</h3>
<div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-surface-container-high">
{deadlines.length === 0 && (
<p className="text-body-sm text-on-surface-variant">{loading ? 'Loading deadlines...' : 'No upcoming deadlines.'}</p>
)}
{deadlines.map((d, idx) => (
<div className="relative" key={idx}>
<div className={`absolute -left-[20px] top-1 w-3 h-3 rounded-full z-10 ${d.dot}`}></div>
<div>
<p className={`font-label-caps text-[11px] ${d.dateClass}`}>{d.date ? d.date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }) : 'End of Attachment'}</p>
<h4 className="font-body-md font-bold text-text-main">{d.title}</h4>
<p className="text-body-sm text-on-surface-variant mt-0.5">{d.desc}</p>
</div>
</div>
))}
</div>
</div>
</div>
</div>
</div>
</main>

<button className="fixed bottom-10 right-10 w-16 h-16 bg-[#064D37] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-primary transition-all duration-300 transform hover:scale-110 z-50 group" onClick={() => navigate('/student/logbook')} type="button">
<span className="material-symbols-outlined text-[32px]">edit_note</span>
<span className="absolute right-full mr-4 bg-[#064D37] text-white px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-label-caps shadow-lg pointer-events-none">New Entry</span>
</button>


        </div>
    );
}
