import React from 'react';
import { AlertTriangle, Cloud, Cpu, Server, Settings, X } from 'lucide-react';

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_LOCAL_MODEL = 'llama3';

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

export default function LocalAiRequirementModal({
  status,
  systemConfig,
  onClose,
  onOpenConfig,
  onUseCloudAi,
  onUseAlgorithm,
}) {
  const ollamaUrl = systemConfig?.ollamaUrl?.trim() || DEFAULT_OLLAMA_URL;
  const localModel = systemConfig?.localModel?.trim() || DEFAULT_LOCAL_MODEL;
  const installedModels = uniqueStrings(
    (status?.installed_model_ids || status?.models || [])
      .map((model) => (typeof model === 'string' ? model : model?.id || model?.name))
  );
  const missingItems = uniqueStrings(status?.missing || []);
  const requiredItems = uniqueStrings(status?.required || [
    'Install and run Ollama',
    `Pull the configured model with: ollama pull ${localModel}`,
    `Confirm Ollama responds at: ${ollamaUrl}/api/tags`,
  ]);

  return (
    <div className="nexus-modal-overlay fixed inset-0 z-[10900] flex items-center justify-center p-4">
      <section className="w-full max-w-xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[var(--nexus-modal-shadow)]">
        <header className="flex items-start justify-between border-b border-slate-200 bg-amber-50 px-5 py-4">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-amber-200 bg-white text-amber-700">
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                Local AI setup required
              </div>
              <h2 className="mt-1 text-base font-semibold text-slate-950">
                Ollama Local is not ready for inference
              </h2>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                Configure the local AI runtime before using Local AI features.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-amber-200 bg-white text-slate-500 transition hover:bg-amber-100 hover:text-slate-950"
            title="Dismiss"
            aria-label="Dismiss Local AI setup message"
          >
            <X size={16} />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Current status
            </div>
            <p className="text-sm font-semibold text-slate-900">
              {status?.detail || 'Local AI configuration is incomplete.'}
            </p>
            {missingItems.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {missingItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-red-700"
                  >
                    Missing: {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                <Server size={13} />
                Ollama URL
              </div>
              <code className="block break-all rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-800">
                {ollamaUrl}
              </code>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                <Cpu size={13} />
                Configured model
              </div>
              <code className="block break-all rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-800">
                {localModel}
              </code>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Required configuration
            </div>
            <ul className="space-y-2 text-sm leading-5 text-slate-700">
              {requiredItems.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {installedModels.length > 0 && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                Detected Ollama models
              </div>
              <div className="flex flex-wrap gap-2">
                {installedModels.map((model) => (
                  <code
                    key={model}
                    className="rounded border border-emerald-200 bg-white px-2 py-1 text-[11px] text-emerald-800"
                  >
                    {model}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onUseCloudAi}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <Cloud size={15} />
              Use Cloud AI
            </button>
            <button
              type="button"
              onClick={onUseAlgorithm}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <Cpu size={15} />
              Use Algorithm
            </button>
          </div>
          <button
            type="button"
            onClick={onOpenConfig}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Settings size={15} />
            Open Configuration
          </button>
        </footer>
      </section>
    </div>
  );
}
