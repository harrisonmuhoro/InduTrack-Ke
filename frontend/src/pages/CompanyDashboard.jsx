import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../axios';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import AppsMenu from '../components/AppsMenu';

// ── Helpers ──────────────────────────────────────────────────────────────────
const initials = (name = '') =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('') || '?';

const relativeTime = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${Math.max(mins, 1)} MIN AGO`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} HOUR${hrs > 1 ? 'S' : ''} AGO`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'YESTERDAY';
    return `${days} DAYS AGO`;
};

const shortDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
};

const TOTAL_WEEKS = 12;

export default function CompanyDashboard() {
    const { user, context, logout } = useAuth();
    const navigate = useNavigate();

    const [placements, setPlacements] = useState([]);
    const [weeklyLogsMap, setWeeklyLogsMap] = useState({});   // placementId -> weekly logs[]
    const [entriesMap, setEntriesMap] = useState({});         // placementId -> logbook entries[]
    const [loading, setLoading] = useState(true);

    // Weekly log form state
    const [showForm, setShowForm] = useState(false);
    const [formPlacementId, setFormPlacementId] = useState('');
    const [rating, setRating] = useState(0);
    const [tasksCompleted, setTasksCompleted] = useState('');
    const [hasConcern, setHasConcern] = useState(false);
    const [concernDetails, setConcernDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formMessage, setFormMessage] = useState(null); // { type: 'success'|'error', text }

    // Header search + list toggles
    const [search, setSearch] = useState('');
    const [showAllStudents, setShowAllStudents] = useState(false);
    const [showAllActivity, setShowAllActivity] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/supervisors/students');
            const list = Array.isArray(res.data) ? res.data : [];
            setPlacements(list);

            // Load weekly logs + logbook entries per placement (bounded)
            const subset = list.slice(0, 10);
            const results = await Promise.allSettled(
                subset.map(async (p) => {
                    const [logsRes, logbookRes] = await Promise.allSettled([
                        api.get(`/supervisors/placements/${p.id}/weekly-logs`),
                        api.get(`/supervisors/placements/${p.id}/logbook`),
                    ]);
                    return {
                        id: p.id,
                        logs: logsRes.status === 'fulfilled' ? logsRes.value.data : [],
                        entries:
                            logbookRes.status === 'fulfilled'
                                ? logbookRes.value.data?.logbook_entries || []
                                : [],
                    };
                })
            );
            const logsMap = {};
            const entMap = {};
            results.forEach((r) => {
                if (r.status === 'fulfilled') {
                    logsMap[r.value.id] = r.value.logs;
                    entMap[r.value.id] = r.value.entries;
                }
            });
            setWeeklyLogsMap(logsMap);
            setEntriesMap(entMap);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // ── Derived data ─────────────────────────────────────────────────────────
    const studentName = (p) => p.student?.user?.name || 'Student';
    const latestEntryWeek = (p) => {
        const entries = entriesMap[p.id] || [];
        return entries.reduce((max, e) => Math.max(max, e.week_number || 0), 0);
    };
    const latestEntryDate = (p) => {
        const entries = entriesMap[p.id] || [];
        if (!entries.length) return null;
        return entries.reduce(
            (latest, e) => (!latest || new Date(e.entry_date) > new Date(latest) ? e.entry_date : latest),
            null
        );
    };
    const studentStatus = (p) => {
        if (p.status === 'flagged') return { label: 'FLAGGED', tone: 'error' };
        const week = latestEntryWeek(p);
        if (week === 0) return { label: 'NO LOGS', tone: 'error' };
        if (week >= TOTAL_WEEKS - 2) return { label: 'EXCELLENT', tone: 'primary' };
        return { label: 'ON TRACK', tone: 'primary' };
    };

    const pendingReviews = Object.values(entriesMap)
        .flat()
        .filter((e) => ['draft', 'submitted'].includes(e.status)).length;

    const currentWeek = Math.max(
        0,
        ...Object.values(entriesMap).flat().map((e) => e.week_number || 0),
        ...Object.values(weeklyLogsMap).flat().map((l) => l.week_number || 0)
    );
    const weeklySubmitted = placements.filter((p) =>
        (weeklyLogsMap[p.id] || []).some((l) => l.week_number === currentWeek)
    ).length;
    const weeklyPct = placements.length
        ? Math.round((weeklySubmitted / placements.length) * 100)
        : 0;

    // Active flags: derived from weekly logs raising concerns
    const activeFlags = placements
        .flatMap((p) =>
            (weeklyLogsMap[p.id] || [])
                .filter((l) => l.has_concern)
                .map((l) => ({
                    student: studentName(p),
                    details: l.concern_details || 'Concern raised in weekly performance log.',
                    week: l.week_number,
                }))
        )
        .slice(0, 4);

    // Recent activity: latest logbook entries across placements
    const recentActivity = placements
        .flatMap((p) =>
            (entriesMap[p.id] || []).map((e) => ({
                student: studentName(p),
                week: e.week_number,
                at: e.created_at || e.entry_date,
            }))
        )
        .sort((a, b) => new Date(b.at) - new Date(a.at));
    const visibleActivity = showAllActivity ? recentActivity : recentActivity.slice(0, 3);

    // Students table: filter by header search, then limit unless "View All" toggled
    const filteredPlacements = placements.filter((p) =>
        studentName(p).toLowerCase().includes(search.trim().toLowerCase())
    );
    const visiblePlacements = showAllStudents ? filteredPlacements : filteredPlacements.slice(0, 3);

    const reportingPeriod = new Date().toLocaleDateString('en-KE', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    // ── Weekly log form ──────────────────────────────────────────────────────
    const openFormFor = (placementId) => {
        setFormPlacementId(String(placementId));
        setShowForm(true);
        setFormMessage(null);
    };

    const toggleForm = () => {
        setShowForm((v) => !v);
        setFormMessage(null);
    };

    const resetForm = () => {
        setFormPlacementId('');
        setRating(0);
        setTasksCompleted('');
        setHasConcern(false);
        setConcernDetails('');
    };

    const nextWeekFor = (placementId) => {
        const logs = weeklyLogsMap[placementId] || [];
        const maxWeek = logs.reduce((m, l) => Math.max(m, l.week_number || 0), 0);
        return maxWeek + 1;
    };

    const handleSubmitLog = async (e) => {
        e.preventDefault();
        setFormMessage(null);
        if (!formPlacementId) {
            setFormMessage({ type: 'error', text: 'Please select a student.' });
            return;
        }
        if (!rating) {
            setFormMessage({ type: 'error', text: 'Please rate conduct & attendance (1-5 stars).' });
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/supervisors/weekly-logs', {
                placement_id: Number(formPlacementId),
                week_number: nextWeekFor(Number(formPlacementId)),
                tasks_completed: tasksCompleted || null,
                conduct_score: rating,
                attendance_score: rating,
                specific_feedback: tasksCompleted || null,
                has_concern: hasConcern,
                concern_details: hasConcern ? concernDetails || tasksCompleted : null,
            });
            setFormMessage({ type: 'success', text: 'Weekly log submitted successfully.' });
            resetForm();
            fetchData();
            setTimeout(() => {
                setShowForm(false);
                setFormMessage(null);
            }, 1500);
        } catch (err) {
            setFormMessage({
                type: 'error',
                text: err.response?.data?.message || 'Failed to submit weekly log.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="font-body-md text-body-md overflow-x-hidden min-h-screen bg-[var(--color-bg)]">


<aside className="fixed left-0 top-0 h-screen w-sidebar-width bg-[#064D37] flex flex-col py-gutter z-50">
<div className="px-6 mb-10 flex items-center gap-3">
<div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-primary">
<span className="material-symbols-outlined font-bold text-headline-sm">domain</span>
</div>
<div>
<h2 className="text-surface font-headline-md font-bold leading-tight">InduTrack KE</h2>
<p className="text-surface/60 text-[10px] font-label-caps uppercase tracking-widest">Industry Portal</p>
</div>
</div>
<nav className="flex-1 flex flex-col gap-1 px-2">

<Link className="flex items-center gap-3 bg-primary-container text-on-primary border-l-4 border-[#F59E0B] px-4 py-3 transition-transform translate-x-1 duration-200" to="/company">
<span className="material-symbols-outlined">dashboard</span>
<span className="font-label-caps text-label-caps">Dashboard</span>
</Link>
<Link className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-4 py-3 transition-colors duration-200" to="/company/applicants">
<span className="material-symbols-outlined">handshake</span>
<span className="font-label-caps text-label-caps">Applicants</span>
</Link>
<Link className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-4 py-3 transition-colors duration-200" to="/company/evaluate">
<span className="material-symbols-outlined">menu_book</span>
<span className="font-label-caps text-label-caps">Evaluations</span>
</Link>
<Link className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-4 py-3 transition-colors duration-200" to="/messages">
<span className="material-symbols-outlined">location_on</span>
<span className="font-label-caps text-label-caps">Messages</span>
</Link>
<Link className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-4 py-3 transition-colors duration-200" to="/profile">
<span className="material-symbols-outlined">settings</span>
<span className="font-label-caps text-label-caps">Settings</span>
</Link>
</nav>
<div className="px-2 mt-auto pt-6 border-t border-surface/10 flex flex-col gap-1">
<Link className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-4 py-3 transition-colors duration-200" to="/profile">
<span className="material-symbols-outlined">help</span>
<span className="font-label-caps text-label-caps">Help Center</span>
</Link>
<button className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-4 py-3 transition-colors duration-200 text-left w-full" onClick={handleLogout} type="button">
<span className="material-symbols-outlined">logout</span>
<span className="font-label-caps text-label-caps">Logout</span>
</button>
</div>
</aside>

<header className="sticky top-0 ml-sidebar-width h-16 bg-surface flex justify-between items-center px-margin-desktop z-40 border-b border-border">
<div className="flex items-center gap-4">
<div className="relative">
<span className="absolute inset-y-0 left-3 flex items-center text-outline">
<span className="material-symbols-outlined text-[20px]">search</span>
</span>
<input className="pl-10 pr-4 py-2 bg-surface-container-low border border-border rounded-lg text-body-sm focus:ring-2 focus:ring-primary-subtle focus:border-primary outline-none w-64 transition-all" placeholder="Search students or logs..." type="text" value={search} onChange={(e) => setSearch(e.target.value)}/>
</div>
</div>
<div className="flex items-center gap-6">
<div className="flex items-center gap-3">
<NotificationBell buttonClassName="relative p-2 text-on-surface-variant hover:text-primary transition-colors"/>
<AppsMenu
    buttonClassName="p-2 text-on-surface-variant hover:text-primary transition-colors"
    links={[
        { to: '/company', icon: 'dashboard', label: 'Dashboard' },
        { to: '/company/applicants', icon: 'group', label: 'Applicants' },
        { to: '/company/evaluate', icon: 'grade', label: 'Evaluations' },
        { to: '/messages', icon: 'mail', label: 'Messages' },
        { to: '/profile', icon: 'person', label: 'Profile' },
    ]}
/>
</div>
<div className="h-8 w-px bg-border"></div>
<div className="flex items-center gap-3">
<div className="text-right">
<p className="font-body-md font-bold text-on-surface">{user?.name || 'Supervisor'}</p>
<p className="text-[10px] font-label-caps text-on-surface-variant">{context || 'Industry Supervisor'}</p>
</div>
<div className="w-10 h-10 rounded-full border-2 border-primary-subtle overflow-hidden">
<div className="w-full h-full bg-primary-subtle text-primary flex items-center justify-center font-bold">{initials(user?.name)}</div>
</div>
</div>
</div>
</header>
<main className="ml-sidebar-width p-margin-desktop min-h-screen">

<div className="rounded-xl p-8 mb-8 relative overflow-hidden bg-gradient-to-r from-[#F59E0B] to-[#FCD34D] shadow-sm">
<div className="relative z-10 flex flex-col md:flex-row justify-between items-end md:items-center">
<div>
<h1 className="font-headline-md text-display-lg text-[#064D37] mb-1">Supervisor Dashboard</h1>
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-primary">calendar_month</span>
<p className="text-primary font-medium">Reporting Period: {reportingPeriod}</p>
</div>
</div>
<button className="mt-6 md:mt-0 px-6 py-3 bg-[#064D37] text-white rounded-lg font-bold flex items-center gap-2 hover:bg-primary-hover shadow-lg transition-all active:scale-95" onClick={toggleForm} type="button">
<span className="material-symbols-outlined">add_task</span>
                    Submit Weekly Log
                </button>
</div>

<div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-gutter">
<div className="bento-card bg-surface p-6 rounded-xl border border-border flex items-center gap-4">
<div className="w-12 h-12 rounded-lg bg-primary-subtle text-primary flex items-center justify-center">
<span className="material-symbols-outlined">groups</span>
</div>
<div>
<p className="text-on-surface-variant text-label-caps">Assigned Students</p>
<p className="text-headline-md font-bold">{loading ? '…' : placements.length}</p>
</div>
</div>
<div className="bento-card bg-surface p-6 rounded-xl border border-border flex items-center gap-4">
<div className="w-12 h-12 rounded-lg bg-secondary-fixed text-secondary-container flex items-center justify-center">
<span className="material-symbols-outlined">pending_actions</span>
</div>
<div>
<p className="text-on-surface-variant text-label-caps">Pending Reviews</p>
<div className="flex items-center gap-2">
<p className="text-headline-md font-bold">{loading ? '…' : pendingReviews}</p>
{pendingReviews > 0 && <span className="px-2 py-0.5 bg-secondary-fixed text-on-secondary-container rounded-full text-[10px] font-bold">URGENT</span>}
</div>
</div>
</div>
<div className="bento-card bg-surface p-6 rounded-xl border border-border">
<div className="flex justify-between items-center mb-4">
<p className="text-on-surface-variant text-label-caps">Weekly Logs Submitted</p>
<p className="text-body-sm font-bold text-primary">{weeklySubmitted}/{placements.length}</p>
</div>
<div className="w-full bg-surface-container-low h-3 rounded-full overflow-hidden">
<div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${weeklyPct}%` }}></div>
</div>
</div>
<div className="bento-card bg-surface p-6 rounded-xl border border-border flex items-center gap-4">
<div className="w-12 h-12 rounded-lg bg-tertiary-fixed text-tertiary flex items-center justify-center">
<span className="material-symbols-outlined">event</span>
</div>
<div>
<p className="text-on-surface-variant text-label-caps">Upcoming Field Visit</p>
<p className="text-headline-sm font-bold">—</p>
</div>
</div>
</div>

<div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">

<div className="lg:col-span-2 space-y-gutter">

<div className={`${showForm ? '' : 'hidden'} transition-all duration-300`} id="log-form-container">
<div className="bg-surface border-2 border-primary-subtle rounded-xl shadow-md overflow-hidden">
<div className="bg-primary-subtle p-4 border-b border-border flex justify-between items-center">
<h3 className="font-headline-sm text-primary flex items-center gap-2">
<span className="material-symbols-outlined">history_edu</span>
                                Weekly Log Submission
                            </h3>
<button className="text-on-surface-variant hover:text-error transition-colors" onClick={toggleForm} type="button">
<span className="material-symbols-outlined">close</span>
</button>
</div>
<form className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmitLog}>
{formMessage && (
<div className={`md:col-span-2 p-3 rounded-lg text-body-sm font-medium ${formMessage.type === 'success' ? 'bg-primary-subtle text-primary' : 'bg-error-container/30 text-error'}`}>
{formMessage.text}
</div>
)}
<div className="md:col-span-1">
<label className="block text-label-caps mb-2 text-on-surface-variant">Select Student</label>
<select className="w-full p-3 rounded-lg border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none" value={formPlacementId} onChange={(e) => setFormPlacementId(e.target.value)}>
<option value="">-- Select student --</option>
{placements.map((p) => (
<option key={p.id} value={p.id}>
{studentName(p)}{p.student?.reg_number ? ` - ${p.student.reg_number}` : ''} (Week {nextWeekFor(p.id)})
</option>
))}
</select>
</div>
<div className="md:col-span-1">
<label className="block text-label-caps mb-2 text-on-surface-variant">Conduct &amp; Attendance</label>
<div className="flex gap-1 text-secondary-container py-2" id="star-rating">
{[1, 2, 3, 4, 5].map((n) => (
<span
key={n}
className="material-symbols-outlined cursor-pointer"
style={n <= rating ? { fontVariationSettings: "'FILL' 1" } : undefined}
onClick={() => setRating(n)}
>
star
</span>
))}
</div>
</div>
<div className="md:col-span-2">
<label className="block text-label-caps mb-2 text-on-surface-variant">Key Tasks Completed this Week</label>
<textarea className="w-full p-3 rounded-lg border border-border focus:ring-2 focus:ring-primary outline-none" placeholder="Briefly describe the major milestones achieved by the student..." rows="3" value={tasksCompleted} onChange={(e) => setTasksCompleted(e.target.value)}></textarea>
</div>
<div className="md:col-span-2 flex items-center justify-between py-4 bg-surface-container-low px-4 rounded-lg">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-error">report</span>
<span className="font-medium">Flag as needing immediate concern?</span>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input className="sr-only peer" type="checkbox" checked={hasConcern} onChange={(e) => setHasConcern(e.target.checked)}/>
<div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-error"></div>
</label>
</div>
{hasConcern && (
<div className="md:col-span-2">
<label className="block text-label-caps mb-2 text-on-surface-variant">Concern Details</label>
<textarea className="w-full p-3 rounded-lg border border-border focus:ring-2 focus:ring-primary outline-none" placeholder="Describe the concern requiring immediate attention..." rows="2" value={concernDetails} onChange={(e) => setConcernDetails(e.target.value)}></textarea>
</div>
)}
<div className="md:col-span-2 flex justify-end gap-3">
<button className="px-6 py-2 rounded-lg border border-border font-medium hover:bg-surface-container transition-colors" onClick={toggleForm} type="button">Cancel</button>
<button className="px-8 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover transition-colors" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Report'}</button>
</div>
</form>
</div>
</div>

<div className="bg-surface rounded-xl border border-border overflow-hidden">
<div className="p-6 border-b border-border flex justify-between items-center">
<h3 className="font-headline-sm">My Active Students</h3>
<button className="text-primary font-medium hover:underline text-body-sm" onClick={() => setShowAllStudents((v) => !v)} type="button">{showAllStudents ? 'Show Less' : 'View All'}</button>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left">
<thead>
<tr className="bg-surface-container-low border-b border-border">
<th className="px-6 py-4 text-label-caps text-on-surface-variant font-bold">Student Name</th>
<th className="px-6 py-4 text-label-caps text-on-surface-variant font-bold">Reg Number</th>
<th className="px-6 py-4 text-label-caps text-on-surface-variant font-bold">Progress</th>
<th className="px-6 py-4 text-label-caps text-on-surface-variant font-bold">Last Log</th>
<th className="px-6 py-4 text-label-caps text-on-surface-variant font-bold">Status</th>
<th className="px-6 py-4 text-label-caps text-on-surface-variant font-bold">Actions</th>
</tr>
</thead>
<tbody className="divide-y divide-border">
{loading && (
<tr>
<td className="px-6 py-4 text-body-sm text-on-surface-variant" colSpan="6">Loading students…</td>
</tr>
)}
{!loading && placements.length === 0 && (
<tr>
<td className="px-6 py-4 text-body-sm text-on-surface-variant" colSpan="6">No students assigned yet.</td>
</tr>
)}
{!loading && placements.length > 0 && filteredPlacements.length === 0 && (
<tr>
<td className="px-6 py-4 text-body-sm text-on-surface-variant" colSpan="6">No students match your search.</td>
</tr>
)}
{!loading && visiblePlacements.map((p) => {
    const week = latestEntryWeek(p);
    const pct = Math.min(100, Math.round((week / TOTAL_WEEKS) * 100));
    const status = studentStatus(p);
    return (
<tr key={p.id} className="hover:bg-background transition-colors group">
<td className="px-6 py-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-primary-subtle flex items-center justify-center text-primary font-bold overflow-hidden">
{initials(studentName(p))}
</div>
<div>
<p className="font-bold">{studentName(p)}</p>
<p className="text-[10px] text-on-surface-variant">{p.student?.program || p.student?.department || '—'}</p>
</div>
</div>
</td>
<td className="px-6 py-4 text-body-sm">{p.student?.reg_number || '—'}</td>
<td className="px-6 py-4">
<div className="w-24">
<div className="flex justify-between text-[10px] mb-1">
<span>Week {week}/{TOTAL_WEEKS}</span>
<span>{pct}%</span>
</div>
<div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden">
<div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }}></div>
</div>
</div>
</td>
<td className="px-6 py-4 text-body-sm">{shortDate(latestEntryDate(p))}</td>
<td className="px-6 py-4">
{status.tone === 'error' ? (
<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-error-container text-error text-[10px] font-bold">
<span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                                            {status.label}
                                        </span>
) : (
<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-subtle text-primary text-[10px] font-bold">
<span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                            {status.label}
                                        </span>
)}
</td>
<td className="px-6 py-4">
<div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button className="p-2 bg-surface-container border border-border rounded-lg text-primary hover:bg-primary-subtle" title="Submit weekly log" onClick={() => openFormFor(p.id)} type="button">
<span className="material-symbols-outlined text-[18px]">rate_review</span>
</button>
<button className="p-2 bg-surface-container border border-border rounded-lg text-on-surface-variant hover:bg-surface-container-high" title="Message student" onClick={() => navigate('/messages')} type="button">
<span className="material-symbols-outlined text-[18px]">chat</span>
</button>
</div>
</td>
</tr>
    );
})}
</tbody>
</table>
</div>
</div>
</div>

<div className="space-y-gutter">

<div className="bg-surface rounded-xl border-2 border-error border-dashed p-6">
<div className="flex items-center gap-3 mb-6">
<span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
<h3 className="font-headline-sm text-error">Active Flags</h3>
</div>
<div className="space-y-4">
{activeFlags.length === 0 && (
<p className="text-body-sm text-on-surface-variant">No active flags. All students are in good standing.</p>
)}
{activeFlags.map((f, i) => (
<div key={i} className="p-4 bg-error-container/30 rounded-lg border border-error/20">
<div className="flex justify-between items-start mb-2">
<p className="font-bold text-on-surface">{f.student}</p>
<span className="px-2 py-0.5 bg-error text-white rounded text-[10px] font-bold">WEEK {f.week}</span>
</div>
<p className="text-body-sm text-on-surface-variant">{f.details}</p>
</div>
))}
</div>
</div>

<div className="bg-surface rounded-xl border border-border overflow-hidden">
<div className="p-6 border-b border-border">
<h3 className="font-headline-sm">Recent Activity</h3>
</div>
<div className="p-6 space-y-6">
{recentActivity.length === 0 && (
<p className="text-body-sm text-on-surface-variant">No recent logbook activity from your students.</p>
)}
{visibleActivity.map((a, i) => (
<div key={i} className="flex gap-4">
<div className="relative">
<div className="w-8 h-8 rounded-full bg-primary-subtle flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[18px]">history_edu</span>
</div>
{i < visibleActivity.length - 1 && <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-8 bg-border"></div>}
</div>
<div>
<p className="text-body-sm"><span className="font-bold">{a.student}</span> submitted Week {a.week} Logbook.</p>
<p className="text-[10px] text-on-surface-variant mt-1 uppercase">{relativeTime(a.at)}</p>
</div>
</div>
))}
</div>
<button className="w-full p-4 text-center text-body-sm font-medium text-primary bg-surface-container-low hover:bg-surface-container transition-colors" onClick={() => setShowAllActivity((v) => !v)} type="button">
                        {showAllActivity ? 'Show Recent Activity Only' : 'View Full Activity Log'}
                    </button>
</div>
</div>
</div>
</main>


        </div>
    );
}
