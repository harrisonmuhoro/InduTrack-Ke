import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../../components/NotificationBell';
import AppsMenu from '../../components/AppsMenu';

function initials(name = '') {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('') || '?';
}

const SUPERVISOR_APP_LINKS = [
    { to: '/supervisor', icon: 'dashboard', label: 'Dashboard' },
    { to: '/supervisor/visits', icon: 'tour', label: 'Field Visits' },
    { to: '/messages', icon: 'mail', label: 'Messages' },
    { to: '/profile', icon: 'person', label: 'Profile' },
];

export default function SupervisorLayout() {
    const { user, context, logout } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="font-body-md text-body-md overflow-x-hidden min-h-screen bg-[var(--color-bg)]">
            <aside className="fixed left-0 top-0 h-screen w-sidebar-width bg-[#064D37] flex flex-col py-6 shadow-sm z-50 overflow-y-auto">
                <div className="px-6 mb-8">
                    <h1 className="text-white font-headline-md text-headline-md font-bold tracking-tight">InduTrack KE</h1>
                    <p className="text-primary-fixed text-label-caps font-label-caps mt-1">Institutional Portal</p>
                </div>
                <nav className="flex-1 px-2 space-y-1">
                    <NavLink
                        to="/supervisor"
                        end
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-white translate-x-1 sidebar-active-indicator-wrapper'
                                : 'text-white/70 hover:text-white hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined">dashboard</span>
                        <span className="font-label-caps text-label-caps">Dashboard</span>
                    </NavLink>

                    <NavLink
                        to="/supervisor/visits"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-white translate-x-1 sidebar-active-indicator-wrapper'
                                : 'text-white/70 hover:text-white hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined">location_on</span>
                        <span className="font-label-caps text-label-caps">Field Visits</span>
                    </NavLink>

                    <NavLink
                        to="/messages"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-white translate-x-1 sidebar-active-indicator-wrapper'
                                : 'text-white/70 hover:text-white hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined">menu_book</span>
                        <span className="font-label-caps text-label-caps">Messages</span>
                    </NavLink>

                    <NavLink
                        to="/profile"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-white translate-x-1 sidebar-active-indicator-wrapper'
                                : 'text-white/70 hover:text-white hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined">settings</span>
                        <span className="font-label-caps text-label-caps">Settings</span>
                    </NavLink>
                </nav>
                <div className="px-6 mb-4">
                    <button className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all" onClick={() => navigate('/supervisor/visits')} type="button">
                        <span className="material-symbols-outlined">add</span>
                        <span className="font-label-caps text-label-caps">New Field Visit</span>
                    </button>
                </div>
                <div className="px-2 pt-4 border-t border-white/10">
                    <NavLink
                        to="/profile"
                        className="flex items-center gap-3 text-white/70 hover:text-white px-4 py-3"
                    >
                        <span className="material-symbols-outlined">help</span>
                        <span className="font-label-caps text-label-caps">Help Center</span>
                    </NavLink>
                    <button className="flex items-center gap-3 text-white/70 hover:text-white px-4 py-3 text-left w-full" onClick={handleLogout} type="button">
                        <span className="material-symbols-outlined">logout</span>
                        <span className="font-label-caps text-label-caps">Logout</span>
                    </button>
                </div>
            </aside>

            <main className="ml-sidebar-width min-h-screen flex flex-col">
                <header className="sticky top-0 z-40 bg-surface border-b border-border h-16 flex items-center justify-between px-margin-desktop">
                    <div className="flex items-center flex-1 max-w-xl">
                        <div className="relative w-full">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                            <input 
                                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-body-md focus:ring-2 focus:ring-primary-subtle focus:border-primary outline-none transition-all" 
                                placeholder="Search students, companies, or logs..." 
                                type="text" 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <NotificationBell buttonClassName="text-on-surface-variant hover:text-primary relative transition-colors"/>
                        <AppsMenu buttonClassName="text-on-surface-variant hover:text-primary transition-colors" links={SUPERVISOR_APP_LINKS} />
                        <div className="h-8 w-px bg-border"></div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="font-body-md font-bold text-on-surface">{user?.name || 'Supervisor'}</p>
                                <p className="text-[10px] font-label-caps text-on-surface-variant">{context || 'Academic Supervisor'}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-primary-subtle overflow-hidden bg-primary-subtle text-primary flex items-center justify-center font-bold">
                                {user?.profile_photo_url ? (
                                    <img src={user.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    initials(user?.name)
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <Outlet />
            </main>
        </div>
    );
}
