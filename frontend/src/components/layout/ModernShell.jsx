import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Clock,
  Cloud,
  Cpu,
  Download,
  Menu,
  Moon,
  Pause,
  Play,
  Server,
  Settings,
  Sun,
  Trash2,
  Wifi,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useNexusStore } from '../../store/nexusStore';
import CenterPanel from './CenterPanel';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import { DARK_THEME_ID, LIGHT_THEME_ID, getNextThemeId, getThemeById } from '../../config/themes';

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

function SegmentButton({ active, children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={clsx(
        'nexus-segment-button inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-sm px-3 text-[11px] font-bold uppercase tracking-wider transition',
        active ? 'nexus-segment-button--active' : 'nexus-segment-button--idle'
      )}
    >
      {children}
    </button>
  );
}

export default function ModernShell() {
  const engineMode = useNexusStore((state) => state.engineMode);
  const setEngineMode = useNexusStore((state) => state.setEngineMode);
  const setConfigModalOpen = useNexusStore((state) => state.setConfigModalOpen);
  const eventBus = useNexusStore((state) => state.eventBus);
  const isLogPaused = useNexusStore((state) => state.isLogPaused);
  const setLogPaused = useNexusStore((state) => state.setLogPaused);
  const clearEventBus = useNexusStore((state) => state.clearEventBus);
  const systemConfig = useNexusStore((state) => state.systemConfig);
  const updateSystemConfig = useNexusStore((state) => state.updateSystemConfig);

  const [sessionTime, setSessionTime] = useState(0);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('modern-ui');
    return () => document.body.classList.remove('modern-ui');
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setSessionTime((time) => time + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const latestEvent = eventBus[eventBus.length - 1];
  const isAI = engineMode === 'cloud_ai' || engineMode === 'local_ai';
  const themeId = getThemeById(systemConfig?.themeId || LIGHT_THEME_ID).id;
  const isDarkTheme = themeId === DARK_THEME_ID;

  const selectAiEngine = () => {
    if (!isAI) {
      setEngineMode('cloud_ai');
    }
  };

  const toggleTheme = () => {
    updateSystemConfig({ themeId: getNextThemeId(themeId) });
  };

  const handleExportLog = () => {
    const data = eventBus
      .map((event) => `[${event.timestamp}] [EventBus] ${event.type} -> ${event.detail}`)
      .join('\n');
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'helix-event-log.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modern-shell flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-950">
      <header className="grid grid-cols-[auto_1fr_auto] h-14 flex-shrink-0 items-center border-b-2 border-[var(--color-nexus-red)] bg-white px-5 relative z-50 gap-4">
        {/* Brand Section - Column 1 */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileLeftOpen((open) => !open)}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm border-2 border-black bg-white text-slate-600 lg:hidden"
          >
            {mobileLeftOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          <div className="flex items-center gap-3">
            <div className="nexus-brand-logo flex h-9 w-9 flex-shrink-0 items-center justify-center rounded border border-red-100 bg-red-50 text-[var(--color-nexus-red)]">
              <Activity size={18} className="nexus-brand-logo-icon" />
            </div>
            <h1 className="nexus-brand-title text-xl font-bold font-mono tracking-wider text-[var(--color-nexus-red)] whitespace-nowrap">
              HELIX SYSTEM
            </h1>
          </div>
        </div>

        {/* Spacer Column 2 (Header is now cleaner) */}
        <div className="hidden xl:block min-w-0" />

        {/* Controls Section - Column 3 (Right-Aligned) */}
        <div className="flex items-center gap-6 justify-end">
          {/* Engine Mode Group */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 whitespace-nowrap">
              ENGINE_MODE:
            </span>

            <div className="flex bg-white">
              <button
                onClick={selectAiEngine}
                className={clsx(
                  "w-[100px] font-mono text-[10px] font-bold tracking-widest px-2 py-1 border-2 border-black border-r-0 transition-colors uppercase whitespace-nowrap",
                  isAI ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-100"
                )}
              >
                AI ENGINE
              </button>
              <button
                onClick={() => setEngineMode('algorithm')}
                className={clsx(
                  "w-[100px] font-mono text-[10px] font-bold tracking-widest px-2 py-1 border-2 border-black transition-colors uppercase whitespace-nowrap",
                  !isAI ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-100"
                )}
              >
                ALGORITHM
              </button>
            </div>

            <div className="min-w-[210px] flex items-center">
              <AnimatePresence initial={false} mode="wait">
                {isAI ? (
                  <motion.div
                    key="ai-subtabs"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    className="flex"
                  >
                    <button
                      onClick={() => setEngineMode('cloud_ai')}
                      className={clsx(
                        "font-mono text-[9px] font-bold tracking-widest px-2 py-1 border-2 border-black border-r-0 uppercase whitespace-nowrap",
                        engineMode === 'cloud_ai' ? "bg-[var(--color-nexus-red)] text-white" : "bg-white text-slate-400"
                      )}
                    >
                      ☁ GEMINI
                    </button>
                    <button
                      onClick={() => setEngineMode('local_ai')}
                      className={clsx(
                        "font-mono text-[9px] font-bold tracking-widest px-2 py-1 border-2 border-black uppercase whitespace-nowrap",
                        engineMode === 'local_ai' ? "bg-amber-600 text-white" : "bg-white text-slate-400"
                      )}
                    >
                      ⬡ OLLAMA
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="algo-subtab"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    className="w-fit font-mono text-[9px] font-bold tracking-widest px-2 py-1 border-2 border-slate-700 bg-slate-700 text-white uppercase whitespace-nowrap flex items-center h-[26px]"
                  >
                    ⬡ RULE ENGINE v2.1
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* System Actions */}
          <div className="flex items-center space-x-4">
            <span className="hidden font-mono text-[10px] text-slate-500 whitespace-nowrap lg:block border-l border-slate-200 pl-4">
              {formatTime(sessionTime)}
            </span>
            
            <div className="hidden items-center space-x-2 sm:flex border-l border-slate-200 pl-4 h-6 w-32">
              <div className={clsx(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                latestEvent?.type.includes('ERROR') ? "bg-red-500" :
                latestEvent?.type.includes('WARNING') ? "bg-amber-500" :
                (latestEvent?.type.includes('START') || latestEvent?.type.includes('PROGRESS')) ? "bg-blue-500" :
                "bg-green-500"
              )} />
              <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-slate-400 truncate max-w-[100px]">
                {(() => {
                  if (!latestEvent) return 'SYSTEM READY';
                  const type = latestEvent.type.replace('EventType.', '');
                  const map = {
                    'USER_ACTION': 'OPERATOR REQ',
                    'FETCH_START': 'CONNECTING',
                    'FETCH_PROGRESS': 'STREAMING',
                    'FETCH_COMPLETE': 'DATA READY',
                    'ERROR': 'SYS_FAIL',
                    'COMPLETE': 'VERIFIED',
                    'PARSING': 'ANALYZING',
                    'GENERATING': 'SYNTHESIZING'
                  };
                  return map[type] || type.replace('_', ' ');
                })()}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                className="p-1.5 border-2 border-black bg-white hover:bg-slate-100 transition-colors"
              >
                {isDarkTheme ? <Sun size={12} /> : <Moon size={12} />}
              </button>
              <button
                onClick={() => setConfigModalOpen(true)}
                className="p-1.5 border-2 border-black bg-white hover:bg-slate-100 transition-colors"
              >
                <Settings size={12} />
              </button>
            </div>
          </div>
        </div>
      </header>


      <main className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4">
        <AnimatePresence initial={false}>
          {leftOpen && (
            <motion.aside
              initial={{ opacity: 0, width: 0, x: -20 }}
              animate={{ opacity: 1, width: 260, x: 0 }}
              exit={{ opacity: 0, width: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className="hidden min-h-0 flex-shrink-0 overflow-hidden lg:block"
            >
              <div className="h-full overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
                <LeftPanel />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <section className="modern-workbench min-w-0 flex-1 overflow-hidden border border-slate-200 bg-white shadow-sm">
          <CenterPanel />
        </section>

        <AnimatePresence initial={false}>
          {rightOpen && (
            <motion.aside
              initial={{ opacity: 0, width: 0, x: 20 }}
              animate={{ opacity: 1, width: 280, x: 0 }}
              exit={{ opacity: 0, width: 0, x: 20 }}
              transition={{ duration: 0.18 }}
              className="hidden min-h-0 flex-shrink-0 overflow-hidden xl:block"
            >
              <div className="h-full overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
                <RightPanel />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {mobileLeftOpen && (
          <motion.div
            className="fixed inset-0 z-[80] bg-slate-950/35 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.aside
              initial={{ x: -340 }}
              animate={{ x: 0 }}
              exit={{ x: -340 }}
              transition={{ duration: 0.18 }}
              className="h-full w-[min(340px,calc(100vw-32px))] border-r border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Pipeline
                </span>
                <button
                  onClick={() => setMobileLeftOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-slate-200 text-slate-500"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="h-[calc(100%-48px)] overflow-hidden">
                <LeftPanel />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileRightOpen && (
          <motion.div
            className="fixed inset-0 z-[80] bg-slate-950/35 backdrop-blur-sm xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.aside
              initial={{ x: 360 }}
              animate={{ x: 0 }}
              exit={{ x: 360 }}
              transition={{ duration: 0.18 }}
              className="ml-auto h-full w-[min(360px,calc(100vw-32px))] border-l border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Inspector
                </span>
                <button
                  onClick={() => setMobileRightOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-slate-200 text-slate-500"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="h-[calc(100%-48px)] overflow-hidden">
                <RightPanel />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="modern-status-strip flex-shrink-0 border-t border-slate-200 bg-white">
        <div className="flex h-11 items-center px-4">
          {/* Left Status */}
          <div className="flex-1 flex items-center gap-3">
            <span className="rounded-sm bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              {engineMode.replace('_', ' ')}
            </span>
          </div>

          {/* Center Tagline */}
          <div className="hidden md:flex items-center justify-center flex-[2] overflow-hidden px-4">
            <span className="text-[9px] font-mono tracking-wider text-slate-400 uppercase truncate">
              Enterprise HL7 Orchestration powered by the Nexus-Hybrid Core
            </span>
          </div>

          {/* Right Actions */}
          <div className="flex-1 flex items-center justify-end gap-2 text-[11px] font-medium text-slate-500">
            <span>{isLogPaused ? 'Log paused' : 'Log live'}</span>
            <span className="hidden sm:inline">{eventBus.length} events</span>
            <div className="flex items-center gap-1.5 ml-2">
              <button
                onClick={() => setLogPaused(!isLogPaused)}
                className="inline-flex h-7 items-center gap-1 rounded-sm border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                {isLogPaused ? <Play size={12} /> : <Pause size={12} />}
                <span className="hidden lg:inline">{isLogPaused ? 'Resume' : 'Pause'}</span>
              </button>
              <button
                onClick={clearEventBus}
                className="inline-flex h-7 items-center gap-1 rounded-sm border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Trash2 size={12} />
                <span className="hidden lg:inline">Clear</span>
              </button>
              <button
                onClick={handleExportLog}
                disabled={eventBus.length === 0}
                className="inline-flex h-7 items-center gap-1 rounded-sm border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                <Download size={12} />
                <span className="hidden lg:inline">Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
