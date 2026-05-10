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
    <div className="flex flex-col h-full space-y-4">
      {/* Controls */}
      <div className="flex space-x-4 items-end">
        <div className="flex flex-col space-y-1">
          <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-gray-200 pb-1 mb-2">
            // SELECT MESSAGE TEMPLATE
          </span>
          <select 
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="border-2 border-black px-3 py-2 font-mono text-sm bg-slate-50 focus:outline-none"
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
          <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">
            ENGINE
          </span>
          <span className={clsx(
            "font-mono text-[10px] font-bold uppercase px-2 py-2 border-2",
            isAI ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-700 bg-slate-50 text-slate-700"
          )}>
            {isAI ? '⚡ AI INFERENCE' : '⬡ RULE ENGINE'}
          </span>
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <button 
            onClick={handleGenerate}
            disabled={isProcessing || !!jsonError}
            className="border-2 border-black bg-[var(--color-nexus-red)] text-white px-6 py-2 font-mono text-[11px] uppercase tracking-widest font-bold hover:bg-red-800 disabled:opacity-50"
          >
            {isProcessing ? 'GENERATING...' : 'BUILD MESSAGE'}
          </button>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 flex space-x-4 min-h-0">
        
        {/* JSON Input */}
        <div className="flex-1 flex flex-col border-2 border-black bg-white">
          <div className="bg-slate-900 px-3 py-1.5 border-b-2 border-black flex justify-between items-center">
            <span className="text-white font-mono text-[10px] uppercase tracking-widest">
              / PATIENT DATA (JSON)
            </span>
            {jsonError && (
              <span className="text-red-400 font-mono text-[9px] uppercase truncate ml-2">
                ⚠ INVALID JSON
              </span>
            )}
          </div>
          <textarea 
            value={inputData}
            onChange={handleInputChange}
            className={clsx(
              "flex-1 p-3 font-mono text-[11px] bg-slate-50 focus:outline-none resize-none",
              jsonError && "border-l-4 border-l-red-500"
            )}
          />
        </div>

        {/* HL7 Output */}
        <div className="flex-1 flex flex-col border-2 border-[var(--color-nexus-red)] bg-white">
          <div className="bg-[var(--color-nexus-red)] px-3 py-1.5 border-b-2 border-[var(--color-nexus-red)] flex justify-between items-center">
            <span className="text-white font-mono text-[10px] uppercase tracking-widest">
              / GENERATED HL7 OUTPUT
            </span>
            <button onClick={handleCopy} className="text-red-200 hover:text-white transition-colors" title="Copy to clipboard">
              {copied ? <Check size={12} className="text-green-300" /> : <Copy size={12} />}
            </button>
          </div>
          <textarea 
            value={outputMessage}
            readOnly
            className="flex-1 p-3 font-mono text-[11px] text-blue-900 bg-red-50 focus:outline-none resize-none"
            placeholder="Generated message will appear here..."
          />
        </div>
        
      </div>
    </div>
  );
}
