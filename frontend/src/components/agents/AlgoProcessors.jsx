import React from 'react';
import { useNexusStore } from '../../store/nexusStore';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const ProcessorCard = ({ name, role, processorKey }) => {
  const processor = useNexusStore((state) => state.processors[processorKey]);
  const systemConfig = useNexusStore((state) => state.systemConfig);
  const isDark = systemConfig?.themeId === 'dark-console';
  
  const status = processor?.status || 'IDLE';
  const metrics = processor?.metrics || {};

  const isActive = status !== 'IDLE' && status !== 'COMPLETE' && status !== 'ERROR';
  const isError = status === 'ERROR';
  const isComplete = status === 'COMPLETE';

  // Dynamic Styles based on Theme and Status
  const getCardStyles = () => {
    if (isDark) {
      if (isActive) return "bg-blue-950/30 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]";
      if (isError) return "bg-red-950/30 border-red-500/50";
      if (isComplete) return "bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]";
      return "bg-slate-900/40 border-slate-800";
    }
    // Light Mode (Legacy)
    if (isActive) return "bg-blue-50 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]";
    if (isError) return "bg-red-50 border-red-500";
    if (isComplete) return "bg-emerald-50 border-emerald-500";
    return "bg-white border-black";
  };

  const getStatusTextColor = () => {
    if (isDark) {
      if (isActive) return "text-blue-400 animate-pulse";
      if (isError) return "text-red-400";
      if (isComplete) return "text-emerald-400";
      return "text-slate-500";
    }
    if (isActive) return "text-blue-600 animate-pulse";
    if (isError) return "text-red-600";
    if (isComplete) return "text-emerald-700";
    return "text-slate-400";
  };

  const getLabelColor = () => isDark ? "text-slate-300" : "text-slate-800";
  const getMutedColor = () => isDark ? "text-slate-500" : "text-slate-400";
  const getMetricsValueColor = () => isDark ? "text-slate-200" : "text-slate-700";

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
            <Loader2 size={12} className={clsx("animate-spin", isDark ? "text-blue-400" : "text-blue-600")} />
          ) : isError ? (
            <div className="w-2 h-2 rounded-full bg-red-500" />
          ) : isComplete ? (
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          ) : (
            <div className={clsx("w-2 h-2 rounded-full", isDark ? "bg-slate-700" : "bg-slate-300")} />
          )}
          <span className={clsx("font-mono text-[10px] font-bold uppercase truncate", getLabelColor())} title={`/${name}/`}>
            /{name}/
          </span>
        </div>
        <span className={clsx("font-mono text-[9px] uppercase font-bold", getStatusTextColor())}>
          {status}
        </span>
      </div>

      {/* Body */}
      <div className="p-2 flex-1 flex flex-col justify-between">
        <p className={clsx("font-mono text-[9px] uppercase font-bold leading-tight mb-2", isDark ? "text-slate-400" : "text-slate-500")}>
          {role}
        </p>
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {Object.entries(metrics).map(([key, val]) => (
            <div key={key} className="flex justify-between items-center">
              <span className={clsx("font-mono text-[8px] uppercase tracking-widest", getMutedColor())}>
                {key.substring(0, 5)}:
              </span>
              <span className={clsx("font-mono text-[9px] font-bold", getMetricsValueColor())}>
                {val}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className={clsx("h-1 w-full flex", isDark ? "bg-slate-800" : "bg-slate-100")}>
        <div className={clsx(
          "h-full transition-all duration-[800ms] ease-in-out",
          isActive ? "w-full bg-blue-500 animate-pulse" : isComplete ? "w-full bg-emerald-500" : "w-0 bg-transparent"
        )} />
      </div>
    </div>
  );
};

export default function AlgoProcessors() {
  const eventBus = useNexusStore((state) => state.eventBus);
  const systemConfig = useNexusStore((state) => state.systemConfig);
  const isDark = systemConfig?.themeId === 'dark-console';
  
  const isFetching = eventBus.some(e => e.type === 'EventType.FETCH_PROGRESS' || e.type === 'EventType.FETCH_START');
  const isFetchComplete = eventBus.some(e => e.type === 'EventType.FETCH_COMPLETE');

  return (
    <div className="flex flex-col space-y-3 h-full">
      {/* Header section with real-time fetcher visibility */}
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
        <div className="flex items-center space-x-2">
          {isFetching && !isFetchComplete && (
            <Loader2 size={12} className="animate-spin text-[var(--color-nexus-red)]" />
          )}
          <span className={clsx(
            "text-[9px] font-mono",
            isDark ? "text-slate-500" : "text-slate-500"
          )}>
            {isFetching && !isFetchComplete ? 'FETCHING_DATA...' : 'RULE_ENGINE'}
          </span>
        </div>
      </div>

      {/* 4 Rows of Processors */}
      <div className="flex flex-col space-y-3 mt-2">
        <ProcessorCard 
          name="LEXER_PROC" 
          role="Character-level tokenizer" 
          processorKey="lexer" 
        />
        <ProcessorCard 
          name="PARSER_PROC" 
          role="PEG grammar AST builder" 
          processorKey="parser" 
        />
        <ProcessorCard 
          name="VALIDATOR_PROC" 
          role="Deterministic rule engine" 
          processorKey="validator" 
        />
        <ProcessorCard 
          name="GENERATOR_PROC" 
          role="Template-based creator" 
          processorKey="generator" 
        />
      </div>
    </div>
  );
}
