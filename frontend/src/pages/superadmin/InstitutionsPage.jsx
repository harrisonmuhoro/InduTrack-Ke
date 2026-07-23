import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../axios';
import { fmt } from './shared';

export default function InstitutionsPage() {
    const { showToast } = useOutletContext();

    // ── Data state ────────────────────────────────────────────────────────────
    const [institutions, setInstitutions] = useState([]); // GET /superadmin/institutions

    // ── UI state ──────────────────────────────────────────────────────────────
    const [showAddInstitution, setShowAddInstitution] = useState(false);
    const [instForm, setInstForm] = useState({ name: '', domain: '', contact_email: '' });
    const [instSaving, setInstSaving] = useState(false);
    const [instError, setInstError] = useState('');
    const [instFilter, setInstFilter] = useState('all'); // 'all' | 'active' | 'inactive'
    const [instSearch, setInstSearch] = useState('');

    // ── Fetch on mount ────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        api.get('/superadmin/institutions')
            .then((res) => { if (!cancelled) setInstitutions(Array.isArray(res.data) ? res.data : []); })
            .catch(() => { if (!cancelled) setInstitutions([]); });

        return () => { cancelled = true; };
    }, []);

    // ── Actions ───────────────────────────────────────────────────────────────
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
    const searchTerm = instSearch.trim().toLowerCase();
    const filteredInstitutions = institutions
        .filter((i) =>
            instFilter === 'all' ? true : instFilter === 'active' ? i.is_active !== false : i.is_active === false
        )
        .filter((i) => {
            if (!searchTerm) return true;
            return [i.name, i.domain, i.contact_email]
                .some((v) => String(v || '').toLowerCase().includes(searchTerm));
        });

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="font-headline-md text-headline-md text-text-main">Institutions</h2>
                    <div className="flex items-center gap-3 mt-1 text-on-surface-variant">
                        <span className="font-label-code text-label-code bg-surface-container-low px-2 py-0.5 rounded border border-border">TOTAL: {fmt(institutions.length)}</span>
                        <span className="text-body-sm font-body-sm">•</span>
                        <span className="text-body-sm font-body-sm">Manage every institution registered on the platform.</span>
                    </div>
                </div>
                <button className="flex items-center gap-2 bg-[#F59E0B] hover:bg-accent-hover text-[#2a1700] px-6 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-95" onClick={() => setShowAddInstitution(true)}>
                    <span className="material-symbols-outlined">add</span>
                    <span className="font-label-caps text-label-caps uppercase tracking-wider">Add Institution</span>
                </button>
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
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
                <div className="px-6 py-3 border-b border-border bg-white">
                    <div className="flex items-center gap-4 bg-surface-container-low px-4 py-2 rounded-full w-full max-w-md">
                        <span className="material-symbols-outlined text-outline">search</span>
                        <input
                            className="bg-transparent border-none focus:ring-0 text-body-sm font-body-sm w-full"
                            placeholder="Search by name, domain or contact email..."
                            type="text"
                            value={instSearch}
                            onChange={(e) => setInstSearch(e.target.value)}
                        />
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
                            {filteredInstitutions.length === 0 && (
                                <tr>
                                    <td className="px-6 py-8 text-body-sm text-outline text-center" colSpan={5}>
                                        {institutions.length === 0 ? 'No institutions registered yet.' : 'No institutions match your search.'}
                                    </td>
                                </tr>
                            )}
                            {filteredInstitutions.map((inst) => (
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
                    <span className="text-outline text-body-sm">Showing {fmt(filteredInstitutions.length)} of {fmt(institutions.length)} institutions</span>
                </div>
            </div>

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
        </>
    );
}
