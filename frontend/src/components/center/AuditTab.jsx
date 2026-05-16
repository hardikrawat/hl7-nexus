import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ScrollText } from 'lucide-react';
import { apiClient } from '../../api/client';
import { API } from '../../config/api';

const PAGE_SIZE = 100;

export default function AuditTab() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [includeAll, setIncludeAll] = useState(false);

  const load = useCallback(
    async (nextSkip) => {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.get(API.AUDIT, {
          params: {
            skip: nextSkip,
            limit: PAGE_SIZE,
            ...(includeAll ? { include_all: true } : {}),
          },
          timeout: 30000,
        });
        setItems(res.data.items || []);
        setTotal(res.data.total ?? 0);
        setSkip(nextSkip);
      } catch (err) {
        const detail = err.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : err.message || 'Failed to load audits');
      } finally {
        setLoading(false);
      }
    },
    [includeAll]
  );

  useEffect(() => {
    load(0);
  }, [load]);

  const canGoNewer = skip > 0;
  const canGoOlder = skip + PAGE_SIZE < total;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
      <div className="flex flex-shrink-0 flex-col gap-2 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            <ScrollText size={14} className="text-[var(--color-nexus-red)]" />
            <span className="min-w-0 break-words">
              User audit — rows {skip + 1}–{skip + items.length} of {total}
            </span>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <label className="flex min-w-0 cursor-pointer items-center gap-2 font-mono text-[10px] text-slate-600">
              <input
                type="checkbox"
                checked={includeAll}
                onChange={(e) => {
                  setIncludeAll(e.target.checked);
                  setSkip(0);
                }}
                className="rounded border-slate-400"
              />
              Show all stored rows
            </label>
            <button
              type="button"
              onClick={() => load(0)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => load(Math.max(0, skip - PAGE_SIZE))}
              disabled={loading || !canGoNewer}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Newer
            </button>
            <button
              type="button"
              onClick={() => load(skip + PAGE_SIZE)}
              disabled={loading || !canGoOlder}
              className="rounded border border-slate-900 bg-slate-900 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-slate-800 disabled:opacity-40"
            >
              Older
            </button>
          </div>
        </div>
        <p className="font-mono text-[10px] leading-relaxed text-slate-500 break-words">
          {includeAll
            ? 'Showing every row still in memory (including legacy types if any).'
            : 'Showing sign-in/out, HL7 parse & generate, clinical NLP, and “fetch Gemini models” from settings — not live WebSocket telemetry.'}
        </p>
      </div>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800">{error}</div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[var(--nexus-border)] bg-[var(--nexus-panel)]">
        <table className="min-w-[720px] w-full table-fixed border-collapse text-left font-mono text-[11px]">
          <thead className="sticky top-0 z-10 bg-[var(--nexus-panel-strong)] text-[10px] uppercase tracking-wider text-[var(--nexus-panel-strong-text)] shadow-sm">
            <tr>
              <th className="border-b border-[var(--nexus-border-strong)] px-2 py-2">ID</th>
              <th className="border-b border-[var(--nexus-border-strong)] px-2 py-2">Time (UTC)</th>
              <th className="border-b border-[var(--nexus-border-strong)] px-2 py-2">User</th>
              <th className="border-b border-[var(--nexus-border-strong)] px-2 py-2">Action</th>
              <th className="border-b border-[var(--nexus-border-strong)] px-2 py-2">Outcome</th>
              <th className="border-b border-[var(--nexus-border-strong)] px-2 py-2">IP</th>
              <th className="border-b border-[var(--nexus-border-strong)] px-2 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No matching audit entries yet. Use Parse, Generate, NLP, or Settings → fetch models.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-slate-200 bg-white hover:bg-slate-50">
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">{row.id}</td>
                  <td className="break-words px-2 py-1.5 text-slate-600">{row.timestamp}</td>
                  <td className="max-w-[100px] truncate px-2 py-1.5 text-slate-800" title={row.username}>
                    {row.username}
                  </td>
                  <td className="max-w-[140px] truncate px-2 py-1.5 font-semibold text-slate-900" title={row.action}>
                    {row.action}
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className={
                        row.outcome === 'failure'
                          ? 'rounded bg-red-100 px-1.5 py-0.5 text-red-800'
                          : 'rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800'
                      }
                    >
                      {row.outcome}
                    </span>
                  </td>
                  <td className="max-w-[100px] truncate px-2 py-1.5 text-slate-600" title={row.ip}>
                    {row.ip || '—'}
                  </td>
                  <td className="max-w-md break-all px-2 py-1.5 text-slate-700" title={row.detail}>
                    {row.detail || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
