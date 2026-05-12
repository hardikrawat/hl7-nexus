import React, { useState, useEffect } from 'react';
import { useNexusStore } from '../../store/nexusStore';
import AiAgents from '../agents/AiAgents';
import AlgoProcessors from '../agents/AlgoProcessors';
import { Activity } from 'lucide-react';
import clsx from 'clsx';

export default function LeftPanel() {
  const engineMode = useNexusStore((state) => state.engineMode);
  const isAI = engineMode === 'cloud_ai' || engineMode === 'local_ai';

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="bg-slate-900 px-3 py-2 border-b-2 border-[var(--color-nexus-red)] flex justify-between items-center flex-shrink-0">
        <h2 className="font-mono text-[11px] font-bold tracking-widest text-white flex items-center">
          <Activity size={14} className="mr-2 text-green-400" />
          OPERATIONAL STATUS <span className="text-[9px] text-slate-400 ml-2 font-normal">• CONNECTED</span>
        </h2>
      </div>
      
      <div className="p-4 flex-1 flex flex-col space-y-6 overflow-y-auto">

        {/* SECTION 3.3 — CHANNEL STATUS */}
        <div className={clsx(
          "border-2 border-black p-2 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white",
          engineMode === 'algorithm' ? "border-slate-800" : "border-[var(--color-nexus-red)]"
        )}>
          <span className="font-mono text-[10px] uppercase font-bold text-slate-800">
            ACTIVE ENGINE: {engineMode.toUpperCase()}
          </span>
        </div>

        {/* SECTION 3.4 — AGENT_MONITORS / PROCESSORS */}
        <div className="flex-1">
          {isAI ? <AiAgents /> : <AlgoProcessors />}
        </div>

      </div>
    </div>
  );
}
