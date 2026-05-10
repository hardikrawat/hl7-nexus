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
      <div className="flex-1 flex items-center justify-center text-slate-400 font-mono text-[10px]">
        [ NL_INPUT_REQUIRES_AI_ENGINE ]
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Description / Instructions */}
      <div className="bg-blue-50 border border-blue-200 p-3 font-mono text-[10px] text-blue-800">
        Enter natural language clinical text below. The AI Engine ({engineMode === 'cloud_ai' ? systemConfig.activeModel : 'Ollama'}) will process the semantics and generate a structurally compliant HL7 message.
      </div>

      {/* Input Area */}
      <div className="flex flex-col space-y-2 flex-1">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            // CLINICAL TEXT INPUT
          </span>
          <button 
            onClick={handleGenerate}
            disabled={isProcessing || !inputText.trim()}
            className="bg-black text-white px-6 py-2 border-2 border-black font-mono text-[11px] uppercase tracking-widest font-bold flex items-center hover:bg-slate-800 disabled:opacity-50"
          >
            {isProcessing ? 'Thinking...' : 'GENERATE FROM TEXT'} <Play size={14} className="ml-2" />
          </button>
        </div>
        <textarea 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 border-2 border-black p-3 font-mono text-xs bg-slate-50 focus:outline-none focus:border-[var(--color-nexus-red)] resize-none"
          placeholder="Describe the patient event..."
        />
      </div>

      {/* Output Area */}
      <div className="flex-1 flex flex-col border-2 border-[var(--color-nexus-red)] bg-white">
        <div className="bg-[var(--color-nexus-red)] px-3 py-1.5 border-b-2 border-[var(--color-nexus-red)] flex justify-between items-center">
          <span className="text-white font-mono text-[10px] uppercase tracking-widest">
            / SYNTHESIZED HL7 OUTPUT
          </span>
          <button onClick={handleCopy} className="text-red-200 hover:text-white transition-colors" title="Copy to clipboard">
            {copied ? <Check size={12} className="text-green-300" /> : <Copy size={12} />}
          </button>
        </div>
        <textarea 
          value={outputHL7}
          readOnly
          className="flex-1 p-3 font-mono text-[11px] text-blue-900 bg-red-50 focus:outline-none resize-none"
          placeholder="Synthesized message will appear here..."
        />
      </div>
    </div>
  );
}
