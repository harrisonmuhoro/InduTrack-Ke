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

const COMPANY_APP_LINKS = [
    { to: '/company', icon: 'dashboard', label: 'Dashboard' },
    { to: '/company/applicants', icon: 'group', label: 'Applicants' },
    { to: '/company/evaluate', icon: 'grade', label: 'Evaluations' },
    { to: '/messages', icon: 'mail', label: 'Messages' },
    { to: '/profile', icon: 'person', label: 'Profile' },
];

export default function CompanyLayout() {
    const { user, context, logout } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="font-body-md text-body-md overflow-x-hidden min-h-screen bg-[var(--color-bg)]">
            <aside className="fixed left-0 top-0 h-screen w-sidebar-width bg-[#064D37] flex flex-col py-gutter shadow-sm z-50 overflow-y-auto">
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
                    <NavLink
                        to="/company"
                        end
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-on-primary border-l-4 border-[#F59E0B] translate-x-1 shadow-sm'
                                : 'text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined">dashboard</span>
                        <span className="font-label-caps text-label-caps">Dashboard</span>
                    </NavLink>
                    
                    <NavLink
                        to="/company/applicants"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-on-primary border-l-4 border-[#F59E0B] translate-x-1 shadow-sm'
                                : 'text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined">handshake</span>
                        <span className="font-label-caps text-label-caps">Applicants</span>
                    </NavLink>

                    <NavLink
                        to="/company/evaluate"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-on-primary border-l-4 border-[#F59E0B] translate-x-1 shadow-sm'
                                : 'text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined">menu_book</span>
                        <span className="font-label-caps text-label-caps">Evaluations</span>
                    </NavLink>

                    <NavLink
                        to="/messages"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-on-primary border-l-4 border-[#F59E0B] translate-x-1 shadow-sm'
                                : 'text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined">location_on</span>
                        <span className="font-label-caps text-label-caps">Messages</span>
                    </NavLink>

                    <NavLink
                        to="/profile"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-on-primary border-l-4 border-[#F59E0B] translate-x-1 shadow-sm'
                                : 'text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined">settings</span>
                        <span className="font-label-caps text-label-caps">Settings</span>
                    </NavLink>
                </nav>

                <div className="px-2 mt-auto pt-6 border-t border-surface/10 flex flex-col gap-1">
                    <NavLink
                        to="/profile"
                        className="flex items-center gap-3 text-surface-variant/80 hover:text-surface px-4 py-3 sidebar-item-transition hover:bg-primary-hover/20 rounded-lg"
                    >
                        <span className="material-symbols-outlined">help</span>
                        <span className="font-label-caps text-label-caps">Help Center</span>
                    </NavLink>
                    <button className="flex items-center gap-3 text-surface-variant/80 hover:text-surface px-4 py-3 sidebar-item-transition hover:bg-primary-hover/20 rounded-lg text-left w-full" onClick={handleLogout} type="button">
                        <span className="material-symbols-outlined">logout</span>
                        <span className="font-label-caps text-label-caps">Logout</span>
                    </button>
                </div>
            </aside>

            <main className="ml-sidebar-width min-h-screen flex flex-col">
                <header className="sticky top-0 bg-surface h-16 flex justify-between items-center px-margin-desktop z-40 border-b border-border">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-outline">
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            </span>
                            <input 
                                className="pl-10 pr-4 py-2 bg-surface-container-low border border-border rounded-lg text-body-sm focus:ring-2 focus:ring-primary-subtle focus:border-primary outline-none w-64 transition-all" 
                                placeholder="Search..." 
                                type="text" 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <NotificationBell buttonClassName="relative p-2 text-on-surface-variant hover:text-primary transition-colors"/>
                            <AppsMenu buttonClassName="p-2 text-on-surface-variant hover:text-primary transition-colors" links={COMPANY_APP_LINKS} />
                        </div>
                        <div className="h-8 w-px bg-border"></div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="font-body-md font-bold text-on-surface">{user?.name || 'Supervisor'}</p>
                                <p className="text-[10px] font-label-caps text-on-surface-variant">{context || 'Industry Supervisor'}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-primary-subtle overflow-hidden">
                                {user?.profile_photo_url ? (
                                    <img src={user.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-primary-subtle text-primary flex items-center justify-center font-bold">{initials(user?.name)}</div>
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
