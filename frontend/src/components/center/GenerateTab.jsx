import React, { useState } from 'react';
import axios from 'axios';
import { useNexusStore } from '../../store/nexusStore';
import { Play, Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import { API } from '../../config/api';

export default function GenerateTab() {
  const [template, setTemplate] = useState('ADT_A01');
  const [inputData, setInputData] = useState('{\n  "patientId": "12345",\n  "lastName": "DOE",\n  "firstName": "JOHN",\n  "dateOfBirth": "19800101",\n  "sex": "M"\n}');
  const [outputMessage, setOutputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [jsonError, setJsonError] = useState(null);
  const [copied, setCopied] = useState(false);

  const addEvent = useNexusStore((state) => state.addEvent);
  const updateProcessorStatus = useNexusStore((state) => state.updateProcessorStatus);
  const updateAgentStatus = useNexusStore((state) => state.updateAgentStatus);
  const engineMode = useNexusStore((state) => state.engineMode);
  const systemConfig = useNexusStore((state) => state.systemConfig);

  const isAI = engineMode === 'cloud_ai' || engineMode === 'local_ai';

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputData(val);
    try {
      if (val.trim()) JSON.parse(val);
      setJsonError(null);
    } catch (err) {
      setJsonError(err.message);
    }
  };

  const handleCopy = async () => {
    if (!outputMessage) return;
    try {
      await navigator.clipboard.writeText(outputMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleGenerate = async () => {
    let parsedData;
    try {
      parsedData = JSON.parse(inputData);
    } catch (err) {
      setOutputMessage(`ERROR: Invalid JSON input — ${err.message}`);
      setJsonError(err.message);
      return;
    }

    setIsProcessing(true);
    setOutputMessage('');
    
    addEvent({
      type: 'EventType.USER_ACTION',
      engine: engineMode,
      detail: `Initiated Generation sequence for ${template} via ${isAI ? 'AI Engine' : 'Algorithm Engine'}`,
      severity: 'INFO'
    });

    try {
      if (isAI) {
        // --- AI MODE: Use AI engine to generate HL7 from structured data ---
        updateAgentStatus('syntax', 'PROCESSING', { template });
        updateAgentStatus('semantic', 'PROCESSING', { fields: Object.keys(parsedData).length });

        // Build a prompt from the structured data + template
        const prompt = `Generate a valid HL7 v2.5.1 ${template.replace('_', '^')} message using this patient data:\n${JSON.stringify(parsedData, null, 2)}\n\nInclude all required segments for a ${template.replace('_', '^')} message.`;

        const res = await axios.post(API.ENGINE_NL_PARSE, {
          engine_mode: engineMode,
          model: engineMode === 'cloud_ai' ? systemConfig.activeModel : 'llama3',
          api_key: systemConfig.geminiApiKey,
          ollama_url: systemConfig.ollamaUrl,
          text: prompt
        }, { timeout: 60000 });

        setOutputMessage(res.data.hl7);
        updateAgentStatus('syntax', 'COMPLETE', { template });
        updateAgentStatus('semantic', 'COMPLETE', { size: res.data.hl7.length });
        updateAgentStatus('compliance', 'COMPLETE', {});

      } else {
        // --- ALGORITHM MODE: Use template-based generator ---
        updateProcessorStatus('generator', 'PROCESSING', { template });
        
        // Intentional delay for pipeline observability
        await new Promise(r => setTimeout(r, 1200));
        
        const res = await axios.post(API.ALGO_GENERATE, {
          template,
          data: parsedData
        }, { timeout: 30000 });
        
        setOutputMessage(res.data.message);
        updateProcessorStatus('generator', 'COMPLETE', { size: res.data.message.length });
      }

    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || err.message;
      setOutputMessage(`ERROR: ${detail}`);
      if (isAI) {
        updateAgentStatus('syntax', 'ERROR', {});
        updateAgentStatus('semantic', 'ERROR', {});
      } else {
        updateProcessorStatus('generator', 'ERROR', {});
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="nexus-generator flex h-full flex-col space-y-4">
      {/* Controls */}
      <div className="nexus-generator-controls flex items-end gap-4 rounded-md border p-3 shadow-sm">
        <div className="flex flex-col space-y-1">
          <span className="nexus-generator-label mb-2 border-b border-gray-200 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Message template
          </span>
          <select 
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="nexus-generator-select rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm focus:outline-none focus:border-[var(--color-nexus-red)]"
          >
            <option value="ADT_A01">ADT^A01 (Admit)</option>
            <option value="ADT_A03">ADT^A03 (Discharge)</option>
            <option value="ADT_A08">ADT^A08 (Update Patient)</option>
            <option value="ORU_R01">ORU^R01 (Observation Result)</option>
            <option value="ORM_O01">ORM^O01 (Order Message)</option>
          </select>
        </div>

        {/* Engine mode indicator */}
        <div className="flex flex-col space-y-1">
          <span className="nexus-generator-kicker font-mono text-[9px] uppercase tracking-widest text-slate-400">
            ENGINE
          </span>
          <span className={clsx(
            "nexus-generator-engine-badge border px-2 py-2 font-mono text-[10px] font-bold uppercase",
            isAI ? "nexus-generator-engine-badge--ai" : "nexus-generator-engine-badge--rule"
          )}>
            {isAI ? 'AI INFERENCE' : 'RULE ENGINE'}
          </span>
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <button 
            onClick={handleGenerate}
            disabled={isProcessing || !!jsonError}
            className="border border-red-900/10 bg-[var(--color-nexus-red)] text-white px-6 py-2 font-mono text-[11px] uppercase tracking-widest font-bold shadow-sm hover:bg-red-800 disabled:opacity-50"
          >
            {isProcessing ? 'GENERATING...' : 'BUILD MESSAGE'}
          </button>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 flex space-x-4 min-h-0">
        
        {/* JSON Input */}
        <div className="nexus-generator-panel flex flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="nexus-generator-panel-header flex items-center justify-between border-b-2 border-black bg-slate-900 px-3 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
              Patient data JSON
            </span>
            {jsonError && (
              <span className="nexus-generator-error ml-2 truncate font-mono text-[9px] uppercase text-red-400">
                Invalid JSON
              </span>
            )}
          </div>
          <textarea 
            value={inputData}
            onChange={handleInputChange}
            className={clsx(
              "nexus-generator-textarea nexus-generator-textarea--input flex-1 resize-none bg-slate-50 p-3 font-mono text-[11px] focus:outline-none",
              jsonError && "nexus-generator-textarea--invalid border-l-4 border-l-red-500"
            )}
          />
        </div>

        {/* HL7 Output */}
        <div className="nexus-generator-panel nexus-generator-panel--output flex flex-1 flex-col overflow-hidden rounded-lg border border-red-200 bg-white shadow-sm">
          <div className="nexus-generator-panel-header nexus-generator-panel-header--accent flex items-center justify-between border-b-2 border-[var(--color-nexus-red)] bg-[var(--color-nexus-red)] px-3 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
              Generated HL7 output
            </span>
            <button onClick={handleCopy} className="nexus-generator-copy-button text-red-200 transition-colors hover:text-white" title="Copy to clipboard">
              {copied ? <Check size={12} className="text-green-300" /> : <Copy size={12} />}
            </button>
          </div>
          <textarea 
            value={outputMessage}
            readOnly
            className="nexus-generator-textarea nexus-generator-textarea--output flex-1 resize-none p-3 font-mono text-[11px] focus:outline-none"
            placeholder="Generated message will appear here..."
          />
        </div>
        
      </div>
    </div>
  );
}
