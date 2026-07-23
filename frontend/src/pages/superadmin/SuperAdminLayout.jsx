import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../../components/NotificationBell';
import { initialsOf, useToast, Toast } from './shared';

const navLinkClass = ({ isActive }) =>
    isActive
        ? 'flex items-center gap-3 bg-primary-container text-on-primary border-l-4 border-[#F59E0B] px-4 py-3 relative group transition-transform duration-200 translate-x-1'
        : 'flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 px-4 py-3 transition-colors duration-200';

export default function SuperAdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { toast, showToast, hideToast } = useToast();

    const [showBroadcast, setShowBroadcast] = useState(false);
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [broadcastSending, setBroadcastSending] = useState(false);
    const [broadcastError, setBroadcastError] = useState('');

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

    return (
        <div className="font-body-md text-body-md overflow-x-hidden min-h-screen bg-[var(--color-bg)]">

            <aside className="fixed left-0 top-0 h-screen w-sidebar-width bg-[#064D37] flex flex-col py-gutter z-50 shadow-sm overflow-y-auto">
                <div className="px-6 mb-10">
                    <h1 className="text-surface font-headline-md text-headline-md font-bold tracking-tight">InduTrack KE</h1>
                    <p className="text-surface-variant/70 text-label-caps font-label-caps uppercase mt-1">Super Admin Portal</p>
                </div>
                <nav className="flex-1 space-y-1">
                    <NavLink className={navLinkClass} end to="/superadmin">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
                        <span className="font-label-caps text-label-caps">Dashboard</span>
                    </NavLink>
                    <NavLink className={navLinkClass} to="/superadmin/institutions">
                        <span className="material-symbols-outlined">domain</span>
                        <span className="font-label-caps text-label-caps">Institutions</span>
                    </NavLink>
                    <NavLink className={navLinkClass} to="/superadmin/users">
                        <span className="material-symbols-outlined">group</span>
                        <span className="font-label-caps text-label-caps">Users</span>
                    </NavLink>
                    <NavLink className={navLinkClass} to="/superadmin/audit-logs">
                        <span className="material-symbols-outlined">history_edu</span>
                        <span className="font-label-caps text-label-caps">Audit Logs</span>
                    </NavLink>
                    <NavLink className={navLinkClass} to="/superadmin/system">
                        <span className="material-symbols-outlined">dns</span>
                        <span className="font-label-caps text-label-caps">System Health</span>
                    </NavLink>
                    <NavLink className={navLinkClass} to="/messages">
                        <span className="material-symbols-outlined">chat</span>
                        <span className="font-label-caps text-label-caps">Messages</span>
                    </NavLink>
                    <NavLink className={navLinkClass} to="/profile">
                        <span className="material-symbols-outlined">settings</span>
                        <span className="font-label-caps text-label-caps">Settings</span>
                    </NavLink>
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
                        <input className="bg-transparent border-none focus:ring-0 text-body-sm font-body-sm w-full" placeholder="Search system records, student IDs..." type="text" />
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
                            <div className="w-10 h-10 rounded-full border-2 border-primary bg-primary-container text-on-primary flex items-center justify-center font-bold text-body-sm overflow-hidden">
                                {user?.profile_photo_url ? (
                                    <img src={user.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    initialsOf(user?.name || 'Super Admin')
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="px-margin-desktop mt-8 space-y-gutter max-w-container-max mx-auto">
                    <Outlet context={{ showToast, openBroadcast: () => setShowBroadcast(true) }} />
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

            <Toast toast={toast} onClose={hideToast} />
        </div>
    );
}
