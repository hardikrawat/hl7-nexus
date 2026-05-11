import React from 'react';
import { useNexusStore } from '../../store/nexusStore';
import ParseTab from '../center/ParseTab';
import GenerateTab from '../center/GenerateTab';
import NlInputTab from '../center/NlInputTab';
import BatchTab from '../center/BatchTab';
import DiffTab from '../center/DiffTab';
import { FilePlus2, GitCompare, Layers3, Lock, Sparkles, ShieldCheck } from 'lucide-react';

export default function CenterPanel() {
  const activeTab = useNexusStore((state) => state.activeTab);
  const setActiveTab = useNexusStore((state) => state.setActiveTab);
  const engineMode = useNexusStore((state) => state.engineMode);

  const isAI = engineMode === 'cloud_ai' || engineMode === 'local_ai';

  const tabs = [
    { label: 'BUILD MESSAGE', route: 'generate', aiOnly: false, algoOnly: false, icon: FilePlus2 },
    { label: 'PARSE & VALIDATE', route: 'parse', aiOnly: false, algoOnly: false, icon: ShieldCheck },
    { label: 'COMPARE MESSAGES', route: 'diff', aiOnly: false, algoOnly: false, icon: GitCompare },
    { label: 'BATCH PROCESSING', route: 'batch', aiOnly: false, algoOnly: false, icon: Layers3 },
    { label: 'CLINICAL NLP', route: 'nl_input', aiOnly: true, algoOnly: false, icon: Sparkles },
  ];

  return (
    <div className="flex flex-col h-full bg-white relative">

      {/* Tabs */}
      <div className="flex flex-shrink-0 border-b border-gray-300">
        {tabs.map((tab) => {
          const isDisabled = (tab.aiOnly && !isAI) || (tab.algoOnly && isAI);
          const isActive = activeTab === tab.route;
          const Icon = isDisabled ? Lock : tab.icon;

          return (
            <button
              key={tab.label}
              disabled={isDisabled}
              onClick={() => setActiveTab(tab.route)}
              title={isDisabled ? (tab.aiOnly ? "Requires AI Engine" : "Requires Algorithm Engine") : ""}
              className={`flex-1 font-mono text-[10px] uppercase tracking-wider py-2 border-b-2 transition-colors inline-flex items-center justify-center gap-2 ${
                isActive 
                  ? 'border-[var(--color-nexus-red)] text-[var(--color-nexus-red)] font-bold bg-gray-50' 
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-gray-50'
              } ${isDisabled ? 'opacity-45 cursor-not-allowed' : ''}`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="p-4 flex-1 overflow-y-auto md:overflow-hidden bg-white flex flex-col relative min-h-0">
        {activeTab === 'parse' && <ParseTab />}
        {activeTab === 'validate' && <ParseTab />}
        {activeTab === 'generate' && <GenerateTab />}
        {activeTab === 'nl_input' && <NlInputTab />}
        {activeTab === 'batch' && <BatchTab />}
        {activeTab === 'diff' && <DiffTab />}
        {activeTab !== 'parse' && activeTab !== 'validate' && activeTab !== 'generate' && activeTab !== 'nl_input' && activeTab !== 'batch' && activeTab !== 'diff' && (
          <div className="border border-dashed border-gray-300 flex-1 flex items-center justify-center text-slate-400 font-mono text-[10px]">
            [ {activeTab.toUpperCase()}_CONTENT ]
          </div>
        )}
      </div>
    </div>
  );
}
