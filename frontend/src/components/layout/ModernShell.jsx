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
import UserSessionControls from '../auth/UserSessionControls';
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
        'nexus-segment-button inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md px-3 text-[11px] font-bold uppercase tracking-wider transition',
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
    <div className="modern-shell nexus-orbital-shell flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-950">
      <div className="nexus-orbital-glow nexus-orbital-glow--one" aria-hidden="true" />
      <div className="nexus-orbital-glow nexus-orbital-glow--two" aria-hidden="true" />
      <header className="nexus-shell-header flex h-[76px] flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm">
        <div className="flex min-w-0 flex-shrink-0 items-center gap-4">
          <button
            onClick={() => setMobileLeftOpen((open) => !open)}
            className="nexus-icon-button inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
            title="Toggle pipeline"
          >
            {mobileLeftOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="nexus-brand-cluster flex min-w-0 items-center gap-3">
            <div className="nexus-brand-logo flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-[var(--color-nexus-red)]">
              <Activity size={19} className="nexus-brand-logo-icon" />
            </div>
            <div className="min-w-0 max-w-[210px]">
              <div className="flex items-baseline gap-2">
                <h1 className="nexus-brand-title truncate text-lg font-semibold tracking-tight text-slate-950">
                  Helix System
                </h1>
                <span className="hidden text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 xl:inline">
                  Nexus
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                  HL7 v2.5.1
                </span>
                <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                  FHIR R4
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="nexus-topology hidden min-w-0 items-center gap-2 md:flex">
          <div className="hidden whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400 xl:block">
            Engine Mode
          </div>

          <div className="nexus-engine-tabs flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
            <SegmentButton active={isAI} onClick={selectAiEngine} title="Use AI Engine">
              <Cloud size={13} />
              AI Engine
            </SegmentButton>
            <SegmentButton
              active={engineMode === 'algorithm'}
              onClick={() => setEngineMode('algorithm')}
              title="Use Algorithm Engine"
            >
              <Cpu size={13} />
              Algorithm
            </SegmentButton>
          </div>

          <AnimatePresence initial={false} mode="wait">
            {isAI ? (
              <motion.div
                key="ai-subtabs"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="nexus-engine-tabs nexus-engine-subtabs flex items-center gap-2 rounded-xl border p-1"
              >
                <SegmentButton
                  active={engineMode === 'cloud_ai'}
                  onClick={() => setEngineMode('cloud_ai')}
                  title="Use Gemini Cloud AI"
                >
                  <Cloud size={13} />
                  Cloud AI
                </SegmentButton>
                <SegmentButton
                  active={engineMode === 'local_ai'}
                  onClick={() => setEngineMode('local_ai')}
                  title="Use local Ollama AI"
                >
                  <Server size={13} />
                  Local AI
                </SegmentButton>
              </motion.div>
            ) : (
              <motion.div
                key="algo-subtab"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="nexus-engine-badge inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-xl border px-3 text-[11px] font-bold uppercase tracking-wider"
              >
                <Cpu size={13} />
                Rule Engine v2.1
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="nexus-header-actions flex flex-shrink-0 items-center gap-3">
          <div className="nexus-status-pill hidden items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:flex">
            <Wifi size={14} />
            Connected
          </div>
          <div className="nexus-time-pill hidden items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600 lg:flex">
            <Clock size={14} />
            {formatTime(sessionTime)}
          </div>
          <button
            onClick={() => {
              if (window.matchMedia('(min-width: 1280px)').matches) {
                setRightOpen((open) => !open);
              } else {
                setMobileRightOpen(true);
              }
            }}
            className="nexus-inspector-toggle inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Inspector
          </button>
          <UserSessionControls variant="modern" />

          <button
            onClick={toggleTheme}
            className="nexus-icon-button inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
            title={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkTheme ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            onClick={() => setConfigModalOpen(true)}
            className="nexus-icon-button inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
            title="System configuration"
          >
            <Settings size={17} />
          </button>
        </div>
      </header>

      <main className="nexus-shell-main flex min-h-0 flex-1 gap-4 overflow-hidden p-4">
        <AnimatePresence initial={false}>
          {leftOpen && (
            <motion.aside
              initial={{ opacity: 0, width: 0, x: -20 }}
              animate={{ opacity: 1, width: 304, x: 0 }}
              exit={{ opacity: 0, width: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className="hidden min-h-0 flex-shrink-0 overflow-hidden lg:block"
            >
              <div className="nexus-side-frame nexus-side-frame--left h-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <LeftPanel />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <section className="modern-workbench nexus-workbench-frame min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <CenterPanel />
        </section>

        <AnimatePresence initial={false}>
          {rightOpen && (
            <motion.aside
              initial={{ opacity: 0, width: 0, x: 20 }}
              animate={{ opacity: 1, width: 336, x: 0 }}
              exit={{ opacity: 0, width: 0, x: 20 }}
              transition={{ duration: 0.18 }}
              className="hidden min-h-0 flex-shrink-0 overflow-hidden xl:block"
            >
              <div className="nexus-side-frame nexus-side-frame--right h-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <RightPanel />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {mobileLeftOpen && (
          <motion.div
            className="nexus-mobile-scrim fixed inset-0 z-[80] bg-slate-950/35 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.aside
              initial={{ x: -340 }}
              animate={{ x: 0 }}
              exit={{ x: -340 }}
              transition={{ duration: 0.18 }}
              className="nexus-mobile-drawer h-full w-[min(340px,calc(100vw-32px))] border-r border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Pipeline
                </span>
                <button
                  onClick={() => setMobileLeftOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500"
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
            className="nexus-mobile-scrim fixed inset-0 z-[80] bg-slate-950/35 backdrop-blur-sm xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.aside
              initial={{ x: 360 }}
              animate={{ x: 0 }}
              exit={{ x: 360 }}
              transition={{ duration: 0.18 }}
              className="nexus-mobile-drawer ml-auto h-full w-[min(360px,calc(100vw-32px))] border-l border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Inspector
                </span>
                <button
                  onClick={() => setMobileRightOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500"
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
        <div className="flex h-11 items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              {engineMode.replace('_', ' ')}
            </span>
            <span className="truncate text-xs text-slate-500">
              {latestEvent ? latestEvent.detail : 'Helix workspace ready'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <span>{isLogPaused ? 'Log paused' : 'Log live'}</span>
            <span>{eventBus.length} events</span>
            <button
              onClick={() => setLogPaused(!isLogPaused)}
              className="nexus-status-action inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              {isLogPaused ? <Play size={12} /> : <Pause size={12} />}
              {isLogPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={clearEventBus}
              className="nexus-status-action inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Trash2 size={12} />
              Clear
            </button>
            <button
              onClick={handleExportLog}
              disabled={eventBus.length === 0}
              className="nexus-status-action inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <Download size={12} />
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
