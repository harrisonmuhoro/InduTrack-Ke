import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../axios';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import AppsMenu from '../components/AppsMenu';

// Donut segment colors (same palette as the original static mockup)
const DONUT_COLORS = ['#0A6E4F', '#F59E0B', '#12A37A', '#E2E8F0'];

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

export default function InstitutionDashboard() {
    const { user, context, logout } = useAuth();
    const navigate = useNavigate();

    // Analytics from GET /admin/dashboard
    const [analytics, setAnalytics] = useState({
        totalStudents: 0,
        activePlacements: 0,
        openSlots: 0,
        pendingDocuments: 0,
        flaggedStudents: 0,
        completedPlacements: 0,
        placementRate: 0,
        logbooksThisWeek: 0,
        inactiveStudents: 0,
    });

    // Compliance data from GET /admin/compliance
    const [compliance, setCompliance] = useState({
        inactive_students: [],
        flagged_students: [],
        pending_documents: [],
    });

    // Pending placements from GET /admin/placements?status=pending
    const [pendingPlacements, setPendingPlacements] = useState([]);
    const [pendingTotal, setPendingTotal] = useState(0);

    // Industry distribution computed from GET /admin/companies
    const [industrySegments, setIndustrySegments] = useState([]);
    const [totalHosts, setTotalHosts] = useState(0);

    const [actionBusy, setActionBusy] = useState(null); // id of placement/flag being processed

    // ── UI state for wired controls ────────────────────────────────────────
    const [showAllFlags, setShowAllFlags] = useState(false);
    const [expandedPlacement, setExpandedPlacement] = useState(null); // placement id with details open
    const [quickActionNotice, setQuickActionNotice] = useState('');   // dismissible "coming soon" banner
    const [showUpdateDetails, setShowUpdateDetails] = useState(false); // System Update "Learn More"

    // ── Section refs for scroll navigation ─────────────────────────────────
    const heroRef = useRef(null);
    const complianceRef = useRef(null);
    const approvalQueueRef = useRef(null);
    const industryRef = useRef(null);

    const scrollToSection = (ref) => (e) => {
        if (e) e.preventDefault();
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    useEffect(() => {
        api.get('/admin/dashboard')
            .then((res) => setAnalytics((prev) => ({ ...prev, ...res.data })))
            .catch(() => {});

        api.get('/admin/compliance')
            .then((res) =>
                setCompliance({
                    inactive_students: res.data.inactive_students || [],
                    flagged_students: res.data.flagged_students || [],
                    pending_documents: res.data.pending_documents || [],
                })
            )
            .catch(() => {});

        api.get('/admin/placements', { params: { status: 'pending' } })
            .then((res) => {
                setPendingPlacements(res.data.data || []);
                setPendingTotal(res.data.total ?? (res.data.data || []).length);
            })
            .catch(() => {});

        // Backend analytics endpoint has no industry breakdown, so we compute it
        // from the companies list (first page of GET /admin/companies, 20 per page).
        api.get('/admin/companies')
            .then((res) => {
                const companies = res.data.data || [];
                setTotalHosts(res.data.total ?? companies.length);
                const counts = {};
                companies.forEach((c) => {
                    const key = c.industry || 'Other';
                    counts[key] = (counts[key] || 0) + 1;
                });
                const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                const top = sorted.slice(0, 3);
                const otherCount = sorted.slice(3).reduce((sum, [, n]) => sum + n, 0);
                const totalN = companies.length || 1;
                const segments = top.map(([label, n], i) => ({
                    label,
                    pct: Math.round((n / totalN) * 100),
                    color: DONUT_COLORS[i],
                }));
                if (otherCount > 0 || segments.length === 0) {
                    segments.push({
                        label: 'Other',
                        pct: Math.max(0, 100 - segments.reduce((s, x) => s + x.pct, 0)),
                        color: DONUT_COLORS[3],
                    });
                }
                setIndustrySegments(segments);
            })
            .catch(() => {});
    }, []);

    const handleLogout = async (e) => {
        e.preventDefault();
        await logout();
        navigate('/login');
    };

    const handleApprove = async (id) => {
        setActionBusy(id);
        try {
            await api.put(`/admin/placements/${id}/approve`);
            setPendingPlacements((prev) => prev.filter((p) => p.id !== id));
            setPendingTotal((prev) => Math.max(0, prev - 1));
            setAnalytics((prev) => ({ ...prev, activePlacements: prev.activePlacements + 1 }));
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

    const handleResolveFlag = async (flagId) => {
        setActionBusy(`flag-${flagId}`);
        try {
            await api.put(`/admin/flags/${flagId}/resolve`);
            setCompliance((prev) => ({
                ...prev,
                flagged_students: prev.flagged_students.filter((f) => f.id !== flagId),
            }));
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

    // ── Compliance health bars ─────────────────────────────────────────────
    // Docs approved rate: approximated as share of students without a pending
    // document (backend exposes pending count, not total-docs count).
    const docsBar =
        analytics.totalStudents > 0
            ? Math.max(
                  0,
                  Math.round(
                      (1 - compliance.pending_documents.length / analytics.totalStudents) * 100
                  )
              )
            : 100;
    // Logbook submission rate: active placements with a logbook entry in the
    // last 2 weeks (inactive_students from GET /admin/compliance).
    const logbookBar =
        analytics.activePlacements > 0
            ? Math.max(
                  0,
                  Math.round(
                      (1 - compliance.inactive_students.length / analytics.activePlacements) * 100
                  )
              )
            : 100;
    // Backend has no aggregate evaluation-submission metric; approximated as the
    // share of active placements without an unresolved flag.
    const evalBar =
        analytics.activePlacements > 0
            ? Math.max(
                  0,
                  Math.round(
                      (1 - compliance.flagged_students.length / analytics.activePlacements) * 100
                  )
              )
            : 100;
    const aggregateScore = Math.round((docsBar + logbookBar + evalBar) / 3);

    const userName = user?.name || 'Institution Admin';
    const institutionName = context || 'Institution';
    const flaggedRows = showAllFlags
        ? compliance.flagged_students
        : compliance.flagged_students.slice(0, 2);

    return (
        <div className="font-body-md text-body-md overflow-x-hidden min-h-screen bg-[var(--color-bg)]">


<aside className="fixed left-0 top-0 h-screen w-sidebar-width bg-[#064D37] shadow-sm z-50 flex flex-col py-gutter">
<div className="px-6 mb-8">
<h1 className="text-headline-md font-headline-md font-bold text-surface">InduTrack KE</h1>
<p className="text-label-caps font-label-caps text-surface/60 mt-1">Institutional Portal</p>
</div>
<nav className="flex-1 space-y-1">
<Link className="flex items-center gap-3 bg-primary-container text-on-primary border-l-4 border-[#F59E0B] px-4 py-3 translate-x-1 transition-transform" to="/institution">
<span className="material-symbols-outlined">dashboard</span>
<span className="text-label-caps font-label-caps">Dashboard</span>
</Link>
<a className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 transition-colors duration-200 px-4 py-3" href="#" onClick={scrollToSection(heroRef)}>
<span className="material-symbols-outlined">domain</span>
<span className="text-label-caps font-label-caps">Institutions</span>
</a>
<a className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 transition-colors duration-200 px-4 py-3" href="#" onClick={scrollToSection(industryRef)}>
<span className="material-symbols-outlined">handshake</span>
<span className="text-label-caps font-label-caps">Industry Partners</span>
</a>
<a className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 transition-colors duration-200 px-4 py-3" href="#" onClick={scrollToSection(complianceRef)}>
<span className="material-symbols-outlined">menu_book</span>
<span className="text-label-caps font-label-caps">Student Logbooks</span>
</a>
<a className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 transition-colors duration-200 px-4 py-3" href="#" onClick={scrollToSection(approvalQueueRef)}>
<span className="material-symbols-outlined">location_on</span>
<span className="text-label-caps font-label-caps">Placement Tracker</span>
</a>
<Link className="flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 transition-colors duration-200 px-4 py-3" to="/profile">
<span className="material-symbols-outlined">settings</span>
<span className="text-label-caps font-label-caps">Settings</span>
</Link>
</nav>
<div className="px-4 py-3">
<button className="w-full py-3 px-4 bg-secondary-container text-on-secondary-container font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors" onClick={() => scrollToSection(approvalQueueRef)()}>
<span className="material-symbols-outlined">add</span>
                New Placement
            </button>
</div>
<div className="mt-auto space-y-1">
<a className="flex items-center gap-3 text-surface-variant/80 hover:text-surface px-4 py-3 transition-colors" href="mailto:support@indutrack.ke">
<span className="material-symbols-outlined">help</span>
<span className="text-label-caps font-label-caps">Help Center</span>
</a>
<a className="flex items-center gap-3 text-surface-variant/80 hover:text-surface px-4 py-3 transition-colors" href="#" onClick={handleLogout}>
<span className="material-symbols-outlined">logout</span>
<span className="text-label-caps font-label-caps">Logout</span>
</a>
</div>
</aside>

<main className="ml-sidebar-width min-h-screen">

<header className="sticky top-0 w-full bg-surface border-b border-border z-40 h-16 flex items-center justify-between px-margin-desktop">
<div className="flex items-center bg-surface-container-low px-4 py-2 rounded-full w-96 border border-border">
<span className="material-symbols-outlined text-on-surface-variant">search</span>
<input className="bg-transparent border-none focus:ring-0 text-body-sm w-full ml-2 placeholder:text-on-surface-variant/60" placeholder="Search students or cohorts..." type="text"/>
</div>
<div className="flex items-center gap-4">
<NotificationBell buttonClassName="relative p-2 text-on-surface-variant hover:text-primary transition-colors focus:ring-2 ring-primary-subtle rounded-full" />
<AppsMenu
    buttonClassName="p-2 text-on-surface-variant hover:text-primary transition-colors focus:ring-2 ring-primary-subtle rounded-full"
    links={[
        { to: '/institution', icon: 'dashboard', label: 'Dashboard' },
        { to: '/messages', icon: 'mail', label: 'Messages' },
        { to: '/profile', icon: 'person', label: 'Profile' },
    ]}
/>
<div className="flex items-center gap-3 pl-4 border-l border-border">
<div className="text-right">
<p className="text-label-caps font-label-caps text-text-main">{userName}</p>
<p className="text-[10px] text-on-surface-variant font-medium">Institution Admin</p>
</div>
{/* Local initials avatar (replaces external googleusercontent image) */}
<div className="w-10 h-10 rounded-full border-2 border-primary-container bg-primary-subtle text-primary flex items-center justify-center font-bold text-sm">{initialsOf(userName)}</div>
</div>
</div>
</header>

<div className="p-8 max-w-[1280px] mx-auto">

<div className="mb-8 flex justify-between items-end bg-gradient-to-r from-error to-[#93000a] p-8 rounded-xl text-white shadow-lg overflow-hidden relative" ref={heroRef}>
<div className="z-10">
<h1 className="font-headline-md text-headline-md mb-1">Admin Dashboard — {institutionName}</h1>
{/* Backend has no "current reporting period" endpoint; showing today's date instead of a hardcoded semester */}
<p className="text-body-md opacity-90">Reporting Period: {new Date().toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}</p>
</div>
<button className="z-10 flex items-center gap-3 bg-[#F59E0B] hover:bg-accent-hover text-on-secondary-container font-bold px-6 py-3 rounded-lg transition-transform active:scale-95 shadow-md" onClick={() => scrollToSection(approvalQueueRef)()}>
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
                    Approve Placements ({pendingTotal})
                </button>

<div className="absolute -right-12 -top-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
</div>

<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">

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

<div className="bg-white p-6 rounded-xl border border-border shadow-sm mb-8" ref={complianceRef}>
<div className="flex items-center justify-between mb-6">
<h2 className="text-headline-sm font-headline-sm flex items-center gap-2">
<span className="material-symbols-outlined text-primary">security</span>
                        Institutional Compliance Health
                    </h2>
<span className="text-body-sm text-on-surface-variant font-medium">Aggregate Score: <span className="text-primary font-bold">{aggregateScore}%</span></span>
</div>
<div className="space-y-6">
<div>
<div className="flex justify-between text-label-caps mb-2">
<span>Docs Approved (Insurance/Clearance)</span>
<span className="font-bold">{docsBar}%</span>
</div>
<div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
<div className="compliance-bar h-full bg-primary" style={{ width: `${docsBar}%` }}></div>
</div>
</div>
<div>
<div className="flex justify-between text-label-caps mb-2">
<span>Logbook Submission Rate (Bi-Weekly)</span>
<span className="font-bold">{logbookBar}%</span>
</div>
<div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
<div className="compliance-bar h-full bg-primary" style={{ width: `${logbookBar}%` }}></div>
</div>
</div>
<div>
<div className="flex justify-between text-label-caps mb-2">
<span>Evaluations Submitted (Industry Supervisors)</span>
<span className="font-bold">{evalBar}%</span>
</div>
<div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
<div className="compliance-bar h-full bg-[#F59E0B]" style={{ width: `${evalBar}%` }}></div>
</div>
</div>
</div>
</div>

<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

<div className="lg:col-span-2 space-y-8">

<div className="bg-white rounded-xl border-t-4 border-error shadow-sm border-x border-b border-border overflow-hidden">
<div className="p-4 border-b border-border flex justify-between items-center">
<h3 className="text-headline-sm font-headline-sm text-error flex items-center gap-2">
<span className="material-symbols-outlined">warning</span>
                                Urgent Action Required
                            </h3>
<button className="text-label-caps text-primary font-bold hover:underline" onClick={() => setShowAllFlags((v) => !v)}>{showAllFlags ? 'Show Less' : `View All${compliance.flagged_students.length > 0 ? ` (${compliance.flagged_students.length})` : ''}`}</button>
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
{flaggedRows.length === 0 && (
<tr>
<td className="px-6 py-4 text-body-sm text-on-surface-variant" colSpan={5}>No urgent actions — no unresolved flags.</td>
</tr>
)}
{flaggedRows.map((flag) => {
    const studentName = flag.placement?.student?.user?.name || 'Unknown Student';
    const companyName = flag.placement?.company?.name || '—';
    const isHigh = (flag.severity || '').toLowerCase() === 'high';
    return (
<tr className="hover:bg-background transition-colors" key={flag.id}>
<td className="px-6 py-4 flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-surface-container text-primary flex items-center justify-center font-bold text-xs">{initialsOf(studentName)}</div>
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
<span className="w-1.5 h-1.5 bg-secondary-container rounded-full"></span> {flag.severity ? flag.severity.charAt(0).toUpperCase() + flag.severity.slice(1) : 'Medium'}
                                            </span>
)}
</td>
<td className="px-6 py-4 text-body-sm text-on-surface-variant">{formatDate(flag.created_at)}</td>
<td className="px-6 py-4">
<button className="text-primary hover:text-primary-hover font-bold text-body-sm" disabled={actionBusy === `flag-${flag.id}`} onClick={() => handleResolveFlag(flag.id)}>{actionBusy === `flag-${flag.id}` ? '...' : 'Resolve'}</button>
</td>
</tr>
    );
})}
</tbody>
</table>
</div>
</div>

<div className="bg-white rounded-xl border border-border shadow-sm p-6" ref={approvalQueueRef}>
<div className="flex justify-between items-center mb-6">
<h3 className="text-headline-sm font-headline-sm">Approval Queue</h3>
<span className="text-label-caps bg-surface-container px-3 py-1 rounded-full font-bold">{pendingTotal} New Applications</span>
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
{/* Local company-initials tile (replaces external googleusercontent logo) */}
<div className="w-12 h-12 rounded bg-surface-container text-primary flex items-center justify-center font-bold text-sm p-1 border border-border">{initialsOf(companyName)}</div>
<div>
<h4 className="text-body-md font-bold">{studentName} — {program}</h4>
<p className="text-body-sm text-on-surface-variant">{companyName} • {periodName}</p>
</div>
</div>
<div className="flex gap-2">
<button className="px-4 py-2 text-primary border border-primary hover:bg-primary-subtle rounded-lg text-body-sm font-bold transition-colors" onClick={() => setExpandedPlacement((cur) => (cur === placement.id ? null : placement.id))}>{isExpanded ? 'Hide' : 'Details'}</button>
<button className="px-4 py-2 border border-error text-error hover:bg-error-container/20 rounded-lg text-body-sm font-bold transition-colors" disabled={actionBusy === placement.id} onClick={() => handleReject(placement.id)}>Reject</button>
<button className="px-4 py-2 bg-primary-container text-white hover:bg-primary-hover rounded-lg text-body-sm font-bold transition-colors" disabled={actionBusy === placement.id} onClick={() => handleApprove(placement.id)}>{actionBusy === placement.id ? '...' : 'Approve'}</button>
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

<div className="space-y-8">

<div className="bg-white p-6 rounded-xl border border-border shadow-sm" ref={industryRef}>
<h3 className="text-headline-sm font-headline-sm mb-6">Industry Distribution</h3>
<div className="relative w-48 h-48 mx-auto mb-8">

<div className="w-full h-full rounded-full" style={{ background: industrySegments.length > 0
    ? `conic-gradient(${(() => {
        let acc = 0;
        return industrySegments.map((s) => {
            const start = acc;
            acc += s.pct;
            return `${s.color} ${start}% ${Math.min(acc, 100)}%`;
        }).join(', ');
    })()})`
    : '#E2E8F0' }}></div>

<div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
<p className="text-headline-sm font-bold">{totalHosts.toLocaleString()}</p>
<p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Total Hosts</p>
</div>
</div>
<div className="space-y-3">
{industrySegments.length === 0 && (
<p className="text-body-sm text-on-surface-variant">No company data available.</p>
)}
{industrySegments.map((seg) => (
<div className="flex items-center justify-between text-body-sm" key={seg.label}>
<div className="flex items-center gap-2">
<span className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }}></span>
<span>{seg.label}</span>
</div>
<span className="font-bold">{seg.pct}%</span>
</div>
))}
</div>
</div>

<div className="bg-white p-6 rounded-xl border border-border shadow-sm">
<h3 className="text-headline-sm font-headline-sm mb-6">Quick Actions</h3>
{quickActionNotice && (
<div className="mb-4 p-3 border border-border rounded-lg bg-surface-container-low flex items-start justify-between gap-2">
<p className="text-body-sm text-on-surface-variant">{quickActionNotice}</p>
<button className="text-on-surface-variant hover:text-primary transition-colors" onClick={() => setQuickActionNotice('')} aria-label="Dismiss">
<span className="material-symbols-outlined text-sm">close</span>
</button>
</div>
)}
<div className="grid grid-cols-2 gap-3">
<button className="flex flex-col items-center justify-center gap-2 p-4 border border-border rounded-lg hover:border-primary hover:text-primary transition-all group" onClick={() => setQuickActionNotice('Adding companies is coming soon — manage host companies via the Super Admin.')}>
<span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">domain_add</span>
<span className="text-label-caps text-center">Add Company</span>
</button>
<button className="flex flex-col items-center justify-center gap-2 p-4 border border-border rounded-lg hover:border-primary hover:text-primary transition-all group" onClick={() => setQuickActionNotice('Supervisor assignment is coming soon — manage supervisors via the Super Admin.')}>
<span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">person_add</span>
<span className="text-label-caps text-center">Assign Supv.</span>
</button>
<button className="flex flex-col items-center justify-center gap-2 p-4 border border-border rounded-lg hover:border-primary hover:text-primary transition-all group" onClick={() => window.open('http://localhost:8000/api/admin/reports/placements?format=csv', '_blank')}>
<span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">download</span>
<span className="text-label-caps text-center">Export Reports</span>
</button>
<button className="flex flex-col items-center justify-center gap-2 p-4 border border-border rounded-lg hover:border-primary hover:text-primary transition-all group" onClick={() => navigate('/messages')}>
<span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">mail</span>
<span className="text-label-caps text-center">Bulk Notify</span>
</button>
</div>
</div>

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
<a className="text-body-sm font-bold text-primary hover:underline flex items-center gap-1" href="#" onClick={(e) => { e.preventDefault(); setShowUpdateDetails((v) => !v); }}>
                            {showUpdateDetails ? 'Show Less' : 'Learn More'} <span className="material-symbols-outlined text-sm">{showUpdateDetails ? 'expand_less' : 'arrow_forward'}</span>
</a>
</div>
</div>
</div>
</div>
</main>


        </div>
    );
}
