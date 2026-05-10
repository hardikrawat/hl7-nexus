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

  return (
    <div className={clsx(
      "border-2 border-black flex flex-col relative overflow-hidden transition-colors duration-300",
      isActive ? "bg-yellow-50 animate-pulse border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]" : isError ? "bg-red-50" : isComplete ? "bg-green-50" : "bg-white"
    )}>
      {/* Header */}
      <div className="flex justify-between items-center p-2 border-b border-gray-200">
        <div className="flex items-center space-x-1">
          {isActive ? (
            <Loader2 size={12} className="animate-spin text-amber-700" />
          ) : isError ? (
            <div className="w-2 h-2 rounded-full bg-red-600" />
          ) : isComplete ? (
            <div className="w-2 h-2 rounded-full bg-green-600" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-slate-300" />
          )}
          <span className="font-mono text-[10px] font-bold uppercase text-slate-800 truncate" title={`/${name}/`}>
            /{name}/
          </span>
        </div>
        {isError && (
          <span className="font-mono text-[10px] font-bold text-red-600">!</span>
        )}
      </div>

      {/* Body */}
      <div className="p-2 flex-1 flex flex-col justify-between">
        <p className="font-mono text-[9px] uppercase font-bold mb-2">
          <span className={clsx(
            isActive ? "text-amber-700 animate-pulse" : isError ? "text-red-700" : isComplete ? "text-green-700" : "text-slate-500"
          )}>
            {status}
          </span>
        </p>
        
        {/* Micro bars row */}
        <div className="flex justify-between items-end h-6 mt-1">
          {['OBS', 'ORI', 'DEC', 'RCL', 'GEN', 'OUT'].map((label, i) => (
            <div key={label} className="flex flex-col items-center justify-end h-full">
              <div className={clsx(
                "w-3 mb-1 transition-all duration-300",
                isActive ? "bg-black" : "bg-gray-300",
                isActive && `h-[${Math.floor(Math.random() * 80 + 20)}%]` // Fake activity for visual flair
              )} style={{ height: isActive ? `${Math.floor(Math.random() * 80 + 20)}%` : '20%' }} />
              <span className="font-mono text-[6px] uppercase tracking-widest text-slate-400 leading-none">
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
      <div className="flex justify-between items-center border-b border-gray-300 pb-1">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
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
        <div className="border-2 border-black bg-white flex flex-col justify-center items-center p-2 text-center">
          <span className="font-mono text-[10px] font-bold text-slate-800 uppercase mb-1">
            /AI_ENGINE/
          </span>
          <span className="font-mono text-[8px] text-slate-500 uppercase">
            {engineMode === 'cloud_ai' ? 'Claude API connected' : 'Ollama localhost'}
          </span>
        </div>
      </div>
    </div>
  );
}
