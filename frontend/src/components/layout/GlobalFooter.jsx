import React from 'react';
import { useNexusStore } from '../../store/nexusStore';
import clsx from 'clsx';
import { Download } from 'lucide-react';

export default function GlobalFooter() {
  const isLogPaused = useNexusStore((state) => state.isLogPaused);
  const setLogPaused = useNexusStore((state) => state.setLogPaused);
  const clearEventBus = useNexusStore((state) => state.clearEventBus);
  const eventBus = useNexusStore((state) => state.eventBus);
  const engineMode = useNexusStore((state) => state.engineMode);

  const handleDownload = (type) => {
    const data = eventBus.map(e => `[${e.timestamp}] [EventBus] ${e.type} -> ${e.detail}`).join('\n');
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'exe' ? 'DOWNLOAD_LOG.EXE.txt' : 'NEXUS_CHAT_EXPORT.TXT';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-shrink-0 h-[32px] bg-slate-200 border-t-2 border-black flex justify-between items-center px-4">
      
      {/* Left side: System Controls */}
      <div className="flex items-center space-x-3">
        <span className="font-mono text-[10px] font-bold text-slate-800 uppercase tracking-widest mr-2">
          System event log
        </span>
        <button onClick={() => setLogPaused(true)} className={clsx("border border-black px-2 py-0.5 font-mono text-[9px] uppercase transition-colors", isLogPaused ? "bg-black text-white" : "bg-white text-black hover:bg-gray-300")}>PAUSE</button>
        <button onClick={() => setLogPaused(false)} className={clsx("border border-black px-2 py-0.5 font-mono text-[9px] uppercase transition-colors", !isLogPaused ? "bg-black text-white" : "bg-white text-black hover:bg-gray-300")}>RESUME</button>
        <button onClick={() => clearEventBus()} className="border border-black px-2 py-0.5 font-mono text-[9px] uppercase bg-white text-black hover:bg-gray-300 transition-colors">CLEAR</button>
        <button onClick={() => handleDownload('txt')} className="border border-black px-2 py-0.5 font-mono text-[9px] uppercase bg-white text-black hover:bg-gray-300 transition-colors">EXPORT LOG</button>
        <span className="font-mono text-[9px] text-slate-500 ml-2">
          — {isLogPaused ? 'PAUSED' : eventBus.length > 0 ? 'BUSY' : 'IDLE'}
        </span>
      </div>

      {/* Right side: System Metrics */}
      <div className="flex items-center space-x-4">
        <button onClick={() => handleDownload('exe')} className="flex items-center space-x-1 font-mono text-[9px] uppercase hover:text-black text-slate-600 transition-colors">
          <Download size={10} /> <span>[DOWNLOAD_LOG.EXE]</span>
        </button>
        <span className="font-mono text-[9px] text-slate-600">MEM: 64.2 MB OK</span>
        <span className="font-mono text-[9px] uppercase px-2 py-0.5 bg-slate-800 text-white border border-black">
          {engineMode}
        </span>
        <span className="font-mono text-[9px] text-slate-600">UPTIME: 10715</span>
        <span className="font-mono text-[9px] text-slate-800 font-bold">BUFFER: {eventBus.length} B</span>
      </div>
    </div>
  );
}
