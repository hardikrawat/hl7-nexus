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
  const isComplete = status === 'COMPLETE';
  const displayName = name
    .replace(/_PROC$/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <div className={clsx(
      "nexus-pipeline-card flex flex-col relative overflow-hidden transition-all duration-300",
      isActive ? "nexus-pipeline-card--active" : isError ? "nexus-pipeline-card--error" : isComplete ? "nexus-pipeline-card--complete" : "nexus-pipeline-card--idle"
    )}>
      {/* Header */}
      <div className="nexus-pipeline-card-header flex justify-between items-center p-2 border-b border-gray-200">
        <div className="flex items-center space-x-1">
          {isActive ? (
            <Loader2 size={12} className="nexus-pipeline-spinner animate-spin" />
          ) : isError ? (
            <div className="nexus-pipeline-dot nexus-pipeline-dot--error" />
          ) : isComplete ? (
            <div className="nexus-pipeline-dot nexus-pipeline-dot--complete" />
          ) : (
            <div className="nexus-pipeline-dot nexus-pipeline-dot--idle" />
          )}
          <span className="nexus-pipeline-name text-[11px] font-semibold truncate" title={displayName}>
            {displayName}
          </span>
        </div>
        <span className={clsx(
          "nexus-pipeline-status font-mono text-[9px] uppercase font-bold",
          isActive && "animate-pulse"
        )}>
          {status}
        </span>
      </div>

      {/* Body */}
      <div className="p-2 flex-1 flex flex-col justify-between">
        <p className="nexus-pipeline-role font-sans text-[10px] leading-tight mb-2">
          {role}
        </p>
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {Object.entries(metrics).map(([key, val]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="nexus-pipeline-metric-label font-mono text-[9px] uppercase tracking-widest">
                {key.substring(0, 5)}:
              </span>
              <span className="nexus-pipeline-metric-value font-mono text-[9px] font-bold">
                {val}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="nexus-pipeline-progress-track h-1 w-full flex">
        <div className={clsx(
          "nexus-pipeline-progress-bar h-full transition-all duration-[800ms] ease-in-out",
          isActive ? "w-full animate-pulse" : "w-0"
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
      <div className="nexus-pipeline-header flex justify-between items-center border-b border-gray-300 pb-1">
        <span className="nexus-pipeline-title text-[11px] font-semibold uppercase tracking-[0.16em]">
          Validation pipeline
        </span>
        <div className="flex items-center space-x-2">
          {isFetching && !isFetchComplete && (
            <Loader2 size={12} className="animate-spin text-[var(--color-nexus-red)]" />
          )}
          <span className="nexus-pipeline-pill rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
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
