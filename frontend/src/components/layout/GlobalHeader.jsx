import React, { useEffect, useState } from 'react';
import { Activity, Moon, Settings, Sun } from 'lucide-react';
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
    <header className="h-14 bg-white border-b-2 border-[var(--color-nexus-red)] flex items-center justify-between px-4 flex-shrink-0 relative z-50">
      
      {/* LEFT SECTION */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center gap-3">
          <div className="nexus-brand-logo flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-[var(--color-nexus-red)]">
            <Activity size={18} className="nexus-brand-logo-icon" />
          </div>
          <h1 className="nexus-brand-title text-xl font-bold font-mono tracking-wider text-[var(--color-nexus-red)] whitespace-nowrap">
            HELIX SYSTEM
          </h1>
        </div>
        <div className="hidden lg:flex items-center space-x-2 text-[9px] font-mono tracking-wider text-slate-500 uppercase border-l-2 border-slate-300 pl-4 h-6">
          <span>Enterprise HL7 Orchestration powered by the Nexus-Hybrid Core</span>
        </div>
      </div>

      {/* CENTER SECTION - ENGINE TOGGLE */}
      <div className="flex items-center space-x-4">
        <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400">
          ENGINE_MODE:
        </span>
        
        <div className="flex bg-white">
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
          <div className="flex">
            <button
              onClick={() => setEngineMode('cloud_ai')}
              className={clsx(
                "font-mono text-[9px] font-bold tracking-widest px-2 py-1 border-2 border-black border-r-0 uppercase whitespace-nowrap",
                engineMode === 'cloud_ai' ? "bg-[var(--color-nexus-red)] text-white" : "bg-white text-slate-400"
              )}
            >
              ☁ GEMINI CLOUD
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
          <div className="font-mono text-[9px] font-bold tracking-widest px-2 py-1 border-2 border-slate-700 bg-slate-700 text-white uppercase whitespace-nowrap flex items-center">
            ⬡ RULE ENGINE v2.1
          </div>
        )}
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center space-x-6 flex-shrink-0">
        <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap flex-shrink-0">
          SESSION: {formatTime(sessionTime)}
        </span>
        
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-600">
            CONNECTED
          </span>
        </div>

        <button
          onClick={toggleTheme}
          className="p-1.5 border-2 border-black hover:bg-slate-100 transition-colors"
          title={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkTheme ? (
            <Sun size={14} className="text-slate-800" />
          ) : (
            <Moon size={14} className="text-slate-800" />
          )}
        </button>

        <button 
          onClick={() => setConfigModalOpen(true)}
          className="p-1.5 border-2 border-black hover:bg-slate-100 transition-colors"
          title="SYSTEM_CONFIG"
        >
          <Settings size={14} className="text-slate-800" />
        </button>
      </div>
    </header>
  );
}
