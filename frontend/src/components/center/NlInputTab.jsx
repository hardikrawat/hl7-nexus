import React, { useState } from 'react';
import axios from 'axios';
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
      const res = await axios.post(API.ENGINE_NL_PARSE, {
        engine_mode: engineMode,
        model: engineMode === 'cloud_ai' ? systemConfig.activeModel : 'llama3',
        api_key: systemConfig.geminiApiKey,
        ollama_url: systemConfig.ollamaUrl,
        text: inputText
      }, { timeout: 60000 }); // Longer timeout for AI inference
      
      setOutputHL7(res.data.hl7);
      
      updateAgentStatus('semantic', 'COMPLETE', { size: res.data.hl7.length });
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
    <div className="flex flex-col h-full space-y-4">
      {/* Description / Instructions */}
      <div className="nexus-nl-instructions border p-3 font-mono text-[10px]">
        Enter natural language clinical text below. The AI Engine ({engineMode === 'cloud_ai' ? systemConfig.activeModel : 'Ollama'}) will process the semantics and generate a structurally compliant HL7 message.
      </div>

      {/* Input Area */}
      <div className="flex flex-col space-y-2 flex-1">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]">
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
      <div className="nexus-tool-panel nexus-tool-panel--accent flex-1 flex flex-col border-2 border-[var(--color-nexus-red)] bg-white">
        <div className="nexus-tool-panel-header nexus-tool-panel-header--accent bg-[var(--color-nexus-red)] px-3 py-1.5 border-b-2 border-[var(--color-nexus-red)] flex justify-between items-center">
          <span className="text-white text-[11px] font-semibold uppercase tracking-[0.14em]">
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
