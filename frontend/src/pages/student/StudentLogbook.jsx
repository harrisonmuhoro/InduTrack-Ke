import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';

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
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
}

function weekDateRange(startDate, weekNumber) {
    if (!startDate) return null;
    const start = new Date(startDate);
    if (isNaN(start)) return null;
    const weekStart = new Date(start.getTime() + (weekNumber - 1) * 7 * 86400000);
    const weekEnd = new Date(weekStart.getTime() + 4 * 86400000);
    const opts = { month: 'long', day: 'numeric' };
    return `${weekStart.toLocaleDateString('en-KE', opts)} – ${weekEnd.toLocaleDateString('en-KE', opts)}, ${weekEnd.getFullYear()}`;
}

export default function StudentLogbook() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [placement, setPlacement] = useState(null);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showWarning, setShowWarning] = useState(true);
    const [openFeedback, setOpenFeedback] = useState(0);
    const [saving, setSaving] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState(null); // { type: 'success' | 'error', text }
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/student/match?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const [form, setForm] = useState({
        activities: '',
        lessons_learned: '',
        challenges: '',
        plan_next_week: '',
    });

    const loadData = () => {
        return Promise.allSettled([
            api.get('/students/placement'),
            api.get('/logbooks'),
        ]).then(([placementRes, logbookRes]) => {
            if (placementRes.status === 'fulfilled') setPlacement(placementRes.value.data || null);
            if (logbookRes.status === 'fulfilled') setEntries(Array.isArray(logbookRes.value.data) ? logbookRes.value.data : []);
            setLoading(false);
        });
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // ── Derived data ────────────────────────────────────────────────────────
    const totalWeeks = placement?.period?.required_weeks || 16;
    const completedWeeks = useMemo(() => new Set(entries.map((e) => e.week_number)), [entries]);
    const maxWeek = entries.length ? Math.max(...entries.map((e) => e.week_number)) : 0;
    const currentWeek = Math.min(maxWeek + 1, totalWeeks);
    const progressPct = totalWeeks > 0 ? Math.min(100, Math.round((completedWeeks.size / totalWeeks) * 100)) : 0;

    const currentEntry = entries.find((e) => e.week_number === currentWeek);

    useEffect(() => {
        if (currentEntry) {
            setForm({
                activities: currentEntry.activities || '',
                lessons_learned: currentEntry.lessons_learned || '',
                challenges: currentEntry.challenges || '',
                plan_next_week: currentEntry.plan_next_week || '',
            });
        }
    }, [currentEntry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const wordCount = useMemo(() => {
        const text = `${form.activities} ${form.lessons_learned} ${form.challenges} ${form.plan_next_week}`.trim();
        return text ? text.split(/\s+/).length : 0;
    }, [form]);

    const filledSections = ['activities', 'lessons_learned', 'challenges', 'plan_next_week'].filter((k) => form[k].trim()).length;
    const completionPct = Math.round((filledSections / 4) * 100);

    const feedbackEntries = useMemo(() => {
        return [...entries]
            .filter((e) => (e.comments || []).length > 0)
            .sort((a, b) => b.week_number - a.week_number)
            .slice(0, 3);
    }, [entries]);

    const companyName = placement?.company?.name || null;
    const dateRange = weekDateRange(placement?.period?.start_date, currentWeek);

    const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const handleSave = async (submitting) => {
        setFeedbackMsg(null);
        if (!placement) {
            setFeedbackMsg({ type: 'error', text: 'You need an active placement before submitting logbook entries.' });
            return;
        }
        if (!form.activities.trim()) {
            setFeedbackMsg({ type: 'error', text: 'Please describe your key activities before saving.' });
            return;
        }
        setSaving(true);
        try {
            if (currentEntry) {
                await api.put(`/logbooks/${currentEntry.id}`, {
                    activities: form.activities,
                    lessons_learned: form.lessons_learned || null,
                    challenges: form.challenges || null,
                    plan_next_week: form.plan_next_week || null,
                });
            } else {
                await api.post('/logbooks', {
                    entry_date: new Date().toISOString().slice(0, 10),
                    week_number: currentWeek,
                    activities: form.activities,
                    lessons_learned: form.lessons_learned || null,
                    challenges: form.challenges || null,
                    plan_next_week: form.plan_next_week || null,
                });
            }
            setFeedbackMsg({
                type: 'success',
                text: submitting
                    ? `Week ${currentWeek} entry submitted successfully. It will lock 72 hours after creation.`
                    : `Week ${currentWeek} draft saved successfully.`,
            });
            await loadData();
        } catch (err) {
            const msg = err.response?.data?.message || 'Something went wrong while saving your entry. Please try again.';
            setFeedbackMsg({ type: 'error', text: msg });
        } finally {
            setSaving(false);
        }
    };

    // Timeline weeks 1..totalWeeks
    const timelineWeeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

    return (
        <div className="flex-1 p-margin-desktop max-w-container-max mx-auto w-full animate-in fade-in duration-300">

<nav className="flex items-center gap-2 text-outline-variant font-label-caps text-label-caps mb-4">
<Link className="hover:text-primary transition-colors" to="/student">My Logbooks</Link>
<span className="material-symbols-outlined text-sm">chevron_right</span>
<span className="text-primary font-bold">Week {currentWeek} Submission</span>
</nav>
<div className="flex justify-between items-end mb-8">
<div>
<h2 className="font-headline-md text-headline-md text-on-surface">Logbook Entry: Week {currentWeek}</h2>
<p className="text-outline flex items-center gap-2 mt-1">
<span className="material-symbols-outlined text-sm">calendar_today</span>
                        {dateRange || 'Current attachment week'}
                    </p>
</div>
<div className="flex gap-4">
<button className="px-6 py-2.5 border border-outline text-outline font-bold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-2" disabled={saving} onClick={() => handleSave(false)} type="button">
<span className="material-symbols-outlined text-sm">save</span>
                        {saving ? 'Saving...' : 'Save Draft'}
                    </button>
<button className="px-6 py-2.5 bg-[#F59E0B] text-white font-bold rounded-lg hover:bg-accent-dark transition-all transform hover:scale-[1.02] shadow-lg flex items-center gap-2" disabled={saving} onClick={() => handleSave(true)} type="button">
<span className="material-symbols-outlined text-sm">send</span>
                        {saving ? 'Submitting...' : 'Submit Entry'}
                    </button>
</div>
</div>

{feedbackMsg && (
<div className={`mb-8 p-4 rounded-r-xl flex items-start gap-4 border-l-4 ${feedbackMsg.type === 'success' ? 'bg-primary-subtle border-primary' : 'bg-error-container/20 border-error'}`}>
<span className={`material-symbols-outlined ${feedbackMsg.type === 'success' ? 'text-primary' : 'text-error'}`}>{feedbackMsg.type === 'success' ? 'check_circle' : 'error'}</span>
<div className="flex-1">
<p className={`text-body-sm font-bold ${feedbackMsg.type === 'success' ? 'text-primary' : 'text-error'}`}>{feedbackMsg.text}</p>
</div>
<button className={`p-1 rounded-full ${feedbackMsg.type === 'success' ? 'text-primary hover:bg-primary-subtle' : 'text-error hover:bg-error-container/30'}`} onClick={() => setFeedbackMsg(null)} type="button">
<span className="material-symbols-outlined">close</span>
</button>
</div>
)}

{showWarning && (
<div className="mb-8 p-4 bg-amber-50 border-l-4 border-[#F59E0B] rounded-r-xl flex items-start gap-4">
<span className="material-symbols-outlined text-[#F59E0B]">warning</span>
<div className="flex-1">
<h4 className="font-bold text-on-secondary-container text-body-md">Submission Lock Warning</h4>
<p className="text-on-secondary-container/80 text-body-sm mt-1">Once submitted, this entry will be locked for editing after 72 hours. Please ensure all activities are accurately recorded before final submission.</p>
</div>
<button className="text-[#F59E0B] hover:bg-amber-100 p-1 rounded-full" onClick={() => setShowWarning(false)} type="button">
<span className="material-symbols-outlined">close</span>
</button>
</div>
)}

<div className="grid grid-cols-12 gap-gutter">

<div className="col-span-8 flex flex-col gap-gutter">

<div className="bg-surface rounded-xl border border-border p-6">
<h4 className="text-label-caps font-label-caps text-outline mb-6">Attachment Progress Timeline</h4>
<div className="flex items-center justify-between relative">

<div className="absolute h-0.5 w-full bg-border top-4 left-0 -z-0"></div>
<div className="absolute h-0.5 bg-primary top-4 left-0 -z-0" style={{ width: `${progressPct}%` }}></div>

<div className="flex w-full justify-between overflow-x-auto pb-2 scrollbar-hide">

{timelineWeeks.map((week) => {
    if (completedWeeks.has(week)) {
        return (
<div className="relative z-10 flex flex-col items-center gap-2" key={week}>
<div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm ring-4 ring-background"><span className="material-symbols-outlined text-sm">check</span></div>
<span className="text-[10px] font-bold text-primary">W{week}</span>
</div>
        );
    }
    if (week === currentWeek) {
        return (
<div className="relative z-10 flex flex-col items-center gap-2" key={week}>
<div className="w-8 h-8 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-sm ring-4 ring-background pulse-amber">
<span className="material-symbols-outlined text-sm">edit_note</span>
</div>
<span className="text-[10px] font-bold text-[#F59E0B]">W{week}</span>
</div>
        );
    }
    return (
<div className="relative z-10 flex flex-col items-center gap-2" key={week}>
<div className="w-8 h-8 rounded-full bg-border text-outline-variant flex items-center justify-center text-sm ring-4 ring-background">{week}</div>
<span className="text-[10px] font-bold text-outline-variant">W{week}</span>
</div>
    );
})}
</div>
</div>
</div>

<div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
<div className="bg-[#064D37] px-6 py-4 flex items-center justify-between">
<h3 className="text-white font-headline-sm flex items-center gap-3">
<span className="material-symbols-outlined">description</span>
                                Weekly Log Submission
                            </h3>
<span className="px-3 py-1 bg-primary-hover/30 text-primary-fixed rounded-full text-[10px] font-bold uppercase tracking-wider border border-primary-fixed/20">{currentEntry ? (currentEntry.status || 'Draft') + ' Mode' : 'Draft Mode'}</span>
</div>
<div className="p-8 space-y-8">
<div className="space-y-2">
<label className="block font-bold text-on-surface text-body-md">1. Key Activities &amp; Tasks Completed</label>
<p className="text-body-sm text-outline mb-2">Detailed description of technical tasks and responsibilities.</p>
<textarea className="w-full rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary-subtle transition-all resize-none placeholder:text-outline-variant" onChange={setField('activities')} placeholder="e.g., Configured OSPF routing on corporate core switches..." rows="4" value={form.activities}></textarea>
</div>
<div className="space-y-2">
<label className="block font-bold text-on-surface text-body-md">2. Key Lessons Learned</label>
<p className="text-body-sm text-outline mb-2">New skills, technical concepts, or soft skills acquired.</p>
<textarea className="w-full rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary-subtle transition-all resize-none placeholder:text-outline-variant" onChange={setField('lessons_learned')} placeholder="e.g., Understanding the impact of latency on real-time traffic..." rows="4" value={form.lessons_learned}></textarea>
</div>
<div className="space-y-2">
<label className="block font-bold text-on-surface text-body-md">3. Challenges Faced &amp; Solutions</label>
<p className="text-body-sm text-outline mb-2">What hindered progress and how did you resolve it?</p>
<textarea className="w-full rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary-subtle transition-all resize-none placeholder:text-outline-variant" onChange={setField('challenges')} placeholder="e.g., Encountered a firmware mismatch, resolved by..." rows="4" value={form.challenges}></textarea>
</div>
<div className="space-y-2">
<label className="block font-bold text-on-surface text-body-md">4. Planned Activities for Next Week</label>
<p className="text-body-sm text-outline mb-2">Set clear objectives for the upcoming week.</p>
<textarea className="w-full rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary-subtle transition-all resize-none placeholder:text-outline-variant" onChange={setField('plan_next_week')} placeholder="e.g., Initiating the cloud migration pilot for HR department..." rows="4" value={form.plan_next_week}></textarea>
</div>
</div>
</div>
</div>

<div className="col-span-4 flex flex-col gap-gutter">

<div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
<h4 className="text-label-caps font-label-caps text-outline mb-4">Submission Context</h4>
<div className="space-y-5">
<div className="flex justify-between items-center">
<span className="text-body-sm text-outline">Submission Period</span>
<span className="px-3 py-1 bg-amber-50 text-[#F59E0B] font-bold text-[11px] rounded-lg border border-amber-200">WEEK {currentWeek}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-body-sm text-outline">Partner Company</span>
<div className="flex items-center gap-2">
<span className="w-5 h-5 rounded-full bg-primary-subtle text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[12px]">corporate_fare</span></span>
<span className="font-bold text-body-sm">{companyName || (loading ? '...' : 'No placement')}</span>
</div>
</div>
<div className="flex justify-between items-center">
<span className="text-body-sm text-outline">Current Word Count</span>
<span className="font-label-code text-label-code text-primary bg-primary-subtle px-2 py-0.5 rounded" id="word-count">{wordCount} words</span>
</div>
<div className="pt-4 border-t border-border">
<div className="flex justify-between text-body-sm mb-2">
<span className="text-outline">Completion Grade (Est)</span>
<span className="font-bold text-primary">{completionPct}%</span>
</div>
<div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
<div className="bg-primary h-full rounded-full" style={{ width: `${completionPct}%` }}></div>
</div>
</div>
</div>
</div>

<div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
<div className="p-6 border-b border-border">
<h4 className="text-label-caps font-label-caps text-outline">Previous Supervisor Feedback</h4>
</div>
<div className="divide-y divide-border">
{feedbackEntries.length === 0 && (
<div className="p-4">
<p className="text-body-sm text-on-surface-variant">{loading ? 'Loading feedback...' : 'No supervisor feedback yet. Comments left on your entries will appear here.'}</p>
</div>
)}
{feedbackEntries.map((entry, idx) => {
    const isOpen = openFeedback === idx;
    const comment = entry.comments[entry.comments.length - 1];
    return (
<div className={isOpen ? 'p-4 bg-primary-subtle/30' : 'p-4 hover:bg-surface-container-low transition-colors cursor-pointer'} key={entry.id}>
<button className={`w-full flex items-center justify-between text-left ${isOpen ? 'mb-3' : ''}`} onClick={() => setOpenFeedback(isOpen ? -1 : idx)} type="button">
<div>
<p className={`font-bold text-body-sm ${isOpen ? 'text-primary' : 'text-on-surface'}`}>Week {entry.week_number}: {(entry.activities || 'Logbook Entry').slice(0, 40)}</p>
<p className={`text-[10px] uppercase font-bold ${isOpen ? 'text-outline' : 'text-outline-variant'}`}>Reviewed by {comment?.user?.name || 'Supervisor'}</p>
</div>
<span className={`material-symbols-outlined transition-transform ${isOpen ? 'text-primary rotate-180' : 'text-outline-variant'}`}>expand_more</span>
</button>
{isOpen && (
<>
<div className="text-body-sm text-on-surface-variant italic border-l-2 border-primary pl-3 py-1">
                                    "{comment?.comment || 'No comment text.'}"
                                </div>
<div className="mt-3 flex items-center gap-2">
<span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">{(entry.status || 'reviewed').toUpperCase()}</span>
<span className="text-[10px] text-outline">Published {timeAgo(comment?.created_at)}</span>
</div>
</>
)}
</div>
    );
})}
</div>
</div>

<div className="bg-primary-container rounded-xl p-6 text-white relative overflow-hidden group">
<div className="relative z-10">
<h4 className="font-bold text-headline-sm mb-2">Need Help?</h4>
<p className="text-on-primary-container text-body-sm mb-4">Unsure about technical terms or logbook requirements? Chat with our academic mentor.</p>
<button className="px-4 py-2 bg-white text-primary font-bold rounded-lg text-body-sm hover:shadow-lg transition-all" onClick={() => navigate('/messages')} type="button">Start Chat</button>
</div>
<span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] text-white/10 group-hover:scale-110 transition-transform">forum</span>
</div>
</div>
</div>
</div>
    );
}
