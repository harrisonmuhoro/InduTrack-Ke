import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';
import { initialsOf, fmt } from './shared';

// ── Role display config ───────────────────────────────────────────────────────
const ROLE_OPTIONS = [
    'student',
    'company_supervisor',
    'institution_supervisor',
    'institution_admin',
    'super_admin',
];

const ROLE_LABELS = {
    student: 'Student',
    company_supervisor: 'Company Supervisor',
    institution_supervisor: 'Institution Supervisor',
    institution_admin: 'Institution Admin',
    super_admin: 'Super Admin',
};

const ROLE_PILL_CLASSES = {
    student: 'text-[#92400E] bg-[#FEF3C7]',
    company_supervisor: 'text-secondary bg-surface-container',
    institution_supervisor: 'text-tertiary bg-tertiary-fixed',
    institution_admin: 'text-primary bg-primary-subtle',
    super_admin: 'text-error bg-error-container',
};

function roleOf(u) {
    return u?.roles?.[0]?.name || '';
}

function roleLabel(name) {
    return ROLE_LABELS[name] || (name ? name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'No Role');
}

export default function UsersPage() {
    const { showToast } = useOutletContext();
    const { user: authUser } = useAuth();

    // ── Data state ────────────────────────────────────────────────────────────
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(true);

    // ── UI state ──────────────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [showAddUser, setShowAddUser] = useState(false);
    const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'student' });
    const [userSaving, setUserSaving] = useState(false);
    const [userError, setUserError] = useState('');
    const [changingRoleId, setChangingRoleId] = useState(null);

    // ── Fetch users (paginated) ───────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        api.get('/superadmin/users', { params: { page } })
            .then((res) => {
                if (cancelled) return;
                const rows = Array.isArray(res.data?.data) ? res.data.data : [];
                setUsers(rows);
                setTotal(res.data?.total ?? rows.length);
                setLastPage(res.data?.last_page ?? 1);
            })
            .catch(() => {
                if (!cancelled) { setUsers([]); setTotal(0); setLastPage(1); }
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [page]);

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleChangeRole = async (u, newRole) => {
        if (!newRole || newRole === roleOf(u)) return;
        setChangingRoleId(u.id);
        try {
            const res = await api.put(`/superadmin/users/${u.id}/role`, { role: newRole });
            setUsers((prev) => prev.map((row) => (row.id === u.id ? { ...row, roles: [{ name: newRole }] } : row)));
            showToast('Role updated', res.data?.message || `${u.name} is now ${roleLabel(newRole)}.`);
        } catch (err) {
            showToast('Update failed', err.response?.data?.message || 'Could not change user role.');
        } finally {
            setChangingRoleId(null);
        }
    };

    const handleDisableUser = async (u) => {
        if (!window.confirm(`Disable ${u.name}? All of their active sessions will be revoked.`)) return;
        try {
            const res = await api.delete(`/superadmin/users/${u.id}`);
            setUsers((prev) => prev.filter((row) => row.id !== u.id));
            setTotal((t) => Math.max(0, t - 1));
            showToast('User disabled', res.data?.message || `${u.name} has been disabled.`);
        } catch (err) {
            showToast('Action failed', err.response?.data?.message || 'Could not disable user.');
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password) return;
        setUserSaving(true);
        setUserError('');
        try {
            const payload = {
                name: userForm.name.trim(),
                email: userForm.email.trim(),
                password: userForm.password,
                role: userForm.role,
            };
            const res = await api.post('/superadmin/users', payload);
            const created = { ...res.data, roles: [{ name: userForm.role }] };
            setUsers((prev) => [created, ...prev]);
            setTotal((t) => t + 1);
            setShowAddUser(false);
            setUserForm({ name: '', email: '', password: '', role: 'student' });
            showToast('User added', `${created.name || 'User'} has been created as ${roleLabel(userForm.role)}.`);
        } catch (err) {
            setUserError(err.response?.data?.message || 'Failed to add user. Check the details and try again.');
        } finally {
            setUserSaving(false);
        }
    };

    // ── Derived values ────────────────────────────────────────────────────────
    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();
        return users.filter((u) => {
            if (roleFilter !== 'all' && roleOf(u) !== roleFilter) return false;
            if (!q) return true;
            return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
        });
    }, [users, search, roleFilter]);

    return (
        <div className="space-y-gutter">

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="font-headline-md text-headline-md text-text-main">User Management</h2>
                    <div className="flex items-center gap-3 mt-1 text-on-surface-variant">
                        <span className="font-label-code text-label-code bg-surface-container-low px-2 py-0.5 rounded border border-border">TOTAL USERS: {fmt(total)}</span>
                        <span className="text-body-sm font-body-sm">•</span>
                        <span className="text-body-sm font-body-sm">{loading ? 'Loading users...' : `Page ${fmt(page)} of ${fmt(lastPage)}`}</span>
                    </div>
                </div>
                <button className="flex items-center gap-2 bg-[#F59E0B] hover:bg-accent-hover text-[#2a1700] px-6 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-95" onClick={() => setShowAddUser(true)}>
                    <span className="material-symbols-outlined">person_add</span>
                    <span className="font-label-caps text-label-caps uppercase tracking-wider">Add User</span>
                </button>
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                    <h4 className="font-headline-sm text-headline-sm">All Users</h4>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full w-full sm:w-64">
                            <span className="material-symbols-outlined text-outline">search</span>
                            <input
                                className="bg-transparent border-none focus:ring-0 text-body-sm font-body-sm w-full"
                                placeholder="Search name or email..."
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="border border-border rounded-lg px-3 py-2 text-body-sm bg-surface-container-low focus:ring-primary focus:border-primary"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="all">All Roles</option>
                            {ROLE_OPTIONS.map((r) => (
                                <option key={r} value={r}>{roleLabel(r)}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-background">
                            <tr>
                                <th className="px-6 py-4 font-label-caps text-label-caps text-outline uppercase">User</th>
                                <th className="px-6 py-4 font-label-caps text-label-caps text-outline uppercase">Email</th>
                                <th className="px-6 py-4 font-label-caps text-label-caps text-outline uppercase">Role</th>
                                <th className="px-6 py-4 font-label-caps text-label-caps text-outline uppercase">Joined</th>
                                <th className="px-6 py-4 font-label-caps text-label-caps text-outline uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {!loading && filteredUsers.length === 0 && (
                                <tr>
                                    <td className="px-6 py-8 text-body-sm text-outline text-center" colSpan={5}>
                                        {users.length === 0 ? 'No users found.' : 'No users match your search or filter.'}
                                    </td>
                                </tr>
                            )}
                            {loading && (
                                <tr>
                                    <td className="px-6 py-8 text-body-sm text-outline text-center" colSpan={5}>Loading users...</td>
                                </tr>
                            )}
                            {!loading && filteredUsers.map((u) => {
                                const role = roleOf(u);
                                const isSelf = authUser?.id === u.id;
                                return (
                                    <tr className="hover:bg-background transition-colors group" key={u.id}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full border-2 border-primary bg-primary-container text-on-primary flex items-center justify-center font-bold text-body-sm">
                                                    {initialsOf(u.name)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-body-sm font-bold">{u.name}{isSelf && <span className="ml-2 text-[10px] text-outline font-label-caps uppercase tracking-widest">(You)</span>}</span>
                                                    <span className="text-[11px] font-label-code text-outline uppercase tracking-tight">ID: {u.id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-body-sm">{u.email || '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full w-fit uppercase ${ROLE_PILL_CLASSES[role] || 'text-on-surface-variant bg-surface-container-high'}`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                {roleLabel(role)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-body-sm">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                                        <td className="px-6 py-4">
                                            {isSelf ? (
                                                <span className="text-[11px] text-outline font-label-caps uppercase">—</span>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        className="border border-border rounded-lg px-2 py-1 text-[12px] bg-surface-container-low focus:ring-primary focus:border-primary disabled:opacity-60"
                                                        disabled={changingRoleId === u.id}
                                                        title="Change role"
                                                        value={role}
                                                        onChange={(e) => handleChangeRole(u, e.target.value)}
                                                    >
                                                        {!role && <option value="">No Role</option>}
                                                        {ROLE_OPTIONS.map((r) => (
                                                            <option key={r} value={r}>{roleLabel(r)}</option>
                                                        ))}
                                                    </select>
                                                    <button className="text-outline hover:text-error transition-colors" onClick={() => handleDisableUser(u)} title="Disable user (revokes all sessions)">
                                                        <span className="material-symbols-outlined">person_off</span>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-background border-t border-border flex items-center justify-between">
                    <button
                        className="flex items-center gap-1 text-primary font-bold text-body-sm hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                        disabled={page <= 1 || loading}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        Previous
                    </button>
                    <span className="text-body-sm text-outline">Page {fmt(page)} of {fmt(lastPage)}</span>
                    <button
                        className="flex items-center gap-1 text-primary font-bold text-body-sm hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                        disabled={page >= lastPage || loading}
                        onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                    >
                        Next
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                </div>
            </div>

            {showAddUser && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
                    <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-headline-sm text-headline-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">person_add</span>
                                Add User
                            </h4>
                            <button className="text-outline hover:text-primary transition-colors" onClick={() => setShowAddUser(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleAddUser}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block font-label-caps text-label-caps text-outline uppercase mb-1">Full Name</label>
                                    <input
                                        className="w-full border border-border rounded-lg p-3 text-body-sm focus:ring-primary focus:border-primary bg-surface-container-low"
                                        placeholder="e.g. Jane Wanjiku"
                                        required
                                        type="text"
                                        value={userForm.name}
                                        onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block font-label-caps text-label-caps text-outline uppercase mb-1">Email</label>
                                    <input
                                        className="w-full border border-border rounded-lg p-3 text-body-sm focus:ring-primary focus:border-primary bg-surface-container-low"
                                        placeholder="e.g. jane.wanjiku@uonbi.ac.ke"
                                        required
                                        type="email"
                                        value={userForm.email}
                                        onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block font-label-caps text-label-caps text-outline uppercase mb-1">Password</label>
                                    <input
                                        className="w-full border border-border rounded-lg p-3 text-body-sm focus:ring-primary focus:border-primary bg-surface-container-low"
                                        minLength={8}
                                        placeholder="Minimum 8 characters"
                                        required
                                        type="password"
                                        value={userForm.password}
                                        onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block font-label-caps text-label-caps text-outline uppercase mb-1">Role</label>
                                    <select
                                        className="w-full border border-border rounded-lg p-3 text-body-sm focus:ring-primary focus:border-primary bg-surface-container-low"
                                        required
                                        value={userForm.role}
                                        onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}
                                    >
                                        {ROLE_OPTIONS.map((r) => (
                                            <option key={r} value={r}>{roleLabel(r)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {userError && <p className="text-error text-body-sm mt-2">{userError}</p>}
                            <div className="flex justify-end gap-3 mt-4">
                                <button className="px-4 py-2 border border-border rounded-lg text-body-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors" onClick={() => setShowAddUser(false)} type="button">Cancel</button>
                                <button className="flex items-center gap-2 bg-[#F59E0B] hover:bg-accent-hover text-[#2a1700] px-5 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95 disabled:opacity-60" disabled={userSaving || !userForm.name.trim() || !userForm.email.trim() || !userForm.password} type="submit">
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    {userSaving ? 'Saving...' : 'Add User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
