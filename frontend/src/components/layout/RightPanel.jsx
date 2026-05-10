import React, { useEffect, useRef, useState } from 'react';
import { useNexusStore } from '../../store/nexusStore';
import clsx from 'clsx';

const LogEntry = ({ ev, time, isAIEvent }) => {
  const [displayedDetail, setDisplayedDetail] = useState('');
  
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
    <div className="flex flex-col pb-2 mb-2 border-b border-slate-800 leading-tight last:border-0">
      <div className="flex space-x-1.5 items-center">
        <span className="text-slate-500 flex-shrink-0">[{time}]</span>
        <span className={clsx(
          "font-bold truncate",
          isAIEvent ? "text-[var(--color-nexus-red)]" : "text-green-400"
        )}>
          {ev.type}
        </span>
      </div>
      <span className={clsx(
        "pl-14 break-words",
        ev.severity === 'ERROR' ? "text-red-500 font-bold" : "text-slate-300"
      )}>
        → {displayedDetail}
        {displayedDetail.length < ev.detail.length && (
          <span className="inline-block w-1.5 h-2.5 bg-slate-400 ml-1 animate-pulse translate-y-0.5"></span>
        )}
      </span>
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
    <div className="flex flex-col h-full bg-white relative min-h-0">
      <div className="bg-slate-900 px-3 py-2 border-b-2 border-[var(--color-nexus-red)] flex justify-between items-center flex-shrink-0">
        <h2 className="font-mono text-[11px] font-bold tracking-widest text-white flex items-center">
          PROCESSING PARAMETERS
        </h2>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[9px] text-cyan-400 font-mono uppercase">Session_Sync</span>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col space-y-6 min-h-0">
        
        {/* LINK_MONITOR */}
        <div className="flex flex-col space-y-2">
          <span className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-gray-200 pb-1">
            {isAI ? '// NEURAL_LINK_MONITOR' : '// RULE_ENGINE_MONITOR'}
          </span>
          <div className={clsx(
            "border-2 p-3 flex flex-col space-y-2",
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
                <div className="border-2 border-amber-600 bg-amber-50 text-amber-700 font-mono text-[10px] uppercase font-bold text-center py-2 mb-2 animate-pulse">
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
            <span className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              // SYSTEM EVENT LOG
            </span>
            <span className={clsx("font-mono text-[8px] uppercase", isLogPaused ? "text-red-500" : "text-slate-400 animate-pulse")}>
              {isLogPaused ? 'PAUSED' : 'LIVE'}
            </span>
          </div>
          <div 
            ref={scrollRef}
            className="border-2 border-black bg-slate-900 flex-1 p-3 overflow-y-auto"
          >
            <div className="font-mono text-[9px] text-slate-300 flex flex-col">
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
