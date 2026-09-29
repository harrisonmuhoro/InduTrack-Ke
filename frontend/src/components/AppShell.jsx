import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Briefcase,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Shield,
  Sparkles,
  Star,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const PORTALS = {
  student: {
    kicker: 'Student desk',
    items: [
      { to: '/student', label: 'Open slots', icon: Briefcase, end: true },
      { to: '/student/applications', label: 'Applications', icon: ClipboardList },
      { to: '/student/logbook', label: 'Logbook', icon: BookOpen },
      { to: '/student/documents', label: 'Documents', icon: FolderOpen },
      { to: '/student/match', label: 'Suggested fits', icon: Sparkles },
      { to: '/student/evaluation', label: 'Rate company', icon: Star },
      { to: '/student/results', label: 'Results', icon: ClipboardList },
      { to: '/messages', label: 'Messages', icon: MessageSquare },
      { to: '/profile', label: 'Profile', icon: UserCircle },
    ],
  },
  company: {
    kicker: 'Company desk',
    items: [
      { to: '/company', label: 'Slots', icon: Briefcase, end: true },
      { to: '/company/applicants', label: 'Applicants', icon: Users },
      { to: '/messages', label: 'Messages', icon: MessageSquare },
      { to: '/profile', label: 'Profile', icon: UserCircle },
    ],
  },
  supervisor: {
    kicker: 'Supervisor desk',
    items: [
      { to: '/supervisor', label: 'My students', icon: GraduationCap, end: true },
      { to: '/supervisor/visits', label: 'Field visits', icon: MapPin },
      { to: '/messages', label: 'Messages', icon: MessageSquare },
      { to: '/profile', label: 'Profile', icon: UserCircle },
    ],
  },
  institution: {
    kicker: 'Institution office',
    items: [
      { to: '/institution', label: 'Overview', icon: LayoutDashboard },
      { to: '/messages', label: 'Messages', icon: MessageSquare },
      { to: '/profile', label: 'Profile', icon: UserCircle },
    ],
  },
  superadmin: {
    kicker: 'National office',
    items: [
      { to: '/superadmin', label: 'Overview', icon: Shield },
      { to: '/messages', label: 'Messages', icon: MessageSquare },
      { to: '/profile', label: 'Profile', icon: UserCircle },
    ],
  },
};

export function portalFromRole(role) {
  if (role === 'student') return 'student';
  if (role === 'company_supervisor' || role === 'company') return 'company';
  if (role === 'institution_supervisor') return 'supervisor';
  if (role === 'institution_admin') return 'institution';
  if (role === 'super_admin') return 'superadmin';
  return 'student';
}

function NavItems({ items, onNavigate }) {
  const location = useLocation();
  return items.map((item) => {
    const Icon = item.icon;
    const active = item.end
      ? location.pathname === item.to
      : location.pathname === item.to || location.pathname.startsWith(item.to + '/');
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={onNavigate}
        className={`group flex items-center gap-2.5 px-3 py-2 text-[0.92rem] border-l-2 transition-colors ${
          active
            ? 'border-l-[var(--copper)] bg-[rgba(184,92,56,0.08)] text-[var(--ink)] font-semibold'
            : 'border-l-transparent text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[rgba(28,22,18,0.04)]'
        }`}
      >
        <Icon size={16} strokeWidth={1.75} />
        {item.label}
      </NavLink>
    );
  });
}

export default function AppShell({ portal, children, pad = true, footerExtra }) {
  const { context, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const config = PORTALS[portal] || PORTALS.student;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebar = (
    <aside className="flex flex-col w-[15.5rem] shrink-0 bg-[var(--sheet)] border-r border-[var(--rule)] h-full">
      <div className="kenya-bar"><span /><span /><span /></div>
      <div className="px-5 pt-5 pb-4 border-b border-[var(--rule)]">
        <Link to="/" className="block">
          <p className="font-display text-[1.45rem] leading-none text-[var(--ink)]">InduTrack</p>
          <p className="text-[0.7rem] tracking-[0.22em] uppercase text-[var(--copper)] mt-1">Kenya · Attachment</p>
        </Link>
        <p className="mt-3 text-[0.72rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">{config.kicker}</p>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        <NavItems items={config.items} onNavigate={() => setOpen(false)} />
      </nav>
      <div className="p-4 border-t border-[var(--rule)] space-y-2">
        {footerExtra}
        {context && (
          <p className="text-[0.75rem] text-[var(--ink-soft)] leading-snug px-1">{context}</p>
        )}
        <button type="button" onClick={handleLogout} className="btn btn-ghost w-full text-[var(--stamp)] border-[rgba(122,46,36,0.25)]">
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="h-screen flex bg-[var(--paper)] text-[var(--ink)] overflow-hidden">
      <div className="hidden md:flex h-full">{sidebar}</div>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <button className="absolute inset-0 bg-[rgba(28,22,18,0.4)]" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="relative z-10 h-full">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--rule)] bg-[var(--sheet)]">
          <button type="button" className="btn btn-ghost px-2" onClick={() => setOpen(true)} aria-label="Open menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span className="font-display text-lg">InduTrack</span>
          <span className="w-9" />
        </header>
        <div className={`flex-1 min-h-0 overflow-y-auto ${pad ? 'px-5 py-6 md:px-10 md:py-8' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ kicker, title, subtitle, actions }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7">
      <div>
        {kicker && <p className="page-kicker">{kicker}</p>}
        <h1 className="text-[1.85rem] md:text-[2.1rem] text-[var(--ink)]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[var(--ink-soft)] max-w-xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stamp({ children, tone = 'draft' }) {
  return <span className={`stamp stamp-${tone}`}>{children}</span>;
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="sheet w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="font-display text-xl mb-4">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="sheet px-6 py-14 text-center text-[var(--ink-soft)]">
      {children}
    </div>
  );
}
