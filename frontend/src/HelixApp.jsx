import React, { useEffect, useRef, useState } from 'react';
import { useNexusStore } from './store/nexusStore';
import GlobalHeader from './components/layout/GlobalHeader';
import LeftPanel from './components/layout/LeftPanel';
import CenterPanel from './components/layout/CenterPanel';
import RightPanel from './components/layout/RightPanel';
import GlobalFooter from './components/layout/GlobalFooter';
import ModernShell from './components/layout/ModernShell';
import ConfigModal from './components/shared/ConfigModal';
import ErrorBoundary from './components/shared/ErrorBoundary';
import GlobalChatAssistant from './components/chat/GlobalChatAssistant';
import LocalAiRequirementModal from './components/shared/LocalAiRequirementModal';
import { useWebSocket } from './hooks/useWebSocket';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_THEME_ID, getThemeById } from './config/themes';
import { apiClient } from './api/client';
import { API } from './config/api';
import { buildAiRequestConfig } from './api/aiPayload';

function getIncompleteLocalAiStatus(systemConfig) {
  const missing = [];

  if (!systemConfig?.ollamaUrl?.trim()) {
    missing.push('Ollama URL');
  }

  if (!systemConfig?.localModel?.trim()) {
    missing.push('Local model name');
  }

  if (!missing.length) return null;

  const model = systemConfig?.localModel?.trim() || 'llama3';
  const ollamaUrl = systemConfig?.ollamaUrl?.trim() || 'http://localhost:11434';

  return {
    engine: 'local_ai',
    available: false,
    detail: 'Local AI configuration is incomplete',
    model,
    missing,
    required: [
      'Install and run Ollama',
      `Pull the configured model with: ollama pull ${model}`,
      `Confirm Ollama responds at: ${ollamaUrl}/api/tags`,
    ],
  };
}

function getLocalAiNoticeKey(status, systemConfig) {
  return [
    systemConfig?.ollamaUrl?.trim() || 'http://localhost:11434',
    systemConfig?.localModel?.trim() || 'llama3',
    status?.detail || '',
    ...(status?.missing || []),
  ].join('|');
}

