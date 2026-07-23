import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../../components/NotificationBell';
import AppsMenu from '../../components/AppsMenu';

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

export default function StudentLayout() {
    const { user, context, logout } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/student/match?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="font-body-md text-body-md overflow-x-hidden min-h-screen bg-[var(--color-bg)]">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-screen w-sidebar-width bg-[#064D37] flex flex-col py-gutter shadow-sm z-50 overflow-y-auto">
                <div className="px-6 mb-10">
                    <h2 className="text-surface font-headline-md text-headline-md font-bold tracking-tight">InduTrack KE</h2>
                    <p className="text-primary-fixed/60 font-label-caps text-[10px] mt-1 uppercase tracking-widest">Student Portal</p>
                </div>
                
                <nav className="flex-1 flex flex-col gap-1 px-2">
                    <NavLink
                        to="/student"
                        end
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-on-primary border-l-4 border-[#F59E0B] translate-x-1 shadow-sm'
                                : 'text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
                        <span className="font-label-caps text-label-caps">Dashboard</span>
                    </NavLink>
                    
                    <NavLink
                        to="/student/applications"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-on-primary border-l-4 border-[#F59E0B] translate-x-1 shadow-sm'
                                : 'text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                        <span className="font-label-caps text-label-caps">Placement Tracker</span>
                    </NavLink>

                    <NavLink
                        to="/student/logbook"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-on-primary border-l-4 border-[#F59E0B] translate-x-1 shadow-sm'
                                : 'text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                        <span className="font-label-caps text-label-caps">Logbook</span>
                    </NavLink>

                    <NavLink
                        to="/student/match"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-on-primary border-l-4 border-[#F59E0B] translate-x-1 shadow-sm'
                                : 'text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>travel_explore</span>
                        <span className="font-label-caps text-label-caps">Smart Match</span>
                    </NavLink>

                    <NavLink
                        to="/student/documents"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-on-primary border-l-4 border-[#F59E0B] translate-x-1 shadow-sm'
                                : 'text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                        <span className="font-label-caps text-label-caps">Documents</span>
                    </NavLink>

                    <NavLink
                        to="/student/evaluation"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-on-primary border-l-4 border-[#F59E0B] translate-x-1 shadow-sm'
                                : 'text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star_rate</span>
                        <span className="font-label-caps text-label-caps">Rate Company</span>
                    </NavLink>
                    
                    <NavLink
                        to="/student/results"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg sidebar-item-transition ${
                                isActive 
                                ? 'bg-primary-container text-on-primary border-l-4 border-[#F59E0B] translate-x-1 shadow-sm'
                                : 'text-surface-variant/80 hover:text-surface hover:bg-primary-hover/20'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>bar_chart</span>
                        <span className="font-label-caps text-label-caps">Evaluation Results</span>
                    </NavLink>
                </nav>

                <div className="mt-6 border-t border-surface/10 pt-6 px-2 pb-4">
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
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
                        <span className="font-label-caps text-label-caps">Settings</span>
                    </NavLink>

                    <a className="flex items-center gap-3 text-surface-variant/80 hover:text-surface px-4 py-3 sidebar-item-transition hover:bg-primary-hover/20 rounded-lg" href="mailto:support@indutrack.ke">
                        <span className="material-symbols-outlined">help</span>
                        <span className="font-label-caps text-label-caps">Help Center</span>
                    </a>
                    <button className="w-full flex items-center gap-3 text-surface-variant/80 hover:text-surface px-4 py-3 sidebar-item-transition hover:bg-primary-hover/20 rounded-lg" onClick={handleLogout} type="button">
                        <span className="material-symbols-outlined">logout</span>
                        <span className="font-label-caps text-label-caps">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="ml-sidebar-width min-h-screen flex flex-col">
                {/* Header */}
                <header className="sticky top-0 bg-surface border-b border-border h-16 flex items-center justify-between px-margin-desktop z-40">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-3 flex items-center text-outline pointer-events-none">
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            </span>
                            <input 
                                className="bg-surface-container-low border-border rounded-full pl-10 pr-4 py-1.5 text-body-sm w-64 md:w-80 focus:ring-2 focus:ring-primary-subtle focus:border-primary transition-all" 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                onKeyDown={handleSearchKeyDown} 
                                placeholder="Search resources, placements..." 
                                type="text" 
                                value={searchQuery}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex gap-4 items-center">
                            <NotificationBell buttonClassName="relative p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors" />
                            <AppsMenu buttonClassName="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors" links={STUDENT_APP_LINKS} />
                        </div>
                        <div className="h-8 w-px bg-border"></div>
                        <div className="flex items-center gap-3 cursor-pointer group">
                            <div className="text-right hidden sm:block">
                                <p className="font-bold text-body-sm leading-none">{user?.name || 'Student'}</p>
                                <p className="text-[10px] uppercase font-bold text-outline-variant tracking-wider">{context || user?.email || 'Student'}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-primary-fixed bg-primary-subtle text-primary flex items-center justify-center font-bold text-body-sm overflow-hidden">
                                {user?.profile_photo_url ? (
                                    <img src={user.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    initialsOf(user?.name)
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Sub-page content rendered here */}
                <Outlet />

                <button 
                    className="fixed bottom-10 right-10 w-16 h-16 bg-[#064D37] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-primary transition-all duration-300 transform hover:scale-110 z-50 group" 
                    onClick={() => navigate('/student/logbook')} 
                    type="button"
                >
                    <span className="material-symbols-outlined text-[32px]">edit_note</span>
                    <span className="absolute right-full mr-4 bg-[#064D37] text-white px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-label-caps shadow-lg pointer-events-none">New Entry</span>
                </button>
            </main>
        </div>
    );
}
