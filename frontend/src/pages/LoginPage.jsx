import React, { useState } from 'react';
import axios from 'axios';
import { Navigate, useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { API } from '../config/api';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(
        API.AUTH_LOGIN,
        { username: username.trim(), password },
        { timeout: 15000 }
      );
      setAuth(res.data.access_token, res.data.username);
      navigate('/', { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 text-slate-900">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-[var(--color-nexus-red)]">
            <Activity size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Helix System</h1>
          <p className="text-sm text-slate-500">
            Sign in to access HL7 tools and audit history. Default dev account is{' '}
            <span className="font-mono text-slate-700">admin</span> /{' '}
            <span className="font-mono text-slate-700">admin</span> unless you set{' '}
            <span className="font-mono text-xs">NEXUS_AUTH_USERS</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nexus-user" className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Username
            </label>
            <input
              id="nexus-user"
              autoComplete="username"
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none ring-0 focus:border-[var(--color-nexus-red)]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="nexus-pass" className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Password
            </label>
            <input
              id="nexus-pass"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-[var(--color-nexus-red)]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
