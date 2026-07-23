import React, { useCallback, useState } from 'react';

// ── Helpers shared across Super Admin pages ──────────────────────────────────
export function initialsOf(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('');
}

export function timeAgo(dateStr) {
    if (!dateStr) return '';
    const then = new Date(dateStr).getTime();
    if (Number.isNaN(then)) return '';
    const secs = Math.floor((Date.now() - then) / 1000);
    if (secs < 60) return 'Just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} Minute${mins === 1 ? '' : 's'} Ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} Hour${hrs === 1 ? '' : 's'} Ago`;
    const days = Math.floor(hrs / 24);
    return `${days} Day${days === 1 ? '' : 's'} Ago`;
}

export function fmt(n) {
    if (n === null || n === undefined) return '0';
    return Number(n).toLocaleString();
}

// ── Toast ─────────────────────────────────────────────────────────────────────
export function useToast() {
    const [toast, setToast] = useState({ visible: false, title: '', body: '' });
    const showToast = useCallback((title, body) => {
        setToast({ visible: true, title, body });
        setTimeout(() => setToast((t) => ({ ...t, visible: false })), 5000);
    }, []);
    const hideToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);
    return { toast, showToast, hideToast };
}

export function Toast({ toast, onClose }) {
    return (
        <div className={`fixed bottom-10 right-10 z-[60] transform transition-all duration-500 ${toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`} id="system-toast">
            <div className="bg-primary text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4">
                <span className="material-symbols-outlined">info</span>
                <div>
                    <p className="font-bold text-body-sm">{toast.title}</p>
                    <p className="text-[12px] opacity-80">{toast.body}</p>
                </div>
                <button className="ml-4 opacity-60 hover:opacity-100" onClick={onClose}>
                    <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
            </div>
        </div>
    );
}
