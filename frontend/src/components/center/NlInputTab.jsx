import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { buildAiRequestConfig, getSelectedModel } from '../../api/aiPayload';
import { useNexusStore } from '../../store/nexusStore';
import { Play, Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import { API } from '../../config/api';

export default function NlInputTab() {
  const [inputText, setInputText] = useState("");
  const [outputHL7, setOutputHL7] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false); // M-08: Copy button state

  const engineMode = useNexusStore((state) => state.engineMode);
  const systemConfig = useNexusStore((state) => state.systemConfig);
  const addEvent = useNexusStore((state) => state.addEvent);
  const updateAgentStatus = useNexusStore((state) => state.updateAgentStatus);
  const setCurrentMessage = useNexusStore((state) => state.setCurrentMessage);
  const setValidationResult = useNexusStore((state) => state.setValidationResult);
  const setAiAnalysis = useNexusStore((state) => state.setAiAnalysis);

  // M-08: Working copy button
  const handleCopy = async () => {
    if (!outputHL7) return;
    try {
      await navigator.clipboard.writeText(outputHL7);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return; // L-05: empty check

    setIsProcessing(true);
    setOutputHL7('');
    
    addEvent({
      type: 'EventType.USER_ACTION',
      engine: engineMode,
      detail: `Initiated NL to HL7 conversion using ${engineMode}`,
      severity: 'INFO'
    });

    try {
      updateAgentStatus('semantic', 'PROCESSING', { tokens: inputText.split(' ').length });
      
      // M-01: Centralized API URL, L-03: timeout
      const res = await apiClient.post(API.ENGINE_NL_PARSE, {
        ...buildAiRequestConfig(engineMode, systemConfig),
        text: inputText
      }, { timeout: 60000 }); // Longer timeout for AI inference
      
      setOutputHL7(res.data.hl7);
      setCurrentMessage(res.data.hl7);
      setValidationResult(res.data.validation || null);
      setAiAnalysis(null);
      
      updateAgentStatus('semantic', 'COMPLETE', { size: res.data.hl7.length });
      updateAgentStatus('compliance', res.data.validation?.status === 'PASS' ? 'COMPLETE' : 'ERROR', {
        validation: res.data.validation?.status || 'UNKNOWN'
      });
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || err.message;
      setOutputHL7(`ERROR: ${detail}`);
      updateAgentStatus('semantic', 'ERROR', {});
    } finally {
      setIsProcessing(false);
    }
  };

  if (engineMode === 'algorithm') {
    return (
      <div className="nexus-tool-empty flex-1 flex items-center justify-center font-mono text-[10px]">
        Natural language input requires AI Engine
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col space-y-4">
      {/* Description / Instructions */}
      <div className="nexus-nl-instructions min-w-0 break-words border p-3 font-mono text-[10px]">
        Enter natural language clinical text below. The AI Engine ({getSelectedModel(engineMode, systemConfig)}) will process the semantics and generate a structurally compliant HL7 message.
      </div>

      {/* Input Area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Clinical text input
          </span>
          <button 
            onClick={handleGenerate}
            disabled={isProcessing || !inputText.trim()}
            className="nexus-tool-action flex items-center border px-6 py-2 font-mono text-[11px] font-bold uppercase tracking-widest disabled:opacity-50"
          >
            {isProcessing ? 'Thinking...' : 'GENERATE FROM TEXT'} <Play size={14} className="ml-2" />
          </button>
        </div>
        <textarea 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="nexus-tool-textarea flex-1 resize-none border-2 border-black p-3 font-mono text-xs focus:outline-none"
          placeholder="Describe the patient event..."
        />
      </div>

      {/* Output Area */}
      <div className="nexus-tool-panel nexus-tool-panel--accent flex min-h-0 min-w-0 flex-1 flex-col border-2 border-[var(--color-nexus-red)] bg-white">
        <div className="nexus-tool-panel-header nexus-tool-panel-header--accent flex items-center justify-between gap-3 bg-[var(--color-nexus-red)] px-3 py-1.5 border-b-2 border-[var(--color-nexus-red)]">
          <span className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
            Synthesized HL7 output
          </span>
          <button onClick={handleCopy} className="nexus-tool-copy-button text-red-200 hover:text-white transition-colors" title="Copy to clipboard">
            {copied ? <Check size={12} className="text-green-300" /> : <Copy size={12} />}
          </button>
        </div>
        <textarea 
          value={outputHL7}
          readOnly
          className="nexus-tool-output-textarea flex-1 resize-none p-3 font-mono text-[11px] focus:outline-none"
          placeholder="Synthesized message will appear here..."
        />
      </div>
    </div>
  );
}
