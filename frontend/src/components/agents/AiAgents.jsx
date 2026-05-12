import React from 'react';
import { useNexusStore } from '../../store/nexusStore';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const AgentCard = ({ name, role, agentKey }) => {
  const agent = useNexusStore((state) => state.agents[agentKey]);
  const systemConfig = useNexusStore((state) => state.systemConfig);
  const isDark = systemConfig?.themeId === 'dark-console';
  
  const status = agent?.status || 'IDLE';
  const metrics = agent?.metrics || {};

  const isActive = status !== 'IDLE' && status !== 'COMPLETE' && status !== 'ERROR' && status !== 'ALERT' && status !== 'WARNING' && status !== 'PASS' && status !== 'CLEAR';
  const isError = status === 'ERROR' || status === 'ALERT' || status === 'WARNING';
  const isComplete = status === 'COMPLETE' || status === 'PASS' || status === 'CLEAR';

  const getCardStyles = () => {
    if (isDark) {
      if (isActive) return "bg-amber-950/20 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]";
      if (isError) return "bg-red-950/30 border-red-500/50";
      if (isComplete) return "bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]";
      return "bg-slate-900/40 border-slate-800";
    }
    if (isActive) return "bg-amber-50 animate-pulse border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]";
    if (isError) return "bg-red-50 border-red-500";
    if (isComplete) return "bg-emerald-50 border-emerald-500";
    return "bg-white border-black";
  };

  const getStatusTextColor = () => {
    if (isDark) {
      if (isActive) return "text-amber-400 animate-pulse";
      if (isError) return "text-red-400";
      if (isComplete) return "text-emerald-400";
      return "text-slate-500";
    }
    if (isActive) return "text-amber-700 animate-pulse";
    if (isError) return "text-red-700";
    if (isComplete) return "text-emerald-700";
    return "text-slate-500";
  };

  return (
    <div className={clsx(
      "border-2 flex flex-col relative overflow-hidden transition-all duration-300",
      getCardStyles()
    )}>
      {/* Header */}
      <div className={clsx(
        "flex justify-between items-center p-2 border-b",
        isDark ? "border-slate-800/50" : "border-gray-200"
      )}>
        <div className="flex items-center space-x-2">
          {isActive ? (
            <Loader2 size={12} className={clsx("animate-spin", isDark ? "text-amber-400" : "text-amber-700")} />
          ) : isError ? (
            <div className="w-2 h-2 rounded-full bg-red-500" />
          ) : isComplete ? (
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          ) : (
            <div className={clsx("w-2 h-2 rounded-full", isDark ? "bg-slate-700" : "bg-slate-300")} />
          )}
          <span className={clsx("font-mono text-[10px] font-bold uppercase truncate", isDark ? "text-slate-200" : "text-slate-800")} title={`/${name}/`}>
            /{name}/
          </span>
        </div>
        {isError && (
          <span className="font-mono text-[10px] font-bold text-red-500">!</span>
        )}
      </div>

      {/* Body */}
      <div className="p-2 flex-1 flex flex-col justify-between">
        <p className="font-mono text-[9px] uppercase font-bold mb-2">
          <span className={getStatusTextColor()}>
            {status}
          </span>
        </p>
        
        {/* Micro bars row */}
        <div className="flex justify-between items-end h-6 mt-1">
          {['OBS', 'ORI', 'DEC', 'RCL', 'GEN', 'OUT'].map((label, i) => (
            <div key={label} className="flex flex-col items-center justify-end h-full">
              <div className={clsx(
                "w-3 mb-1 transition-all duration-300",
                isActive ? (isDark ? "bg-amber-500/50" : "bg-black") : (isDark ? "bg-slate-800" : "bg-gray-300"),
              )} style={{ height: isActive ? `${Math.floor(Math.random() * 80 + 20)}%` : '20%' }} />
              <span className="font-mono text-[6px] uppercase tracking-widest text-slate-500 leading-none">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function AiAgents() {
  const engineMode = useNexusStore((state) => state.engineMode);
  const systemConfig = useNexusStore((state) => state.systemConfig);
  const isDark = systemConfig?.themeId === 'dark-console';

  return (
    <div className="flex flex-col space-y-3 h-full">
      {/* Header section */}
      <div className={clsx(
        "flex justify-between items-center border-b pb-1",
        isDark ? "border-slate-800" : "border-gray-300"
      )}>
        <span className={clsx(
          "text-[10px] font-mono uppercase tracking-widest",
          isDark ? "text-slate-500" : "text-slate-400"
        )}>
          // VALIDATION PIPELINE
        </span>
        <span className="text-[9px] font-mono text-[var(--color-nexus-red)] uppercase">
          FULL_MATRIX
        </span>
      </div>

      {/* 4 Rows of Agents */}
      <div className="flex flex-col space-y-3 mt-2">
        <AgentCard 
          name="SYNTAX VALIDATION" 
          role="Structural check" 
          agentKey="syntax" 
        />
        <AgentCard 
          name="SEMANTIC VALIDATION" 
          role="Clinical data check" 
          agentKey="semantic" 
        />
        <AgentCard 
          name="COMPLIANCE CHECK" 
          role="Standards audit" 
          agentKey="compliance" 
        />
        <div className={clsx(
          "border-2 flex flex-col justify-center items-center p-2 text-center",
          isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-black"
        )}>
          <span className={clsx("font-mono text-[10px] font-bold uppercase mb-1", isDark ? "text-slate-300" : "text-slate-800")}>
            /AI_ENGINE/
          </span>
          <span className="font-mono text-[8px] text-slate-500 uppercase">
            {engineMode === 'cloud_ai' ? 'Cloud API connected' : 'Ollama localhost'}
          </span>
        </div>
      </div>
    </div>
  );
}
