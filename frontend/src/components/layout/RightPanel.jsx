import React, { useEffect, useRef, useState } from 'react';
import { useNexusStore } from '../../store/nexusStore';
import clsx from 'clsx';

const getEventTone = (ev) => {
  const signal = `${ev.severity || ''} ${ev.type || ''} ${ev.detail || ''}`.toUpperCase();

  if (/ERROR|FAILED|FAIL|FAULT|INVALID|DISCONNECTED/.test(signal)) {
    return 'error';
  }

  if (/WARN|RECONNECT|RETRY/.test(signal)) {
    return 'warning';
  }

  if (/SUCCESS|COMPLETE|CONNECTED|SAVED|PASS|BOOT|ESTABLISHED|READY/.test(signal)) {
    return 'success';
  }

  return 'info';
};

const logToneStyles = {
  error: 'event-log-row--error',
  success: 'event-log-row--success',
  warning: 'event-log-row--warning',
  info: 'event-log-row--info',
};

const LogEntry = ({ ev, time, isAIEvent }) => {
  const [displayedDetail, setDisplayedDetail] = useState('');
  const tone = getEventTone(ev);
  
  useEffect(() => {
    // If event is older than 1 second, it was pre-loaded. Skip animation to save performance.
    const isOld = ev.timestamp && (Date.now() - new Date(ev.timestamp).getTime() > 1000);
    
    if (isOld) {
      setDisplayedDetail(ev.detail);
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      setDisplayedDetail(ev.detail.slice(0, i));
      i += 2; // print 2 chars at a time for speed
      if (i > ev.detail.length + 1) {
        clearInterval(interval);
        setDisplayedDetail(ev.detail);
      }
    }, 15);
    return () => clearInterval(interval);
  }, [ev.detail, ev.timestamp]);

  return (
    <div className={clsx('event-log-row mb-1.5 grid grid-cols-[56px_minmax(0,1fr)] gap-x-2 rounded-md border-l-2 px-2.5 py-1.5 leading-tight last:mb-0', logToneStyles[tone])}>
      <span className="event-log-time flex-shrink-0 pt-0.5">{time}</span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className={clsx(
            "event-log-type min-w-0 truncate font-bold",
            isAIEvent && tone === 'info' ? "event-log-type--ai" : null
          )}>
            {ev.type.replace('EventType.', '')}
          </span>
        </div>
        <span className={clsx(
          "event-log-detail mt-0.5 block break-words",
          ev.severity === 'ERROR' ? "font-bold" : null
        )}>
          {displayedDetail}
          {displayedDetail.length < ev.detail.length && (
            <span className="event-log-cursor inline-block h-2.5 w-1.5 translate-y-0.5 animate-pulse ml-1"></span>
          )}
        </span>
      </div>
    </div>
  );
};

export default function RightPanel() {
  const engineMode = useNexusStore((state) => state.engineMode);
  const isAI = engineMode === 'cloud_ai' || engineMode === 'local_ai';
  const systemConfig = useNexusStore((state) => state.systemConfig);
  
  const eventBus = useNexusStore((state) => state.eventBus);
  const isLogPaused = useNexusStore((state) => state.isLogPaused);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  const [displayedEvents, setDisplayedEvents] = useState([]);

  useEffect(() => {
    if (!isLogPaused) {
      setDisplayedEvents(eventBus);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [eventBus, isLogPaused]);

  return (
    <div className="nexus-panel-shell nexus-right-panel flex flex-col h-full bg-white relative min-h-0">
      <div className="nexus-panel-top bg-slate-900 px-3 py-2 border-b-2 border-[var(--color-nexus-red)] flex justify-between items-center flex-shrink-0">
        <h2 className="font-mono text-[11px] font-bold tracking-widest text-white flex items-center">
          PROCESSING PARAMETERS
        </h2>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[9px] text-cyan-400 font-mono uppercase">Session_Sync</span>
        </div>
      </div>
      <div className="nexus-panel-body p-4 flex-1 flex flex-col space-y-6 min-h-0 overflow-hidden">
        
        {/* LINK_MONITOR */}
        <div className="flex flex-col space-y-2">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.16em] border-b border-gray-200 pb-1">
            {isAI ? 'Neural link monitor' : 'Rule engine monitor'}
          </span>
          <div className={clsx(
            "nexus-monitor-card border-2 p-3 flex flex-col space-y-2",
            isAI ? "border-[var(--color-nexus-red)] bg-red-50" : "border-slate-800 bg-slate-50"
          )}>
            {isAI ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-bold">STATUS</span>
                  <span className="font-mono text-[9px] font-bold uppercase text-green-600">
                    ESTABLISHED
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[9px] font-bold text-slate-800">PROVIDER</span>
                  <span className="font-mono text-[9px] font-bold uppercase">
                    {engineMode === 'cloud_ai' ? 'GEMINI_CLOUD' : 'OLLAMA_LOCAL'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[9px] font-bold text-slate-800">MODEL</span>
                  <span className="font-mono text-[9px] font-bold uppercase text-blue-800 truncate w-24 text-right">
                    {engineMode === 'cloud_ai' ? systemConfig.activeModel : 'llama3'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[9px] font-bold text-slate-800">LATENCY</span>
                  <span className="font-mono text-[9px] font-bold uppercase">
                    {engineMode === 'cloud_ai' ? '124ms' : '12ms'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="nexus-zero-ai-banner border-2 border-amber-600 bg-amber-50 text-amber-700 font-mono text-[10px] uppercase font-bold text-center py-2 mb-2 animate-pulse">
                  ZERO AI DEPENDENCIES
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[9px] font-bold text-slate-800">ENGINE_VER</span>
                  <span className="font-mono text-[9px] font-bold uppercase text-slate-600">NEXUS_ALGO v2.1</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[9px] font-bold text-slate-800">RULES_LOADED</span>
                  <span className="font-mono text-[9px] font-bold uppercase">1,240</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[9px] font-bold text-slate-800">INTERNET_REQ</span>
                  <span className="font-mono text-[9px] font-bold uppercase text-slate-600">NONE</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SYSTEM EVENT LOG */}
        <div className="flex flex-col space-y-2 flex-1 min-h-0">
          <div className="flex justify-between items-end border-b border-gray-200 pb-1 flex-shrink-0">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.16em]">
              System event log
            </span>
            <span className={clsx("font-mono text-[8px] uppercase", isLogPaused ? "text-red-500" : "text-slate-400 animate-pulse")}>
              {isLogPaused ? 'PAUSED' : 'LIVE'}
            </span>
          </div>
          <div 
            ref={scrollRef}
            className="event-log-block flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-xl border p-2.5"
          >
            <div className="font-mono text-[9px] flex flex-col">
              {displayedEvents.map((ev, i) => {
                const time = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString('en-US', { hour12: false }) : '00:00:00';
                const isAIEvent = ev.engine === 'cloud_ai' || ev.engine === 'local_ai';
                return <LogEntry key={i} ev={ev} time={time} isAIEvent={isAIEvent} />;
              })}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
