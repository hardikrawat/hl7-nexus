import React, { useState } from 'react';
import axios from 'axios';
import { useNexusStore } from '../../store/nexusStore';
import { Play, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { API } from '../../config/api';

export default function BatchTab() {
  const [inputText, setInputText] = useState("");
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const addEvent = useNexusStore((state) => state.addEvent);
  const engineMode = useNexusStore((state) => state.engineMode);
  const updateProcessorStatus = useNexusStore((state) => state.updateProcessorStatus);
  const updateAgentStatus = useNexusStore((state) => state.updateAgentStatus);

  const isAI = engineMode === 'cloud_ai' || engineMode === 'local_ai';

  const handleBatchProcess = async () => {
    setIsProcessing(true);
    setResults([]);
    setProgress(0);
    
    const normalized = inputText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const messages = normalized.split(/\n\s*\n/).filter(m => m.trim().length > 0);
    
    addEvent({
      type: 'EventType.BATCH_START',
      engine: engineMode,
      detail: `Initiated batch processing for ${messages.length} messages via ${isAI ? 'AI-assisted' : 'Algorithm'} pipeline`,
      severity: 'INFO'
    });

    const newResults = [];
    
    for (let i = 0; i < messages.length; i++) {
      // Update the correct pipeline panel based on engine mode
      if (isAI) {
        updateAgentStatus('syntax', 'PROCESSING', { batch: `${i+1}/${messages.length}` });
        updateAgentStatus('semantic', 'PROCESSING', {});
      } else {
        updateProcessorStatus('lexer', 'PROCESSING', { batch: `${i+1}/${messages.length}` });
        updateProcessorStatus('parser', 'PROCESSING', {});
        updateProcessorStatus('validator', 'PROCESSING', {});
      }

      try {
        const res = await axios.post(API.ALGO_PROCESS, {
          message: messages[i]
        }, { timeout: 30000 });
        
        newResults.push({
          id: i + 1,
          status: res.data.validation.status,
          errors: res.data.validation.errors.length,
          warnings: res.data.validation.warnings?.length || 0,
          rulesChecked: res.data.validation.rules_checked || 0,
          rulesPassed: res.data.validation.rules_passed || 0,
          segments: res.data.ast.segments.length,
          fhirResources: res.data.fhir?.entry?.length || 0,
          preview: messages[i].substring(0, 50) + (messages[i].length > 50 ? '...' : '')
        });
        
      } catch (err) {
        const detail = err.response?.data?.detail || err.message;
        newResults.push({
          id: i + 1,
          status: 'FAIL',
          errors: 1,
          warnings: 0,
          rulesChecked: 0,
          rulesPassed: 0,
          segments: 0,
          fhirResources: 0,
          preview: messages[i].substring(0, 50) + (messages[i].length > 50 ? '...' : ''),
          errorDetail: detail
        });
      }
      
      setResults([...newResults]);
      setProgress(Math.round(((i + 1) / messages.length) * 100));
      
      // Small delay for UI effect (longer in algorithm mode for observability)
      await new Promise(r => setTimeout(r, isAI ? 200 : 500));
    }
    
    // Set pipeline status to complete
    if (isAI) {
      updateAgentStatus('syntax', 'COMPLETE', { batch: `${messages.length}/${messages.length}` });
      updateAgentStatus('semantic', 'COMPLETE', {});
      updateAgentStatus('compliance', 'COMPLETE', {});
    } else {
      updateProcessorStatus('lexer', 'COMPLETE', { batch: `${messages.length}/${messages.length}` });
      updateProcessorStatus('parser', 'COMPLETE', {});
      updateProcessorStatus('validator', 'COMPLETE', {});
    }

    addEvent({
      type: 'EventType.BATCH_COMPLETE',
      engine: engineMode,
      detail: `Batch completed. Processed ${messages.length} messages.`,
      severity: 'INFO'
    });

    setIsProcessing(false);
  };

  const downloadReport = () => {
    const header = "Message ID,Status,Segments,Rules Checked,Rules Passed,Errors,Warnings,FHIR Resources,Preview";
    const rows = results.map(r => 
      `${r.id},${r.status},${r.segments},${r.rulesChecked},${r.rulesPassed},${r.errors},${r.warnings},${r.fhirResources},"${r.preview.replace(/"/g, '""')}"`
    ).join("\n");
    
    const csvContent = `${header}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "batch_validation_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Input Area */}
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]">
              Batch processing payload
            </span>
            <span className={clsx(
              "font-mono text-[9px] font-bold uppercase px-2 py-0.5 border",
              isAI ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-600 bg-slate-50 text-slate-600"
            )}>
              {isAI ? '⚡ AI' : '⬡ ALGO'}
            </span>
          </div>
          <button 
            onClick={handleBatchProcess}
            disabled={isProcessing || !inputText.trim()}
            className="bg-black text-white px-6 py-2 font-mono text-[11px] uppercase tracking-widest font-bold flex items-center hover:bg-slate-800 disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'EXECUTE BATCH'} {isProcessing ? <Loader2 size={14} className="ml-2 animate-spin" /> : <Play size={14} className="ml-2" />}
          </button>
        </div>
        <textarea 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full h-32 border-2 border-black p-3 font-mono text-xs bg-slate-50 focus:outline-none focus:border-[var(--color-nexus-red)] resize-none"
          placeholder="Paste multiple HL7 v2 messages here, separated by empty lines..."
        />
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="h-2 w-full bg-gray-200 border border-black">
          <div className="h-full bg-[var(--color-nexus-red)] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Output Stream */}
      <div className="flex-1 flex flex-col border-2 border-black bg-white min-h-0">
        <div className="bg-slate-900 px-3 py-1.5 border-b-2 border-black">
          <span className="text-white text-[11px] font-semibold uppercase tracking-[0.14em]">
            Batch validation results
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 bg-slate-50">
          {results.length > 0 ? (
            <div className="font-mono text-[11px] space-y-2">
              {results.map((res, i) => (
                <div key={i} className={clsx(
                  "border p-2 flex justify-between items-center",
                  res.status === 'PASS' ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50"
                )}>
                  <div className="flex items-center space-x-4">
                    <span className="font-bold w-16 text-slate-500">MSG_{res.id.toString().padStart(4, '0')}</span>
                    <span className="text-slate-600 truncate w-96">{res.preview}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-slate-400 text-[9px]">{res.rulesChecked}R/{res.segments}S/{res.fhirResources}F</span>
                    <span className={clsx("font-bold", res.status === 'PASS' ? "text-green-600" : "text-red-600")}>
                      {res.status}
                    </span>
                    <span className="text-slate-500">{res.errors} ERR</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 font-mono text-[10px]">
              Awaiting batch stream
            </div>
          )}
        </div>
        <div className="p-3 border-t-2 border-black bg-slate-50 flex justify-end">
          <button 
            onClick={downloadReport}
            disabled={results.length === 0}
            className="border-2 border-black bg-white text-black px-6 py-2 font-mono text-[11px] font-bold uppercase disabled:opacity-50 hover:bg-gray-100"
          >
            [DOWNLOAD BATCH REPORT]
          </button>
        </div>
      </div>
    </div>
  );
}
