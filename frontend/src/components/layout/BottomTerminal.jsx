import React, { useEffect, useRef, useState } from 'react';
import { useNexusStore } from '../../store/nexusStore';
import clsx from 'clsx';
import { Download } from 'lucide-react';

export default function BottomTerminal() {
  const eventBus = useNexusStore((state) => state.eventBus);
  const engineMode = useNexusStore((state) => state.engineMode);
  const clearEventBus = useNexusStore((state) => state.clearEventBus);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  const [isPaused, setIsPaused] = useState(false);
  const [displayedEvents, setDisplayedEvents] = useState([]);

  useEffect(() => {
    if (!isPaused) {
      setDisplayedEvents(eventBus);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [eventBus, isPaused]);

  const handleDownload = (type) => {
    const data = displayedEvents.map(e => `[${e.timestamp}] [EventBus] ${e.type} -> ${e.detail}`).join('\n');
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'exe' ? 'DOWNLOAD_LOG.EXE.txt' : 'NEXUS_CHAT_EXPORT.TXT';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full bg-gray-200 border-t-2 border-black flex flex-col relative">
      {/* Header */}
      <div className="bg-gray-100 px-3 py-1.5 border-b border-black flex justify-between items-center">
        <span className="font-mono text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          System event log
        </span>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-1">
            <button onClick={() => setIsPaused(true)} className={clsx("border border-black px-2 py-0.5 font-mono text-[9px] uppercase", isPaused ? "bg-black text-white" : "bg-white text-black hover:bg-gray-200")}>PAUSE</button>
            <button onClick={() => setIsPaused(false)} className={clsx("border border-black px-2 py-0.5 font-mono text-[9px] uppercase", !isPaused ? "bg-black text-white" : "bg-white text-black hover:bg-gray-200")}>RESUME</button>
            <button onClick={() => clearEventBus()} className="border border-black px-2 py-0.5 font-mono text-[9px] uppercase bg-white text-black hover:bg-gray-200">CLEAR</button>
            <button onClick={() => handleDownload('txt')} className="border border-black px-2 py-0.5 font-mono text-[9px] uppercase bg-white text-black hover:bg-gray-200">EXPORT LOG</button>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            — {isPaused ? 'PAUSED' : eventBus.length > 0 ? 'BUSY' : 'IDLE'}
          </span>
        </div>
      </div>

      {/* Terminal Body */}
      <div 
        ref={scrollRef}
        className="flex-1 bg-gray-100 border-2 border-black mx-4 my-2 overflow-y-auto p-2"
      >
        <div className="font-mono text-[11px] space-y-1">
          {displayedEvents.map((ev, i) => {
            const time = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString('en-US', { hour12: false }) : '00:00:00';
            const isAIEvent = ev.engine === 'cloud_ai' || ev.engine === 'local_ai';
            return (
              <div key={i} className="flex">
                <span className="text-slate-400 w-20 flex-shrink-0">[{time}]</span>
                <span className="text-slate-600 mr-2 flex-shrink-0">[EventBus]</span>
                <span className={clsx(
                  "mr-2 font-bold flex-shrink-0",
                  isAIEvent ? "text-[var(--color-nexus-red)]" : "text-slate-700"
                )}>
                  {ev.type}
                </span>
                <span className={clsx(
                  "break-all",
                  ev.severity === 'ERROR' ? "text-red-600 font-bold" : "text-slate-800"
                )}>
                  → {ev.detail}
                </span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="flex justify-between items-center px-4 py-1 border-t border-gray-300 bg-gray-200">
        <div className="flex items-center space-x-4">
          <span className="font-mono text-[9px] text-slate-500">MEM: 64.2 MB OK</span>
          <button onClick={() => handleDownload('exe')} className="flex items-center space-x-1 font-mono text-[9px] uppercase hover:text-black text-slate-500">
            <Download size={10} /> <span>[DOWNLOAD_LOG.EXE]</span>
          </button>
          <button onClick={() => handleDownload('txt')} className="flex items-center space-x-1 font-mono text-[9px] uppercase hover:text-black text-slate-500">
            <Download size={10} /> <span>[EXPORT CHAT TO .TXT]</span>
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <span className="font-mono text-[9px] uppercase px-2 py-0.5 bg-slate-800 text-white border border-black">
            {engineMode}
          </span>
          <span className="font-mono text-[9px] text-slate-500">UPTIME: 10715</span>
          <span className="font-mono text-[9px] text-slate-800">BUFFER_SIZE: {displayedEvents.length} B</span>
        </div>
      </div>
    </div>
  );
}
