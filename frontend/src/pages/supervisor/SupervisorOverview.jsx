import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';

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
    if (mins < 60) return `${Math.max(mins, 1)}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};

const queueAge = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${Math.max(hrs, 1)} HOURS AGO`;
    const days = Math.floor(hrs / 24);
    return `${days} DAY${days > 1 ? 'S' : ''} AGO`;
};

const TOTAL_WEEKS = 12;

export default function SupervisorDashboard() {
    const { user, context, logout } = useAuth();
    const navigate = useNavigate();

    const [placements, setPlacements] = useState([]);
    const [entriesMap, setEntriesMap] = useState({}); // placementId -> logbook entries[]
    const [visits, setVisits] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewing, setReviewing] = useState(null); // entry id being reviewed
    const [banner, setBanner] = useState(null); // { type, text }

    // Header search + students table toggle + scroll target for "Analyze Trends"
    const [search, setSearch] = useState('');
    const [showAllStudents, setShowAllStudents] = useState(false);
    const studentsTableRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [studentsRes, visitsRes, convRes] = await Promise.allSettled([
                api.get('/supervisors/students'),
                api.get('/field-visits'),
                api.get('/messages/conversations'),
            ]);

            const list =
                studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value.data)
                    ? studentsRes.value.data
                    : [];
            setPlacements(list);
            setVisits(visitsRes.status === 'fulfilled' ? visitsRes.value.data || [] : []);
            setConversations(convRes.status === 'fulfilled' ? convRes.value.data || [] : []);

            // Load logbook entries per placement (bounded to first 10 to avoid N+1 overload)
            const subset = list.slice(0, 10);
            const results = await Promise.allSettled(
                subset.map((p) => api.get(`/supervisors/placements/${p.id}/logbook`))
            );
            const entMap = {};
            results.forEach((r, idx) => {
                if (r.status === 'fulfilled') {
                    entMap[subset[idx].id] = r.value.data?.logbook_entries || [];
                }
            });
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
    const latestWeek = (p) =>
        (entriesMap[p.id] || []).reduce((max, e) => Math.max(max, e.week_number || 0), 0);

    const visitForPlacement = (placementId) =>
        visits.find((v) => v.placement_id === placementId);

    const pendingEntries = placements
        .flatMap((p) =>
            (entriesMap[p.id] || [])
                .filter((e) => ['draft', 'submitted'].includes(e.status))
                .map((e) => ({ ...e, _student: studentName(p) }))
        )
        .sort((a, b) => new Date(a.created_at || a.entry_date) - new Date(b.created_at || b.entry_date));

    const completedVisits = visits.filter((v) => v.status === 'completed').length;
    const visitPct = visits.length ? Math.round((completedVisits / visits.length) * 100) : 0;

    const gradesPending = placements.filter(
        (p) => p.academic_grade == null && ['active', 'completed'].includes(p.status)
    ).length;

    const upcomingVisits = [...visits]
        .sort((a, b) => new Date(a.visit_date) - new Date(b.visit_date))
        .filter((v) => v.status !== 'cancelled')
        .slice(0, 3);

    const todayStr = new Date().toDateString();
    const visitToday = visits.find(
        (v) => v.status === 'scheduled' && new Date(v.visit_date).toDateString() === todayStr
    );

    const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

    // Students table: filter by header search, then limit unless "View All" toggled
    const filteredPlacements = placements.filter((p) =>
        studentName(p).toLowerCase().includes(search.trim().toLowerCase())
    );
    const visiblePlacements = showAllStudents ? filteredPlacements : filteredPlacements.slice(0, 5);

    // ── Actions ──────────────────────────────────────────────────────────────
    const handleReview = async (entryId) => {
        setReviewing(entryId);
        setBanner(null);
        try {
            await api.post(`/logbooks/${entryId}/review`, {
                action: 'approved',
                comment: 'Reviewed and approved by academic supervisor.',
            });
            setBanner({ type: 'success', text: 'Logbook entry approved.' });
            fetchData();
        } catch (err) {
            setBanner({
                type: 'error',
                text: err.response?.data?.message || 'Failed to review entry.',
            });
        } finally {
            setReviewing(null);
        }
    };

    const handleGrade = async (placement) => {
        const input = window.prompt(
            `Enter final grade (0-100) for ${studentName(placement)}:`,
            placement.academic_grade ?? ''
        );
        if (input === null || input === '') return;
        const grade = Number(input);
        if (Number.isNaN(grade) || grade < 0 || grade > 100) {
            setBanner({ type: 'error', text: 'Grade must be a number between 0 and 100.' });
            return;
        }
        try {
            await api.post(`/placements/${placement.id}/grade`, { grade });
            setBanner({ type: 'success', text: `Grade recorded for ${studentName(placement)}.` });
            fetchData();
        } catch (err) {
            setBanner({
                type: 'error',
                text: err.response?.data?.message || 'Failed to record grade.',
            });
        }
    };

    return (
        <div className="flex-1 p-margin-desktop w-full animate-in fade-in duration-300">

<section className="academic-gradient px-margin-desktop py-12 text-white relative overflow-hidden">
<div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
<div>
<h1 className="font-display-lg text-display-lg font-bold">Academic Supervisor — Dashboard</h1>
<p className="text-body-lg opacity-90">{context || 'Institutional Supervision Portal'}</p>
</div>
<button className="bg-[#F59E0B] hover:bg-[#D97706] text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1" onClick={() => navigate('/supervisor/visits')} type="button">
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
                    Schedule Field Visit
                </button>
</div>

<div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
</section>
<div className="p-margin-desktop space-y-gutter max-w-container-max mx-auto">

{banner && (
<div className={`p-4 rounded-xl text-body-sm font-medium border ${banner.type === 'success' ? 'bg-primary-subtle text-primary border-primary/20' : 'bg-error-container/30 text-error border-error/20'}`}>
{banner.text}
</div>
)}

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">

<div className="bg-surface border border-border p-6 rounded-xl flex items-center gap-4 hover:shadow-md transition-shadow">
<div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center rounded-lg">
<span className="material-symbols-outlined text-3xl">group</span>
</div>
<div>
<p className="text-label-caps text-on-surface-variant uppercase">My Students</p>
<p className="text-headline-md font-bold">{loading ? '…' : placements.length}</p>
</div>
</div>

<div className="bg-surface border border-[#F59E0B]/30 p-6 rounded-xl flex items-center gap-4 hover:shadow-md transition-shadow">
<div className="w-12 h-12 bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center rounded-lg">
<span className="material-symbols-outlined text-3xl">rate_review</span>
</div>
<div>
<div className="flex items-center gap-2">
<p className="text-label-caps text-on-surface-variant uppercase">Logbooks to Review</p>
{pendingEntries.length > 0 && <span className="flex h-2 w-2 rounded-full bg-[#F59E0B] animate-pulse"></span>}
</div>
<p className="text-headline-md font-bold text-[#F59E0B]">{loading ? '…' : pendingEntries.length}</p>
</div>
</div>

<div className="bg-surface border border-border p-6 rounded-xl flex flex-col gap-3 hover:shadow-md transition-shadow">
<div className="flex items-center justify-between">
<div className="flex items-center gap-3">
<div className="w-10 h-10 bg-secondary/10 text-secondary flex items-center justify-center rounded-lg">
<span className="material-symbols-outlined">location_on</span>
</div>
<p className="text-label-caps text-on-surface-variant uppercase">Field Visits</p>
</div>
<p className="font-bold text-on-surface">{completedVisits}/{visits.length}</p>
</div>
<div className="w-full bg-surface-container rounded-full h-2">
<div className="bg-secondary h-2 rounded-full" style={{ width: `${visitPct}%` }}></div>
</div>
</div>

<div className="bg-surface border border-error/30 p-6 rounded-xl flex items-center gap-4 hover:shadow-md transition-shadow">
<div className="w-12 h-12 bg-error/10 text-error flex items-center justify-center rounded-lg">
<span className="material-symbols-outlined text-3xl">grading</span>
</div>
<div>
<p className="text-label-caps text-on-surface-variant uppercase">Grades Pending</p>
<div className="flex items-center gap-2">
<p className="text-headline-md font-bold text-error">{loading ? '…' : gradesPending}</p>
{gradesPending > 0 && <span className="bg-error text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ACTION REQUIRED</span>}
</div>
</div>
</div>
</div>

<div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">

<div className="lg:col-span-2 space-y-gutter">

<div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden" ref={studentsTableRef}>
<div className="px-6 py-4 border-b border-border flex items-center justify-between">
<h2 className="font-headline-sm text-headline-sm text-on-surface">Supervised Students</h2>
<button className="text-primary font-bold text-body-sm hover:underline" onClick={() => setShowAllStudents((v) => !v)} type="button">{showAllStudents ? 'Show Less' : 'View All'}</button>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead className="bg-background">
<tr>
<th className="px-6 py-3 text-label-caps text-on-surface-variant font-label-caps">Student</th>
<th className="px-6 py-3 text-label-caps text-on-surface-variant font-label-caps">Company</th>
<th className="px-6 py-3 text-label-caps text-on-surface-variant font-label-caps">Progress</th>
<th className="px-6 py-3 text-label-caps text-on-surface-variant font-label-caps">Visit Status</th>
<th className="px-6 py-3 text-label-caps text-on-surface-variant font-label-caps">Score</th>
<th className="px-6 py-3 text-label-caps text-on-surface-variant font-label-caps">Action</th>
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
<td className="px-6 py-4 text-body-sm text-on-surface-variant" colSpan="6">No students assigned to you yet.</td>
</tr>
)}
{!loading && placements.length > 0 && filteredPlacements.length === 0 && (
<tr>
<td className="px-6 py-4 text-body-sm text-on-surface-variant" colSpan="6">No students match your search.</td>
</tr>
)}
{!loading && visiblePlacements.map((p) => {
    const week = latestWeek(p);
    const pct = Math.min(100, Math.round((week / TOTAL_WEEKS) * 100));
    const visit = visitForPlacement(p.id);
    const visitDone = visit?.status === 'completed';
    return (
<tr key={p.id} className="hover:bg-background transition-colors group">
<td className="px-6 py-4">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-primary-subtle text-primary flex items-center justify-center font-bold text-xs">{initials(studentName(p))}</div>
<div>
<p className="text-body-sm font-bold">{studentName(p)}</p>
<p className="text-[11px] text-on-surface-variant">Reg: {p.student?.reg_number || '—'}</p>
</div>
</div>
</td>
<td className="px-6 py-4 text-body-sm text-on-surface-variant font-medium">{p.company?.name || '—'}</td>
<td className="px-6 py-4">
<div className="flex items-center gap-2">
<div className="w-16 bg-surface-container rounded-full h-1.5">
<div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
</div>
<span className="text-[11px] font-bold text-on-surface-variant">Wk {week}</span>
</div>
</td>
<td className="px-6 py-4">
{visitDone ? (
<div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#ECFDF5] text-[#0A6E4F] text-[10px] font-bold">
<span className="w-1.5 h-1.5 rounded-full bg-[#0A6E4F]"></span>
                                                COMPLETED
                                            </div>
) : (
<div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary-fixed/30 text-secondary text-[10px] font-bold">
<span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                                                {visit ? 'SCHEDULED' : 'PENDING'}
                                            </div>
)}
</td>
<td className="px-6 py-4 font-label-code text-label-code font-bold">{p.academic_grade != null ? `${p.academic_grade}/100` : '--'}</td>
<td className="px-6 py-4">
<div className="flex gap-2">
<button className="p-1.5 text-on-surface-variant hover:text-primary transition-colors" title="Grade Student" onClick={() => handleGrade(p)} type="button">
<span className="material-symbols-outlined text-lg">edit_note</span>
</button>
<button className="p-1.5 text-on-surface-variant hover:text-primary transition-colors" title="Send Comment" onClick={() => navigate('/messages')} type="button">
<span className="material-symbols-outlined text-lg">chat_bubble</span>
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

<div className="space-y-4">
<div className="flex items-center justify-between">
<h2 className="font-headline-sm text-headline-sm text-on-surface">Logbook Review Queue</h2>
<span className="text-label-caps text-on-surface-variant">Sorted by Oldest First</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{!loading && pendingEntries.length === 0 && (
<div className="bg-surface border border-border p-5 rounded-xl md:col-span-2">
<p className="text-body-sm text-on-surface-variant">No logbook entries awaiting review. Great job staying up to date.</p>
</div>
)}
{pendingEntries.slice(0, 4).map((entry) => (
<div key={entry.id} className="bg-surface border border-border p-5 rounded-xl flex flex-col justify-between hover:border-primary/50 transition-all">
<div className="flex justify-between items-start mb-4">
<div>
<h3 className="text-body-md font-bold text-on-surface">Week {entry.week_number}: {(entry.activities || 'Logbook Entry').slice(0, 40)}{(entry.activities || '').length > 40 ? '…' : ''}</h3>
<p className="text-body-sm text-on-surface-variant">Student: {entry._student}</p>
</div>
<span className="text-label-code text-[10px] bg-background px-2 py-1 rounded font-bold">{queueAge(entry.created_at || entry.entry_date)}</span>
</div>
<div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
<p className="text-[11px] font-medium text-on-surface-variant">Status: <span className={entry.status === 'submitted' ? 'text-error' : 'text-primary'}>{entry.status === 'submitted' ? 'Awaiting Feedback' : 'New Submission'}</span></p>
<button className="bg-[#0A6E4F] hover:bg-primary-hover text-white text-[11px] font-bold px-4 py-2 rounded-lg flex items-center gap-1 transition-colors" onClick={() => handleReview(entry.id)} disabled={reviewing === entry.id} type="button">
                                        {reviewing === entry.id ? 'Reviewing…' : 'Review'} <span className="material-symbols-outlined text-sm">chevron_right</span>
</button>
</div>
</div>
))}
</div>
</div>
</div>

<div className="space-y-gutter">

<div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
<div className="px-6 py-4 border-b border-border bg-background/50">
<h2 className="font-headline-sm text-headline-sm text-on-surface">Upcoming Visits</h2>
</div>

{visitToday && (
<div className="bg-[#F59E0B]/10 border-y border-[#F59E0B]/20 px-6 py-3 flex items-center gap-3">
<span className="material-symbols-outlined text-[#F59E0B]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
<p className="text-body-sm font-bold text-[#B45309]">Visit today at {visitToday.placement?.company?.name || 'company'} ({visitToday.placement?.student?.user?.name || 'student'})</p>
</div>
)}
<div className="p-6 space-y-4">
{!loading && upcomingVisits.length === 0 && (
<p className="text-body-sm text-on-surface-variant">No field visits scheduled yet.</p>
)}
{upcomingVisits.map((v, i) => {
    const d = new Date(v.visit_date);
    const done = v.status === 'completed';
    return (
<div key={v.id} className="flex gap-4">
<div className="flex flex-col items-center">
<div className={done ? 'w-10 h-10 bg-surface-container text-on-surface-variant rounded-lg flex flex-col items-center justify-center' : 'w-10 h-10 bg-primary/10 text-primary rounded-lg flex flex-col items-center justify-center'}>
<span className="text-[10px] font-bold uppercase leading-none">{d.toLocaleDateString('en-KE', { month: 'short' })}</span>
<span className="text-lg font-bold leading-none">{String(d.getDate()).padStart(2, '0')}</span>
</div>
{i < upcomingVisits.length - 1 && <div className="w-px h-8 bg-border my-1"></div>}
</div>
<div className={done ? 'flex-1 opacity-60' : 'flex-1'}>
<h4 className="text-body-sm font-bold">{v.placement?.company?.name || 'Company'}</h4>
<p className="text-[11px] text-on-surface-variant">Student: {v.placement?.student?.user?.name || '—'}</p>
<p className={done ? 'text-[11px] font-medium text-on-surface-variant mt-1' : 'text-[11px] font-medium text-primary mt-1'}>{done ? 'Completed' : `${v.visit_time || 'TBD'} — ${v.status ? v.status.charAt(0).toUpperCase() + v.status.slice(1) : 'Scheduled'}`}</p>
</div>
</div>
    );
})}
<Link className="block w-full text-center py-2 text-primary font-bold text-body-sm hover:bg-primary-subtle rounded-lg transition-colors" to="/supervisor/visits">
                                View Full Schedule
                            </Link>
</div>
</div>

<div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
<div className="px-6 py-4 border-b border-border flex items-center justify-between">
<h2 className="font-headline-sm text-headline-sm text-on-surface">Messages</h2>
{totalUnread > 0 && <span className="bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{totalUnread} NEW</span>}
</div>
<div className="divide-y divide-border">
{!loading && conversations.length === 0 && (
<div className="p-4">
<p className="text-body-sm text-on-surface-variant">No conversations yet.</p>
</div>
)}
{conversations.slice(0, 3).map((c) => (
<Link key={c.partner_id} className="block p-4 hover:bg-background transition-colors" to="/messages">
<div className="flex gap-3">
<div className="w-10 h-10 rounded-full bg-secondary-container/20 text-secondary flex items-center justify-center font-bold text-xs">{initials(c.partner_name)}</div>
<div className="flex-1 min-w-0">
<div className="flex justify-between items-start">
<p className="text-body-sm font-bold truncate">{c.partner_name}</p>
<span className="text-[10px] text-on-surface-variant">{relativeTime(c.last_time)}</span>
</div>
<p className="text-[11px] text-on-surface-variant line-clamp-1">{c.last_message}</p>
</div>
</div>
</Link>
))}
</div>
<div className="p-4 bg-background/30 text-center">
<Link className="text-primary font-bold text-body-sm hover:underline" to="/messages">Go to Inbox</Link>
</div>
</div>

<div className="relative bg-[#064D37] rounded-xl p-6 overflow-hidden text-white group">
<div className="relative z-10">
<h3 className="font-headline-sm text-headline-sm mb-2">Portfolio Quality</h3>
<p className="text-body-sm opacity-80 mb-4">{placements.length > 0 ? `You are supervising ${placements.length} student${placements.length > 1 ? 's' : ''} with ${pendingEntries.length} logbook entr${pendingEntries.length === 1 ? 'y' : 'ies'} awaiting your review.` : 'Your supervision portfolio insights will appear here once students are assigned.'}</p>
<button className="flex items-center gap-2 text-accent-hover font-bold text-body-sm" onClick={() => studentsTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} type="button">
<span>Analyze Trends</span>
<span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">trending_up</span>
</button>
</div>
<div className="absolute -right-8 -bottom-8 opacity-20 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
<span className="material-symbols-outlined text-[120px]">school</span>
</div>
</div>
</div>
</div>
</div>

<button className="fixed right-8 bottom-8 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-primary-hover hover:scale-110 active:scale-95 transition-all z-50" onClick={() => navigate('/supervisor/visits')} title="Schedule Field Visit" type="button">
<span className="material-symbols-outlined text-3xl">add</span>
</button>

        </div>
    );
}
