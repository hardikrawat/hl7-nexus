import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import { API } from '../../config/api';

export default function UserSessionControls({ variant = 'classic' }) {
  const username = useAuthStore((s) => s.username);
  const logoutLocal = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    setBusy(true);
    try {
      await apiClient.post(API.AUTH_LOGOUT);
    } catch {
      /* still clear session locally */
    }
    logoutLocal();
    setBusy(false);
    navigate('/login', { replace: true });
  };

  const isModern = variant === 'modern';

  return (
    <div
      className={
        isModern
          ? 'flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5'
          : 'flex items-center gap-2 border border-slate-200 bg-slate-50 px-2 py-1'
      }
    >
      <User size={isModern ? 15 : 13} className="text-slate-500" aria-hidden />
      <span className="max-w-[120px] truncate font-mono text-[10px] font-semibold text-slate-700" title={username || ''}>
        {username || '—'}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={busy}
        className={
          isModern
            ? 'inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100 disabled:opacity-50'
            : 'inline-flex items-center gap-1 border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest hover:bg-slate-100 disabled:opacity-50'
        }
        title="Sign out"
      >
        <LogOut size={12} />
        Out
      </button>
    </div>
  );
}
