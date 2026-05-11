import React from 'react';
import { useNexusStore } from '../../store/nexusStore';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const AgentCard = ({ name, role, agentKey }) => {
  const agent = useNexusStore((state) => state.agents[agentKey]);
  const status = agent?.status || 'IDLE';
  const metrics = agent?.metrics || {};

  const isActive = status !== 'IDLE' && status !== 'COMPLETE' && status !== 'ERROR' && status !== 'ALERT' && status !== 'WARNING';
  const isError = status === 'ERROR' || status === 'ALERT' || status === 'WARNING';
  const isComplete = status === 'COMPLETE' || status === 'PASS' || status === 'CLEAR';
  const displayName = name
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <div className={clsx(
      "nexus-pipeline-card flex flex-col relative overflow-hidden transition-colors duration-300",
      isActive ? "nexus-pipeline-card--active animate-pulse" : isError ? "nexus-pipeline-card--error" : isComplete ? "nexus-pipeline-card--complete" : "nexus-pipeline-card--idle"
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
        {isError && (
          <span className="nexus-pipeline-alert font-mono text-[10px] font-bold">!</span>
        )}
      </div>

      {/* Body */}
      <div className="p-2 flex-1 flex flex-col justify-between">
        <p className="font-mono text-[9px] uppercase font-bold mb-2">
          <span className={clsx(
            "nexus-pipeline-status",
            isActive && "animate-pulse"
          )}>
            {status}
          </span>
        </p>
        
        {/* Micro bars row */}
        <div className="flex justify-between items-end h-6 mt-1">
          {['OBS', 'ORI', 'DEC', 'RCL', 'GEN', 'OUT'].map((label, i) => (
            <div key={label} className="flex flex-col items-center justify-end h-full">
              <div className={clsx(
                "nexus-pipeline-microbar w-3 mb-1 transition-all duration-300",
                isActive && "nexus-pipeline-microbar--active",
                isActive && `h-[${Math.floor(Math.random() * 80 + 20)}%]` // Fake activity for visual flair
              )} style={{ height: isActive ? `${Math.floor(Math.random() * 80 + 20)}%` : '20%' }} />
              <span className="nexus-pipeline-metric-label font-mono text-[6px] uppercase tracking-widest leading-none">
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

  return (
    <div className="flex flex-col space-y-3 h-full">
      {/* Header section */}
      <div className="nexus-pipeline-header flex justify-between items-center border-b border-gray-300 pb-1">
        <span className="nexus-pipeline-title text-[11px] font-semibold uppercase tracking-[0.16em]">
          Validation pipeline
        </span>
        <span className="nexus-pipeline-pill nexus-pipeline-pill--accent rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
          Full matrix
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
        <div className="nexus-pipeline-card nexus-pipeline-card--idle flex flex-col justify-center items-center p-2 text-center">
          <span className="nexus-pipeline-name text-[11px] font-semibold mb-1">
            AI Engine
          </span>
          <span className="nexus-pipeline-role font-mono text-[8px] uppercase">
            {engineMode === 'cloud_ai' ? 'Cloud API connected' : 'Ollama localhost'}
          </span>
        </div>
      </div>
    </div>
  );
}
