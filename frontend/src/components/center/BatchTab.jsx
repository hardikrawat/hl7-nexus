import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { useNexusStore } from '../../store/nexusStore';
import { Loader2, Play } from 'lucide-react';
import clsx from 'clsx';
import { API } from '../../config/api';
import PayloadSources from '../shared/PayloadSources';

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

  const appendMessages = (messages, sourceLabel) => {
    const cleanMessages = [...new Set(messages.map((message) => message.trim()).filter(Boolean))];
    if (cleanMessages.length === 0) return;

    setInputText((current) => [current.trim(), ...cleanMessages].filter(Boolean).join('\n\n'));
    addEvent({
      type: 'EventType.INGEST_MESSAGES',
      engine: 'system',
      detail: `Loaded ${cleanMessages.length} HL7 message(s) from ${sourceLabel}`,
      severity: 'INFO',
    });
    return cleanMessages.length;
  };

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
        const res = await apiClient.post(
          API.ALGO_PROCESS,
          { message: messages[i] },
          { timeout: 30000 }
        );
        
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
      {/* Data Sources */}
      <PayloadSources onLoadMessages={appendMessages} />

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
            className="nexus-tool-action flex items-center border px-6 py-2 font-mono text-[11px] font-bold uppercase tracking-widest disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'EXECUTE BATCH'} {isProcessing ? <Loader2 size={14} className="ml-2 animate-spin" /> : <Play size={14} className="ml-2" />}
          </button>
        </div>
        <textarea 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="nexus-tool-textarea w-full h-32 resize-none border-2 border-black p-3 font-mono text-xs focus:outline-none"
          placeholder="Paste multiple HL7 v2 messages here, separated by empty lines..."
        />
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div
          className="nexus-batch-progress-shell"
          role="progressbar"
          aria-label="Batch validation progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="nexus-batch-progress-meter">
            <div className="min-w-0">
              <span className="nexus-batch-progress-label">Batch execution</span>
              <span className="nexus-batch-progress-detail">Streaming validation checks</span>
            </div>
            <span className="nexus-batch-progress-percent">{progress}%</span>
          </div>
          <div className="nexus-batch-progress">
            <div className="nexus-batch-progress-bar transition-all duration-500 ease-out" style={{ width: `${progress}%` }}>
              <span className="nexus-batch-progress-shine" />
            </div>
          </div>
          <div className="nexus-batch-progress-steps" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      {/* Output Stream */}
      <div className="nexus-tool-panel nexus-batch-panel flex-1 flex flex-col border-2 border-black bg-white min-h-0">
        <div className="nexus-tool-panel-header nexus-batch-results-header bg-slate-900 px-3 py-1.5 border-b-2 border-black flex items-center justify-between gap-3">
          <span className="text-white text-[11px] font-semibold uppercase tracking-[0.14em]">
            Batch validation results
          </span>
          <button
            onClick={downloadReport}
            disabled={results.length === 0}
            className="nexus-tool-secondary-action nexus-batch-download-action shrink-0 border px-3 py-1.5 font-mono text-[10px] font-bold uppercase disabled:opacity-50"
          >
            [DOWNLOAD BATCH REPORT]
          </button>
        </div>
        <div className="nexus-tool-panel-body flex-1 overflow-y-auto p-3 bg-slate-50">
          {results.length > 0 ? (
            <div className="font-mono text-[11px] space-y-2">
              {results.map((res, i) => (
                <div key={i} className={clsx(
                  "nexus-batch-result border p-2 flex justify-between items-center",
                  res.status === 'PASS' ? "nexus-batch-result--pass" : "nexus-batch-result--fail"
                )}>
                  <div className="flex items-center space-x-4">
                    <span className="nexus-batch-message-id font-bold w-16">MSG_{res.id.toString().padStart(4, '0')}</span>
                    <span className="nexus-batch-preview truncate w-96">{res.preview}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="nexus-batch-metrics text-[9px]">{res.rulesChecked}R/{res.segments}S/{res.fhirResources}F</span>
                    <span className="nexus-batch-status font-bold">
                      {res.status}
                    </span>
                    <span className="nexus-batch-errors">{res.errors} ERR</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="nexus-tool-empty h-full flex items-center justify-center font-mono text-[10px]">
              Awaiting batch stream
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
