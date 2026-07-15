import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * Apps-grid header button + popover of quick links.
 * Pass role-appropriate `links`: [{ to, icon, label }].
 * `buttonClassName` preserves each dashboard's existing header styling.
 */
export default function AppsMenu({ links = [], buttonClassName = 'p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button type="button" className={buttonClassName} onClick={() => setOpen(o => !o)} aria-label="Quick links">
        <span className="material-symbols-outlined">apps</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-surface rounded-xl border border-border shadow-lg z-[60] p-3 grid grid-cols-3 gap-2">
          {links.map(l => (
            <Link
              key={l.to + l.label}
              to={l.to}
              onClick={() => setOpen(false)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-surface-container-low transition-colors text-center"
            >
              <span className="material-symbols-outlined text-primary">{l.icon}</span>
              <span className="text-label-caps text-on-surface-variant leading-tight">{l.label}</span>
            </Link>
          ))}
          {links.length === 0 && (
            <p className="col-span-3 text-body-sm text-on-surface-variant text-center py-2">No shortcuts</p>
          )}
        </div>
      )}
    </div>
  );
}
