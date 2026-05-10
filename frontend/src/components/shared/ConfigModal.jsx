import React, { useState } from 'react';
import { useNexusStore } from '../../store/nexusStore';
import { X, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API } from '../../config/api';

export default function ConfigModal() {
  const { systemConfig, updateSystemConfig, setConfigModalOpen, addEvent } = useNexusStore();
  const [localConfig, setLocalConfig] = useState(systemConfig);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const handleChange = (e) => {
    setLocalConfig({ ...localConfig, [e.target.name]: e.target.value });
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
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white border-2 border-black shadow-2xl w-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3 border-b-2 border-[var(--color-nexus-red)] flex justify-between items-center">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest">
            SYSTEM_CONFIG // CONTROL_PANEL
          </h2>
          <button onClick={() => setConfigModalOpen(false)} className="hover:text-red-400">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col space-y-6">
          
          {/* Gemini Config */}
          <div className="flex flex-col space-y-3">
            <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500 font-bold border-b border-gray-200 pb-1">
              // CLOUD AI : GEMINI CONFIGURATION
            </label>
            <div className="flex space-x-2">
              <input 
                type="password"
                name="geminiApiKey"
                value={localConfig.geminiApiKey}
                onChange={handleChange}
                placeholder="Enter Google Gemini API Key"
                className="flex-1 border-2 border-black px-3 py-2 font-mono text-sm focus:outline-none focus:border-[var(--color-nexus-red)]"
              />
              <button 
                onClick={fetchGeminiModels}
                disabled={!localConfig.geminiApiKey || isFetchingModels}
                className="bg-black text-white px-4 border-2 border-black font-mono text-[11px] uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 flex items-center"
              >
                {isFetchingModels ? <RefreshCw size={14} className="animate-spin mr-2" /> : null}
                Fetch Models
              </button>
            </div>
            
            {localConfig.availableModels && localConfig.availableModels.length > 0 && (
              <div className="flex flex-col space-y-2 mt-2">
                <label className="font-mono text-[9px] uppercase tracking-widest text-slate-400">Select Model</label>
                <select 
                  name="activeModel"
                  value={localConfig.activeModel}
                  onChange={handleChange}
                  className="border-2 border-black px-3 py-2 font-mono text-sm focus:outline-none appearance-none bg-slate-50"
                >
                  {localConfig.availableModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.isFree ? ' [FREE TIER]' : ''} - {m.rateLimit}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Local AI Config */}
          <div className="flex flex-col space-y-3">
            <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500 font-bold border-b border-gray-200 pb-1">
              // LOCAL AI : OLLAMA CONFIGURATION
            </label>
            <input 
              type="text"
              name="ollamaUrl"
              value={localConfig.ollamaUrl}
              onChange={handleChange}
              placeholder="http://localhost:11434"
              className="border-2 border-black px-3 py-2 font-mono text-sm focus:outline-none focus:border-[var(--color-nexus-red)]"
            />
          </div>

          {/* Terminology Server Config */}
          <div className="flex flex-col space-y-3">
            <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500 font-bold border-b border-gray-200 pb-1">
              // ALGORITHM : TERMINOLOGY SERVER
            </label>
            <select 
              name="terminologyServer"
              value={localConfig.terminologyServer}
              onChange={handleChange}
              className="border-2 border-black px-3 py-2 font-mono text-sm focus:outline-none appearance-none bg-slate-50"
            >
              <option value="hl7_tho">HL7 Terminology (THO) REST API</option>
              <option value="cdc_phin">CDC PHIN VADS</option>
              <option value="tx_fhir">tx.fhir.org Terminology Server</option>
              <option value="github_raw">GitHub Raw (hl7apy profiles)</option>
            </select>
            <p className="font-mono text-[9px] text-slate-400">
              * The system will dynamically download rules and tables from this source at runtime.
            </p>
          </div>

          {/* Workspace Architecture Config */}
          <div className="flex flex-col space-y-3">
            <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500 font-bold border-b border-gray-200 pb-1">
              // UI : WORKSPACE ARCHITECTURE
            </label>
            <select 
              name="layoutMode"
              value={localConfig.layoutMode || 'classic'}
              onChange={handleChange}
              className="border-2 border-black px-3 py-2 font-mono text-sm focus:outline-none appearance-none bg-slate-50"
            >
              <option value="classic">CLASSIC (3-Column Dense)</option>
              <option value="ide">IDE COLLAPSIBLE (Toggle Sidebars)</option>
              <option value="unified">UNIFIED DASHBOARD (2-Column Focused)</option>
            </select>
            <p className="font-mono text-[9px] text-slate-400">
              * The layout architecture will be hot-swapped immediately.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50">
          <button 
            onClick={() => setConfigModalOpen(false)}
            className="px-4 py-2 bg-white border-2 border-black font-mono text-[11px] uppercase font-bold tracking-widest hover:bg-gray-100"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-[var(--color-nexus-red)] text-white border-2 border-black font-mono text-[11px] uppercase font-bold tracking-widest hover:bg-red-800"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
