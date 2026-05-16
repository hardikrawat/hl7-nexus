import React, { useEffect, useState } from 'react';
import { Activity, Moon, Settings, Sun } from 'lucide-react';
import UserSessionControls from '../auth/UserSessionControls';
import { useNexusStore } from '../../store/nexusStore';
import clsx from 'clsx';
import { DARK_THEME_ID, LIGHT_THEME_ID, getNextThemeId, getThemeById } from '../../config/themes';

export default function GlobalHeader() {
  const { engineMode, setEngineMode, setConfigModalOpen, systemConfig, updateSystemConfig } = useNexusStore();
  const [sessionTime, setSessionTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSessionTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const isAI = engineMode === 'cloud_ai' || engineMode === 'local_ai';
  const themeId = getThemeById(systemConfig?.themeId || LIGHT_THEME_ID).id;
  const isDarkTheme = themeId === DARK_THEME_ID;

  const toggleTheme = () => {
    updateSystemConfig({ themeId: getNextThemeId(themeId) });
  };

  return (
    <header className="nexus-global-header relative z-50 flex min-h-14 flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--color-nexus-red)] bg-white px-4 py-2">
      
      {/* LEFT SECTION */}
      <div className="nexus-global-header-brand flex min-w-0 items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="nexus-brand-logo flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-[var(--color-nexus-red)]">
            <Activity size={18} className="nexus-brand-logo-icon" />
          </div>
          <h1 className="nexus-brand-title truncate font-mono text-xl font-bold tracking-wider text-[var(--color-nexus-red)]">
            HL7
          </h1>
        </div>
        <div className="hidden min-w-0 items-center gap-2 border-l-2 border-slate-300 pl-4 font-mono text-[9px] uppercase tracking-wider text-slate-500 lg:flex">
          <span className="truncate">Enterprise HL7 Orchestration powered by the Nexus-Hybrid Core</span>
        </div>
      </div>

      {/* CENTER SECTION - ENGINE TOGGLE */}
      <div className="nexus-global-header-engine flex min-w-0 flex-wrap items-center justify-center gap-3">
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-slate-400">
          ENGINE_MODE:
        </span>
        
        <div className="flex min-w-0 bg-white">
          <button
            onClick={() => setEngineMode('cloud_ai')} // Default AI mode
            className={clsx(
              "font-mono text-[10px] font-bold tracking-widest px-3 py-1 border-2 border-black border-r-0 transition-colors uppercase whitespace-nowrap",
              isAI ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-100"
            )}
          >
            AI ENGINE
          </button>
          <button
            onClick={() => setEngineMode('algorithm')}
            className={clsx(
              "font-mono text-[10px] font-bold tracking-widest px-3 py-1 border-2 border-black transition-colors uppercase whitespace-nowrap",
              !isAI ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-100"
            )}
          >
            ALGORITHM
          </button>
        </div>

        {/* Dynamic sub-badge based on selected mode */}
        {isAI ? (
          <div className="flex min-w-0">
            <button
              onClick={() => setEngineMode('cloud_ai')}
              className={clsx(
                "font-mono text-[9px] font-bold tracking-widest px-2 py-1 border-2 border-black border-r-0 uppercase whitespace-nowrap",
                engineMode === 'cloud_ai' ? "bg-[var(--color-nexus-red)] text-white" : "bg-white text-slate-400"
              )}
            >
              ☁ {systemConfig.cloudProvider === 'gateway' ? 'CLOUD GATEWAY' : 'GEMINI CLOUD'}
            </button>
            <button
              onClick={() => setEngineMode('local_ai')}
              className={clsx(
                "font-mono text-[9px] font-bold tracking-widest px-2 py-1 border-2 border-black uppercase whitespace-nowrap",
                engineMode === 'local_ai' ? "bg-amber-600 text-white" : "bg-white text-slate-400"
              )}
            >
              ⬡ LOCAL OLLAMA
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 items-center border-2 border-slate-700 bg-slate-700 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-white">
            ⬡ RULE ENGINE v2.1
          </div>
        )}
      </div>

      {/* RIGHT SECTION */}
      <div className="nexus-global-header-actions flex min-w-0 flex-wrap items-center justify-end gap-3">
        <span className="shrink-0 whitespace-nowrap font-mono text-[10px] text-slate-500">
          SESSION: {formatTime(sessionTime)}
        </span>
        
        <div className="flex shrink-0 items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-600">
            CONNECTED
          </span>
        </div>

        <UserSessionControls variant="classic" />

        <button
          onClick={toggleTheme}
          className="inline-flex h-10 w-10 items-center justify-center border-2 border-black transition-colors hover:bg-slate-100"
          title={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkTheme ? (
            <Sun size={18} className="text-slate-800" />
          ) : (
            <Moon size={18} className="text-slate-800" />
          )}
        </button>

        <button 
          onClick={() => setConfigModalOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center border-2 border-black transition-colors hover:bg-slate-100"
          title="SYSTEM_CONFIG"
        >
          <Settings size={18} className="text-slate-800" />
        </button>
      </div>
    </header>
  );
}
