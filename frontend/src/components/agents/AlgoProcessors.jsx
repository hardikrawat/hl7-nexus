import React from 'react';
import { useNexusStore } from '../../store/nexusStore';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const ProcessorCard = ({ name, role, processorKey }) => {
  const processor = useNexusStore((state) => state.processors[processorKey]);
  const status = processor?.status || 'IDLE';
  const metrics = processor?.metrics || {};

  const isActive = status !== 'IDLE' && status !== 'COMPLETE' && status !== 'ERROR';
  const isError = status === 'ERROR';
  const displayName = name
    .replace(/_PROC$/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <div className={clsx(
      "border-2 border-black flex flex-col relative overflow-hidden transition-all duration-300",
      isActive ? "bg-blue-50 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : isError ? "bg-red-50" : "bg-white"
    )}>
      {/* Header */}
      <div className="flex justify-between items-center p-2 border-b border-gray-200">
        <div className="flex items-center space-x-1">
          {isActive ? (
            <Loader2 size={12} className="animate-spin text-blue-600" />
          ) : isError ? (
            <div className="w-2 h-2 rounded-full bg-red-600" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-slate-300" />
          )}
          <span className="text-[11px] font-semibold text-slate-800 truncate" title={displayName}>
            {displayName}
          </span>
        </div>
        <span className={clsx(
          "font-mono text-[9px] uppercase font-bold",
          isActive ? "text-blue-600 animate-pulse" : isError ? "text-red-600" : "text-slate-400"
        )}>
          {status}
        </span>
      </div>

      {/* Body */}
      <div className="p-2 flex-1 flex flex-col justify-between">
        <p className="font-sans text-[10px] text-slate-600 leading-tight mb-2">
          {role}
        </p>
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {Object.entries(metrics).map(([key, val]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
                {key.substring(0, 5)}:
              </span>
              <span className="font-mono text-[9px] font-bold text-slate-700">
                {val}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="h-1 w-full flex bg-slate-100">
        <div className={clsx(
          "h-full transition-all duration-[800ms] ease-in-out",
          isActive ? "w-full bg-blue-500 animate-pulse" : "w-0 bg-transparent"
        )} />
      </div>
    </div>
  );
};

export default function AlgoProcessors() {
  const eventBus = useNexusStore((state) => state.eventBus);
  const isFetching = eventBus.some(e => e.type === 'EventType.FETCH_PROGRESS' || e.type === 'EventType.FETCH_START');
  const isFetchComplete = eventBus.some(e => e.type === 'EventType.FETCH_COMPLETE');

  return (
    <div className="flex flex-col space-y-3 h-full">
      {/* Header section with real-time fetcher visibility */}
      <div className="flex justify-between items-center border-b border-gray-300 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Validation pipeline
        </span>
        <div className="flex items-center space-x-2">
          {isFetching && !isFetchComplete && (
            <Loader2 size={12} className="animate-spin text-[var(--color-nexus-red)]" />
          )}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
            {isFetching && !isFetchComplete ? 'Fetching data' : 'Rule engine'}
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
