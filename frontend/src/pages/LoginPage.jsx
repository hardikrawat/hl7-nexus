import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Navigate, useNavigate } from 'react-router-dom';
import { Activity, KeyRound, LockKeyhole, Moon, Server, ShieldCheck, Sun, User, Wifi } from 'lucide-react';
import { API } from '../config/api';
import { useAuthStore } from '../store/authStore';
import { useNexusStore } from '../store/nexusStore';
import { DARK_THEME_ID, DEFAULT_THEME_ID, getNextThemeId, getThemeById } from '../config/themes';

export default function LoginPage() {
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const systemConfig = useNexusStore((s) => s.systemConfig);
  const updateSystemConfig = useNexusStore((s) => s.updateSystemConfig);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const themeId = getThemeById(systemConfig?.themeId || DEFAULT_THEME_ID).id;
  const isDarkTheme = themeId === DARK_THEME_ID;

  useEffect(() => {
    document.body.dataset.nexusTheme = themeId;
    document.body.classList.add('modern-ui');
    return () => {
      delete document.body.dataset.nexusTheme;
      document.body.classList.remove('modern-ui');
    };
  }, [themeId]);

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

  const toggleTheme = () => {
    updateSystemConfig({ themeId: getNextThemeId(themeId) });
  };

  return (
    <div className={`theme-${themeId} modern-shell nexus-orbital-shell flex min-h-screen overflow-hidden bg-[var(--nexus-page)] px-4 py-6 text-[var(--nexus-ink)] sm:px-6 lg:px-8`}>
      <div className="nexus-orbital-glow nexus-orbital-glow--one" aria-hidden="true" />
      <div className="nexus-orbital-glow nexus-orbital-glow--two" aria-hidden="true" />

      <button
        type="button"
        onClick={toggleTheme}
        className="nexus-icon-button absolute right-4 top-4 z-20 inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--nexus-border)] bg-[var(--nexus-surface)] px-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--nexus-muted)] shadow-sm transition-colors hover:bg-[var(--nexus-control-hover-bg)] hover:text-[var(--nexus-ink)] sm:right-6 sm:top-6"
        title={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkTheme ? <Sun size={14} /> : <Moon size={14} />}
        <span>{isDarkTheme ? 'Light' : 'Dark'}</span>
      </button>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-[var(--nexus-border)] bg-[var(--nexus-glass-strong)] shadow-[var(--nexus-modal-shadow)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden min-h-[620px] flex-col justify-between border-r border-[var(--nexus-border)] bg-[var(--nexus-panel)] p-8 lg:flex">
            <div>
              <div className="nexus-brand-cluster inline-flex items-center gap-3 rounded-2xl border border-[var(--nexus-border)] bg-[var(--nexus-surface)] px-3 py-2 shadow-sm">
                <div className="nexus-brand-logo flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-[var(--color-nexus-red)]">
                  <Activity size={20} className="nexus-brand-logo-icon" />
                </div>
                <div>
                  <h1 className="nexus-brand-title text-lg font-semibold tracking-tight text-[var(--nexus-ink)]">
                    Helix System
                  </h1>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--nexus-muted)]">
                    Nexus
                  </div>
                </div>
              </div>

              <div className="mt-12 max-w-xl">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--nexus-accent-text)]">
                  Secure workbench
                </p>
                <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-[var(--nexus-ink)]">
                  Clinical interoperability operations console
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-6 text-[var(--nexus-muted)]">
                  Access HL7 build, parse, validation, FHIR export, audit, and AI-assisted workflows from one governed dashboard.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                { icon: ShieldCheck, label: 'Auth layer', value: 'JWT protected APIs' },
                { icon: Server, label: 'Runtime', value: 'FastAPI + Vite online' },
                { icon: Wifi, label: 'Event bus', value: 'Session telemetry ready' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl border border-[var(--nexus-border)] bg-[var(--nexus-surface)] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--nexus-border)] bg-[var(--nexus-control-bg)] text-[var(--nexus-accent)]">
                        <Icon size={16} />
                      </span>
                      <div>
                        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--nexus-faint)]">
                          {item.label}
                        </div>
                        <div className="text-sm font-semibold text-[var(--nexus-ink)]">
                          {item.value}
                        </div>
                      </div>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-[var(--nexus-green)] shadow-[0_0_16px_var(--nexus-green)]" />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="flex min-h-[620px] items-center justify-center bg-[var(--nexus-surface)] p-5 sm:p-8">
            <div className="w-full max-w-md">
              <div className="mb-8 flex items-center gap-3 lg:hidden">
                <div className="nexus-brand-logo flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-[var(--color-nexus-red)]">
                  <Activity size={20} className="nexus-brand-logo-icon" />
                </div>
                <div>
                  <h1 className="nexus-brand-title text-lg font-semibold tracking-tight text-[var(--nexus-ink)]">
                    Helix System
                  </h1>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--nexus-muted)]">
                    Nexus
                  </div>
                </div>
              </div>

              <div className="mb-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--nexus-border)] bg-[var(--nexus-panel)] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--nexus-muted)]">
                  <LockKeyhole size={12} className="text-[var(--nexus-accent)]" />
                  Operator sign in
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--nexus-ink)]">
                  Access workspace
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--nexus-muted)]">
                  Use the configured Nexus account to continue.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="nexus-user" className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--nexus-muted)]">
                    Username
                  </label>
                  <div className="relative">
                    <User size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nexus-faint)]" />
                    <input
                      id="nexus-user"
                      autoComplete="username"
                      className="h-11 w-full rounded-xl border border-[var(--nexus-border)] bg-[var(--nexus-input)] py-0 pl-10 pr-3 font-mono text-sm text-[var(--nexus-ink)] outline-none transition placeholder:text-[var(--nexus-faint)] focus:border-[var(--nexus-accent)] focus:ring-4 focus:ring-red-900/10"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="nexus-pass" className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--nexus-muted)]">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nexus-faint)]" />
                    <input
                      id="nexus-pass"
                      type="password"
                      autoComplete="current-password"
                      className="h-11 w-full rounded-xl border border-[var(--nexus-border)] bg-[var(--nexus-input)] py-0 pl-10 pr-3 font-mono text-sm text-[var(--nexus-ink)] outline-none transition placeholder:text-[var(--nexus-faint)] focus:border-[var(--nexus-accent)] focus:ring-4 focus:ring-red-900/10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error ? (
                  <p className="rounded-xl border border-[var(--nexus-log-error-border)] bg-[var(--nexus-log-error-bg)] px-3 py-2 font-mono text-xs text-[var(--nexus-log-error-text)]">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="nexus-segment-button nexus-segment-button--active flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 font-mono text-[11px] font-bold uppercase tracking-widest transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                  <ShieldCheck size={14} />
                </button>
              </form>

              {/* <div className="mt-5 rounded-2xl border border-[var(--nexus-border)] bg-[var(--nexus-panel)] p-3">
                <div className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--nexus-faint)]">
                  Default dev account
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--nexus-muted)]">
                  <span className="rounded-md border border-[var(--nexus-border)] bg-[var(--nexus-surface)] px-2 py-1 font-mono text-[11px] text-[var(--nexus-ink)]">
                    admin
                  </span>
                  <span className="font-mono text-[10px] text-[var(--nexus-faint)]">/</span>
                  <span className="rounded-md border border-[var(--nexus-border)] bg-[var(--nexus-surface)] px-2 py-1 font-mono text-[11px] text-[var(--nexus-ink)]">
                    admin
                  </span>
                  <span className="text-xs text-[var(--nexus-muted)]">
                    unless `NEXUS_AUTH_USERS` is configured.
                  </span>
                </div>
              </div> */}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
