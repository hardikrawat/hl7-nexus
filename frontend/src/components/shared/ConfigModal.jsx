import React, { useState } from 'react';
import { useNexusStore } from '../../store/nexusStore';
import { Cloud, Database, LayoutDashboard, RefreshCw, Server, X } from 'lucide-react';
import axios from 'axios';
import { API } from '../../config/api';

function ConfigSection({ icon: Icon, eyebrow, title, children }) {
  return (
    <section className="nexus-config-section rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="nexus-config-icon flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
          <Icon size={16} />
        </div>
        <div>
          <div className="nexus-config-eyebrow text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {eyebrow}
          </div>
          <h3 className="nexus-config-title text-sm font-semibold text-slate-900">
            {title}
          </h3>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function ConfigModal() {
  const { systemConfig, updateSystemConfig, setConfigModalOpen, addEvent } = useNexusStore();
  const [initialConfig] = useState(systemConfig);
  const [localConfig, setLocalConfig] = useState(systemConfig);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const handleChange = (e) => {
    const patch = { [e.target.name]: e.target.value };
    setLocalConfig({ ...localConfig, ...patch });

    if (e.target.name === 'layoutMode') {
      updateSystemConfig(patch);
    }
  };

  const handleCancel = () => {
    updateSystemConfig({
      layoutMode: initialConfig.layoutMode || 'modern',
    });
    setConfigModalOpen(false);
  };

  const fetchGeminiModels = async () => {
    if (!localConfig.geminiApiKey) return;
    setIsFetchingModels(true);
    try {
      addEvent({
        type: 'EventType.FETCH_MODELS',
        timestamp: new Date().toISOString(),
        engine: 'system',
        detail: 'Fetching Gemini models via proxy...',
        severity: 'INFO'
      });
      // Hit our FastAPI backend
      const res = await axios.post(API.ENGINE_GEMINI_MODELS, { api_key: localConfig.geminiApiKey }, { timeout: 15000 });
      const models = res.data.models;
      
      setLocalConfig(prev => ({ ...prev, availableModels: models, activeModel: models[0]?.id }));
      setIsFetchingModels(false);
      addEvent({
        type: 'EventType.FETCH_COMPLETE',
        timestamp: new Date().toISOString(),
        engine: 'system',
        detail: `Fetched ${models.length} Gemini models`,
        severity: 'INFO'
      });
    } catch (err) {
      console.error(err);
      setIsFetchingModels(false);
    }
  };

  const handleSave = () => {
    updateSystemConfig(localConfig);
    setConfigModalOpen(false);
    addEvent({
      type: 'EventType.CONFIG_UPDATED',
      timestamp: new Date().toISOString(),
      engine: 'system',
      detail: 'System configuration saved',
      severity: 'INFO'
    });
  };

  return (
    <div className="nexus-config-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
      <div className="nexus-config-dialog flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        {/* Header */}
        <div className="nexus-config-dialog-header flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <div className="nexus-config-accent text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-nexus-red)]">
              Control panel
            </div>
            <h2 className="nexus-config-title mt-1 text-xl font-semibold tracking-tight text-slate-950">
              System Configuration
            </h2>
            <p className="nexus-config-copy mt-1 text-sm text-slate-500">
              Configure engine providers, terminology sources, and workspace layout.
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="nexus-button-secondary flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
            title="Close settings"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="nexus-config-dialog-body flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-5">
          {/* Gemini Config */}
          <ConfigSection icon={Cloud} eyebrow="Cloud AI" title="Gemini configuration">
            <div className="flex gap-2">
              <input 
                type="password"
                name="geminiApiKey"
                value={localConfig.geminiApiKey}
                onChange={handleChange}
                placeholder="Enter Google Gemini API Key"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-900 outline-none transition focus:border-[var(--color-nexus-red)] focus:ring-4 focus:ring-red-900/10"
              />
              <button 
                onClick={fetchGeminiModels}
                disabled={!localConfig.geminiApiKey || isFetchingModels}
                className="flex items-center rounded-xl border border-slate-900 bg-slate-950 px-4 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {isFetchingModels ? <RefreshCw size={14} className="animate-spin mr-2" /> : null}
                Fetch Models
              </button>
            </div>
            
            {localConfig.availableModels && localConfig.availableModels.length > 0 && (
              <div className="flex flex-col space-y-2 mt-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Select model</label>
                <select 
                  name="activeModel"
                  value={localConfig.activeModel}
                  onChange={handleChange}
                  className="appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm outline-none transition focus:border-[var(--color-nexus-red)] focus:ring-4 focus:ring-red-900/10"
                >
                  {localConfig.availableModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.isFree ? ' [FREE TIER]' : ''} - {m.rateLimit}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </ConfigSection>

          {/* Local AI Config */}
          <ConfigSection icon={Server} eyebrow="Local AI" title="Ollama configuration">
            <input 
              type="text"
              name="ollamaUrl"
              value={localConfig.ollamaUrl}
              onChange={handleChange}
              placeholder="http://localhost:11434"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-900 outline-none transition focus:border-[var(--color-nexus-red)] focus:ring-4 focus:ring-red-900/10"
            />
          </ConfigSection>

          {/* Terminology Server Config */}
          <ConfigSection icon={Database} eyebrow="Algorithm" title="Terminology server">
            <select 
              name="terminologyServer"
              value={localConfig.terminologyServer}
              onChange={handleChange}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm outline-none transition focus:border-[var(--color-nexus-red)] focus:ring-4 focus:ring-red-900/10"
            >
              <option value="hl7_tho">HL7 Terminology (THO) REST API</option>
              <option value="cdc_phin">CDC PHIN VADS</option>
              <option value="tx_fhir">tx.fhir.org Terminology Server</option>
              <option value="github_raw">GitHub Raw (hl7apy profiles)</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">
              The system dynamically downloads rules and tables from this source at runtime.
            </p>
          </ConfigSection>

          {/* Workspace Architecture Config */}
          <ConfigSection icon={LayoutDashboard} eyebrow="Interface" title="Workspace architecture">
            <select 
              name="layoutMode"
              value={localConfig.layoutMode || 'modern'}
              onChange={handleChange}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm outline-none transition focus:border-[var(--color-nexus-red)] focus:ring-4 focus:ring-red-900/10"
            >
              <option value="modern">ORBITAL WORKSPACE (Modern Console)</option>
              <option value="classic">CLASSIC (3-Column Dense)</option>
              <option value="ide">IDE COLLAPSIBLE (Toggle Sidebars)</option>
              <option value="unified">UNIFIED DASHBOARD (2-Column Focused)</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Layout changes preview instantly. Cancel restores the previous layout.
            </p>
          </ConfigSection>

        </div>

        {/* Footer */}
        <div className="nexus-config-dialog-footer flex justify-end gap-3 border-t border-slate-200 bg-white p-4">
          <button 
            onClick={handleCancel}
            className="nexus-button-secondary rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="rounded-xl border border-red-900/10 bg-[var(--color-nexus-red)] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-red-800"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
