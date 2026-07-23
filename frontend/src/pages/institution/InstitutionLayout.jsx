import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../../components/NotificationBell';
import AppsMenu from '../../components/AppsMenu';

function initialsOf(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('');
}

export default function InstitutionLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const userName = user?.name || 'Institution Admin';

    const handleLogout = async (e) => {
        e.preventDefault();
        await logout();
        navigate('/login');
    };

    return (
        <div className="font-body-md text-body-md overflow-x-hidden min-h-screen bg-[var(--color-bg)]">
            <aside className="fixed left-0 top-0 h-screen w-sidebar-width bg-[#064D37] shadow-sm z-50 flex flex-col py-gutter">
                <div className="px-6 mb-8">
                    <h1 className="text-headline-md font-headline-md font-bold text-surface">InduTrack KE</h1>
                    <p className="text-label-caps font-label-caps text-surface/60 mt-1">Institutional Portal</p>
                </div>
                <nav className="flex-1 space-y-1">
                    <NavLink
                        end
                        to="/institution"
                        className={({ isActive }) =>
                            isActive
                                ? 'flex items-center gap-3 bg-primary-container text-on-primary border-l-4 border-[#F59E0B] px-4 py-3 translate-x-1 transition-transform'
                                : 'flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 transition-colors duration-200 px-4 py-3'
                        }
                    >
                        <span className="material-symbols-outlined">dashboard</span>
                        <span className="text-label-caps font-label-caps">Dashboard</span>
                    </NavLink>
                    <NavLink
                        to="/institution/students"
                        className={({ isActive }) =>
                            isActive
                                ? 'flex items-center gap-3 bg-primary-container text-on-primary border-l-4 border-[#F59E0B] px-4 py-3 translate-x-1 transition-transform'
                                : 'flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 transition-colors duration-200 px-4 py-3'
                        }
                    >
                        <span className="material-symbols-outlined">domain</span>
                        <span className="text-label-caps font-label-caps">Students/Cohorts</span>
                    </NavLink>
                    <NavLink
                        to="/institution/partners"
                        className={({ isActive }) =>
                            isActive
                                ? 'flex items-center gap-3 bg-primary-container text-on-primary border-l-4 border-[#F59E0B] px-4 py-3 translate-x-1 transition-transform'
                                : 'flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 transition-colors duration-200 px-4 py-3'
                        }
                    >
                        <span className="material-symbols-outlined">handshake</span>
                        <span className="text-label-caps font-label-caps">Industry Partners</span>
                    </NavLink>
                    <NavLink
                        to="/institution/logbooks"
                        className={({ isActive }) =>
                            isActive
                                ? 'flex items-center gap-3 bg-primary-container text-on-primary border-l-4 border-[#F59E0B] px-4 py-3 translate-x-1 transition-transform'
                                : 'flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 transition-colors duration-200 px-4 py-3'
                        }
                    >
                        <span className="material-symbols-outlined">menu_book</span>
                        <span className="text-label-caps font-label-caps">Student Logbooks</span>
                    </NavLink>
                    <NavLink
                        to="/institution/placements"
                        className={({ isActive }) =>
                            isActive
                                ? 'flex items-center gap-3 bg-primary-container text-on-primary border-l-4 border-[#F59E0B] px-4 py-3 translate-x-1 transition-transform'
                                : 'flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 transition-colors duration-200 px-4 py-3'
                        }
                    >
                        <span className="material-symbols-outlined">location_on</span>
                        <span className="text-label-caps font-label-caps">Placement Tracker</span>
                    </NavLink>
                    <NavLink
                        to="/profile"
                        className={({ isActive }) =>
                            isActive
                                ? 'flex items-center gap-3 bg-primary-container text-on-primary border-l-4 border-[#F59E0B] px-4 py-3 translate-x-1 transition-transform'
                                : 'flex items-center gap-3 text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20 transition-colors duration-200 px-4 py-3'
                        }
                    >
                        <span className="material-symbols-outlined">settings</span>
                        <span className="text-label-caps font-label-caps">Settings</span>
                    </NavLink>
                </nav>
                <div className="px-4 py-3">
                    <button
                        className="w-full py-3 px-4 bg-secondary-container text-on-secondary-container font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors"
                        onClick={() => navigate('/institution/placements')}
                    >
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

            <main className="ml-sidebar-width min-h-screen flex flex-col">
                <header className="sticky top-0 w-full bg-surface border-b border-border z-40 h-16 flex items-center justify-between px-margin-desktop">
                    <div className="flex items-center bg-surface-container-low px-4 py-2 rounded-full w-96 border border-border">
                        <span className="material-symbols-outlined text-on-surface-variant">search</span>
                        <input className="bg-transparent border-none focus:ring-0 text-body-sm w-full ml-2 placeholder:text-on-surface-variant/60" placeholder="Search students or cohorts..." type="text" />
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
                            <div className="w-10 h-10 rounded-full border-2 border-primary-container bg-primary-subtle text-primary flex items-center justify-center font-bold text-sm overflow-hidden">
                                {user?.profile_photo_url ? (
                                    <img src={user.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    initialsOf(userName)
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8 max-w-[1280px] mx-auto w-full flex-1">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