function HelixApp() {
  const engineMode = useNexusStore((state) => state.engineMode);
  const setEngineMode = useNexusStore((state) => state.setEngineMode);
  const isConfigModalOpen = useNexusStore((state) => state.isConfigModalOpen);
  const setConfigModalOpen = useNexusStore((state) => state.setConfigModalOpen);
  const addEvent = useNexusStore((state) => state.addEvent);
  const setEngineStatus = useNexusStore((state) => state.setEngineStatus);
  const systemConfig = useNexusStore((state) => state.systemConfig);

  const layoutMode = systemConfig?.layoutMode || 'modern';
  const themeId = getThemeById(systemConfig?.themeId || DEFAULT_THEME_ID).id;
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [localAiNoticeStatus, setLocalAiNoticeStatus] = useState(null);
  const [dismissedLocalAiNoticeKey, setDismissedLocalAiNoticeKey] = useState('');
  const previousNonLocalEngineMode = useRef(engineMode === 'local_ai' ? 'algorithm' : engineMode);

  useWebSocket();

  useEffect(() => {
    document.body.dataset.nexusTheme = themeId;
    return () => {
      delete document.body.dataset.nexusTheme;
    };
  }, [themeId]);

  useEffect(() => {
    addEvent({
      type: 'EventType.SYSTEM_BOOT',
      timestamp: new Date().toISOString(),
      engine: 'system',
      detail: 'HL7 Core Initialized',
      severity: 'INFO',
    });
  }, [addEvent]);

  useEffect(() => {
    if (engineMode !== 'local_ai') {
      previousNonLocalEngineMode.current = engineMode;
    }
  }, [engineMode]);

  useEffect(() => {
    if (engineMode !== 'local_ai') {
      setLocalAiNoticeStatus(null);
      setDismissedLocalAiNoticeKey('');
      return undefined;
    }

    let cancelled = false;

    const showLocalAiNoticeIfNeeded = (status) => {
      if (cancelled) return;

      if (status?.available) {
        setLocalAiNoticeStatus(null);
        setDismissedLocalAiNoticeKey('');
        return;
      }

      const noticeKey = getLocalAiNoticeKey(status, systemConfig);
      if (noticeKey !== dismissedLocalAiNoticeKey) {
        setLocalAiNoticeStatus({ ...status, noticeKey });
      }
    };

    const checkLocalAiStatus = async () => {
      const incompleteStatus = getIncompleteLocalAiStatus(systemConfig);
      if (incompleteStatus) {
        setEngineStatus(incompleteStatus);
        showLocalAiNoticeIfNeeded(incompleteStatus);
        return;
      }

      try {
        const response = await apiClient.post(
          API.ENGINE_STATUS,
          buildAiRequestConfig('local_ai', systemConfig),
          { timeout: 8000 }
        );
        if (cancelled) return;
        setEngineStatus(response.data);
        showLocalAiNoticeIfNeeded(response.data);
      } catch (err) {
        const status = {
          engine: 'local_ai',
          available: false,
          detail: err.response?.data?.detail || err.message || 'Unable to verify Ollama Local',
          model: systemConfig?.localModel?.trim() || 'llama3',
          missing: ['Reachable Ollama server'],
          required: [
            'Install and run Ollama',
            `Pull the configured model with: ollama pull ${systemConfig?.localModel?.trim() || 'llama3'}`,
            `Confirm Ollama responds at: ${(systemConfig?.ollamaUrl?.trim() || 'http://localhost:11434')}/api/tags`,
          ],
        };
        if (cancelled) return;
        setEngineStatus(status);
        showLocalAiNoticeIfNeeded(status);
      }
    };

    checkLocalAiStatus();
    const timer = setInterval(checkLocalAiStatus, 30000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [dismissedLocalAiNoticeKey, engineMode, setEngineStatus, systemConfig]);

  const dismissLocalAiNotice = () => {
    if (localAiNoticeStatus?.noticeKey) {
      setDismissedLocalAiNoticeKey(localAiNoticeStatus.noticeKey);
    }
    setLocalAiNoticeStatus(null);
  };

  const closeLocalAiNotice = () => {
    dismissLocalAiNotice();
    setEngineMode(previousNonLocalEngineMode.current || 'algorithm');
  };

  const openLocalAiConfiguration = () => {
    dismissLocalAiNotice();
    setConfigModalOpen(true);
  };

  const useCloudAiEngine = () => {
    dismissLocalAiNotice();
    setEngineMode('cloud_ai');
  };

  const useAlgorithmEngine = () => {
    dismissLocalAiNotice();
    setEngineMode('algorithm');
  };

  return (
    <div
      className={`theme-${themeId} h-screen flex flex-col font-sans bg-[var(--color-nexus-bg)] text-[var(--color-nexus-dark)] overflow-hidden`}
    >
      {layoutMode === 'modern' ? (
        <ModernShell />
      ) : (
        <>
          <GlobalHeader />

          {layoutMode === 'classic' && (
            <main className="flex-1 flex flex-row px-4 pt-4 pb-2 gap-0 overflow-hidden relative min-h-0">
              <div className="w-[280px] flex-shrink-0 flex flex-col bg-white border border-gray-300 shadow-xl z-10 relative min-h-0">
                <LeftPanel />
              </div>
              <div className="flex-1 flex flex-col bg-white border-y border-gray-300 shadow-xl z-20 relative -mx-[1px] min-w-0 min-h-0">
                <CenterPanel />
              </div>
              <div className="w-[340px] flex-shrink-0 flex flex-col bg-white border border-gray-300 shadow-xl z-10 relative min-h-0">
                <RightPanel />
              </div>
            </main>
          )}

          {layoutMode === 'ide' && (
            <main className="flex-1 flex flex-row px-4 pt-4 pb-2 gap-0 overflow-hidden relative min-h-0">
              {leftOpen ? (
                <div className="w-[280px] flex-shrink-0 flex flex-col bg-white border border-gray-300 shadow-xl z-30 relative transition-all min-h-0">
                  <button
                    type="button"
                    onClick={() => setLeftOpen(false)}
                    className="absolute -right-3 top-1/2 w-6 h-12 bg-slate-900 text-white border-2 border-black flex items-center justify-center z-50 shadow-md hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <LeftPanel />
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  className="w-8 flex-shrink-0 flex flex-col bg-slate-900 border-r border-black items-center py-4 cursor-pointer hover:bg-slate-800 transition-colors z-30"
                  onClick={() => setLeftOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setLeftOpen(true);
                  }}
                >
                  <span className="text-white font-mono text-[10px] transform -rotate-90 whitespace-nowrap mt-20 tracking-widest">
                    /OPERATIONAL_STATUS/
                  </span>
                </div>
              )}

              <div className="flex-1 flex flex-col bg-white border-y border-gray-300 shadow-xl z-20 relative -mx-[1px] min-w-0">
                <CenterPanel />
              </div>

              {rightOpen ? (
                <div className="w-[340px] flex-shrink-0 flex flex-col bg-white border border-gray-300 shadow-xl z-30 relative transition-all min-h-0">
                  <button
                    type="button"
                    onClick={() => setRightOpen(false)}
                    className="absolute -left-3 top-1/2 w-6 h-12 bg-slate-900 text-white border-2 border-black flex items-center justify-center z-50 shadow-md hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <RightPanel />
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  className="w-8 flex-shrink-0 flex flex-col bg-[var(--color-nexus-red)] border-l border-black items-center py-4 cursor-pointer hover:bg-red-900 transition-colors z-30"
                  onClick={() => setRightOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setRightOpen(true);
                  }}
                >
                  <span className="text-white font-mono text-[10px] transform -rotate-90 whitespace-nowrap mt-16 tracking-widest">
                    /PARAMETERS/
                  </span>
                </div>
              )}
            </main>
          )}

          {layoutMode === 'unified' && (
            <main className="flex-1 flex flex-row px-4 pt-4 pb-2 gap-4 overflow-hidden">
              <div className="w-[320px] flex-shrink-0 flex flex-col space-y-4 pr-1 pb-2">
                <div className="flex-1 flex-shrink-0 border border-gray-300 shadow-lg bg-white relative min-h-0">
                  <LeftPanel />
                </div>
                <div className="flex-1 flex-shrink-0 border border-gray-300 shadow-lg bg-white relative min-h-0">
                  <RightPanel />
                </div>
              </div>
              <div className="flex-1 flex flex-col bg-white border border-gray-300 shadow-xl relative min-w-0">
                <CenterPanel />
              </div>
            </main>
          )}

          <GlobalFooter />
        </>
      )}

      <GlobalChatAssistant />

      {isConfigModalOpen && <ConfigModal />}
      {localAiNoticeStatus && !isConfigModalOpen && (
        <LocalAiRequirementModal
          status={localAiNoticeStatus}
          systemConfig={systemConfig}
          onClose={closeLocalAiNotice}
          onOpenConfig={openLocalAiConfiguration}
          onUseCloudAi={useCloudAiEngine}
          onUseAlgorithm={useAlgorithmEngine}
        />
      )}
    </div>
  );
}

export default function HelixAppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <HelixApp />
    </ErrorBoundary>
  );
}
