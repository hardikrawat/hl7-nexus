import React, { useState, useEffect } from 'react';
import { useNexusStore } from '../../store/nexusStore';
import AiAgents from '../agents/AiAgents';
import AlgoProcessors from '../agents/AlgoProcessors';
import { Activity } from 'lucide-react';

export default function LeftPanel() {
  const engineMode = useNexusStore((state) => state.engineMode);
  const isAI = engineMode === 'cloud_ai' || engineMode === 'local_ai';

  return (
    <div className="nexus-panel-shell nexus-left-panel flex flex-col h-full bg-white relative">
      <div className="nexus-panel-top bg-slate-900 px-3 py-2 border-b-2 border-[var(--color-nexus-red)] flex justify-between items-center flex-shrink-0">
        <h2 className="font-mono text-[11px] font-bold tracking-widest text-white flex items-center">
          <Activity size={14} className="mr-2 text-green-400" />
          OPERATIONAL STATUS <span className="text-[9px] text-slate-400 ml-2 font-normal">• CONNECTED</span>
        </h2>
      </div>
      
      <div className="nexus-panel-body p-4 flex-1 flex flex-col space-y-6 overflow-y-auto">

        {/* SECTION 3.3 — CHANNEL STATUS */}
        <div className={`nexus-engine-card border p-2 flex flex-col items-center justify-center cursor-pointer transition-colors ${
          engineMode === 'algorithm' ? 'border-slate-800 bg-slate-50' : 'border-[var(--color-nexus-red)] bg-red-50'
        }`}>
          <div className="flex w-full items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-800">
              Active Engine
            </span>
            <span className="nexus-engine-card-mode font-mono text-[10px] uppercase font-bold">
              {engineMode.toUpperCase()}
            </span>
          </div>
          <div className="nexus-engine-wave mt-3 grid w-full grid-cols-8 gap-1" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        {/* SECTION 3.4 — AGENT_MONITORS / PROCESSORS */}
        <div className="flex-1">
          {isAI ? <AiAgents /> : <AlgoProcessors />}
        </div>

      </div>
    </div>
  );
}
