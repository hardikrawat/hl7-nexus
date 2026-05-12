import React, { useEffect, useState } from 'react';
import { useNexusStore } from './store/nexusStore';
import GlobalHeader from './components/layout/GlobalHeader';
import LeftPanel from './components/layout/LeftPanel';
import CenterPanel from './components/layout/CenterPanel';
import RightPanel from './components/layout/RightPanel';
import GlobalFooter from './components/layout/GlobalFooter';
import ModernShell from './components/layout/ModernShell';
import ConfigModal from './components/shared/ConfigModal';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { useWebSocket } from './hooks/useWebSocket';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_THEME_ID, getThemeById } from './config/themes';

function App() {
  const isConfigModalOpen = useNexusStore((state) => state.isConfigModalOpen);
  const addEvent = useNexusStore((state) => state.addEvent);
  const systemConfig = useNexusStore((state) => state.systemConfig);
  
  const layoutMode = systemConfig?.layoutMode || 'modern';
  const themeId = getThemeById(systemConfig?.themeId || DEFAULT_THEME_ID).id;
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  
  // Initialize WebSocket connection (uses centralized API config)
  useWebSocket();

  useEffect(() => {
    document.body.dataset.nexusTheme = themeId;
    return () => {
      delete document.body.dataset.nexusTheme;
    };
  }, [themeId]);

  useEffect(() => {
    // Initial boot event
    addEvent({
      type: 'EventType.SYSTEM_BOOT',
      timestamp: new Date().toISOString(),
      engine: 'system',
      detail: 'Helix System Core Initialized',
      severity: 'INFO'
    });
  }, [addEvent]);

  return (
    <div className={`theme-${themeId} h-screen flex flex-col font-sans bg-[var(--color-nexus-bg)] text-[var(--color-nexus-dark)] overflow-hidden`}>
      {layoutMode === 'modern' ? (
        <ModernShell />
      ) : (
        <>
          {/* Global Header */}
          <GlobalHeader />

          {/* Dynamic Layout Router */}
          {layoutMode === 'classic' && (
            <main className="flex-1 flex flex-row px-4 pt-4 pb-2 gap-0 overflow-hidden relative min-h-0">
              <div className="w-[280px] flex-shrink-0 flex flex-col bg-white border border-gray-300 shadow-xl z-10 relative min-h-0">
                <LeftPanel />
              </div>
              <div className="flex-1 flex flex-col bg-white border-y border-gray-300 shadow-xl z-20 relative -mx-[1px] min-w-0 min-h-0">
                <CenterPanel />
              </div>
              <div className="w-[300px] flex-shrink-0 flex flex-col bg-white border border-gray-300 shadow-xl z-10 relative min-h-0">
                <RightPanel />
              </div>
            </main>
          )}

          {layoutMode === 'ide' && (
            <main className="flex-1 flex flex-row px-4 pt-4 pb-2 gap-0 overflow-hidden relative min-h-0">
              {leftOpen ? (
                <div className="w-[280px] flex-shrink-0 flex flex-col bg-white border border-gray-300 shadow-xl z-30 relative transition-all min-h-0">
                  <button onClick={() => setLeftOpen(false)} className="absolute -right-3 top-1/2 w-6 h-12 bg-slate-900 text-white border-2 border-black flex items-center justify-center z-50 shadow-md hover:bg-slate-800 transition-colors"><ChevronLeft size={14}/></button>
                  <LeftPanel />
                </div>
              ) : (
                <div className="w-8 flex-shrink-0 flex flex-col bg-slate-900 border-r border-black items-center py-4 cursor-pointer hover:bg-slate-800 transition-colors z-30" onClick={() => setLeftOpen(true)}>
                  <span className="text-white font-mono text-[10px] transform -rotate-90 whitespace-nowrap mt-20 tracking-widest">/OPERATIONAL_STATUS/</span>
                </div>
              )}

              <div className="flex-1 flex flex-col bg-white border-y border-gray-300 shadow-xl z-20 relative -mx-[1px] min-w-0">
                <CenterPanel />
              </div>

              {rightOpen ? (
                <div className="w-[300px] flex-shrink-0 flex flex-col bg-white border border-gray-300 shadow-xl z-30 relative transition-all min-h-0">
                  <button onClick={() => setRightOpen(false)} className="absolute -left-3 top-1/2 w-6 h-12 bg-slate-900 text-white border-2 border-black flex items-center justify-center z-50 shadow-md hover:bg-slate-800 transition-colors"><ChevronRight size={14}/></button>
                  <RightPanel />
                </div>
              ) : (
                <div className="w-8 flex-shrink-0 flex flex-col bg-[var(--color-nexus-red)] border-l border-black items-center py-4 cursor-pointer hover:bg-red-900 transition-colors z-30" onClick={() => setRightOpen(true)}>
                  <span className="text-white font-mono text-[10px] transform -rotate-90 whitespace-nowrap mt-16 tracking-widest">/PARAMETERS/</span>
                </div>
              )}
            </main>
          )}

          {layoutMode === 'unified' && (
            <main className="flex-1 flex flex-row px-4 pt-4 pb-2 gap-4 overflow-hidden">
              {/* Left Column (Merged) */}
              <div className="w-[320px] flex-shrink-0 flex flex-col space-y-4 pr-1 pb-2">
                <div className="flex-1 flex-shrink-0 border border-gray-300 shadow-lg bg-white relative min-h-0">
                  <LeftPanel />
                </div>
                <div className="flex-1 flex-shrink-0 border border-gray-300 shadow-lg bg-white relative min-h-0">
                  <RightPanel />
                </div>
              </div>
              {/* Main Area */}
              <div className="flex-1 flex flex-col bg-white border border-gray-300 shadow-xl relative min-w-0">
                <CenterPanel />
              </div>
            </main>
          )}

          {/* Global Footer Controls */}
          <GlobalFooter />
        </>
      )}

      {/* System Config Modal */}
      {isConfigModalOpen && <ConfigModal />}
    </div>
  );
}

function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;
