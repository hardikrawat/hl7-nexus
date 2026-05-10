import React, { useState } from 'react';
import axios from 'axios';
import { useNexusStore } from '../../store/nexusStore';
import { Play } from 'lucide-react';
import clsx from 'clsx';
import { API } from '../../config/api';

export default function ParseTab() {
  const [inputMessage, setInputMessage] = useState("");
  const [ast, setAst] = useState(null);
  const [validation, setValidation] = useState(null);
  const [fhir, setFhir] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const engineMode = useNexusStore((state) => state.engineMode);
  const addEvent = useNexusStore((state) => state.addEvent);
  const updateProcessorStatus = useNexusStore((state) => state.updateProcessorStatus);
  const updateAgentStatus = useNexusStore((state) => state.updateAgentStatus);

  const isAI = engineMode === 'cloud_ai' || engineMode === 'local_ai';

  const handleProcess = async () => {
    if (!inputMessage.trim()) return;

    setIsProcessing(true);
    setAst(null);
    setValidation(null);
    setFhir(null);
    
    addEvent({
      type: 'EventType.USER_ACTION',
      engine: engineMode,
      detail: `Initiated Parse & Validate sequence via ${isAI ? 'AI-assisted' : 'Algorithm'} pipeline`,
      severity: 'INFO'
    });

    try {
      if (!isAI) {
        // --- ALGORITHM MODE: Sequential pipeline with delays for observability ---
        updateProcessorStatus('lexer', 'PROCESSING', { lines: inputMessage.split('\n').length });
        await new Promise(r => setTimeout(r, 600));
        updateProcessorStatus('lexer', 'COMPLETE', { lines: inputMessage.split('\n').length });
        
        updateProcessorStatus('parser', 'PROCESSING', { segments: 0 });
        await new Promise(r => setTimeout(r, 800));
        
        const res = await axios.post(API.ALGO_PROCESS, {
          message: inputMessage
        }, { timeout: 30000 });
        
        updateProcessorStatus('parser', 'COMPLETE', { segments: res.data.ast.segments.length });
        
        updateProcessorStatus('validator', 'PROCESSING', { rules: res.data.validation.rules_checked || 0 });
        await new Promise(r => setTimeout(r, 900));
        updateProcessorStatus('validator', res.data.validation.status === 'PASS' ? 'COMPLETE' : 'ERROR', { rules: res.data.validation.rules_checked || 0 });
        
        setAst(res.data.ast);
        setValidation(res.data.validation);
        setFhir(res.data.fhir);

      } else {
        // --- AI MODE: Update AI agents panel, fast path ---
        updateAgentStatus('syntax', 'PROCESSING', { lines: inputMessage.split('\n').length });
        updateAgentStatus('semantic', 'PROCESSING', { segments: 0 });
        updateAgentStatus('compliance', 'PROCESSING', { rules: 0 });
        
        const res = await axios.post(API.ALGO_PROCESS, {
          message: inputMessage
        }, { timeout: 30000 });
        
        setAst(res.data.ast);
        setValidation(res.data.validation);
        setFhir(res.data.fhir);

        // Update AI agents (not algo processors) to reflect completion
        updateAgentStatus('syntax', 'COMPLETE', { lines: inputMessage.split('\n').length });
        updateAgentStatus('semantic', 'COMPLETE', { segments: res.data.ast.segments.length });
        updateAgentStatus('compliance', res.data.validation.status === 'PASS' ? 'COMPLETE' : 'ERROR', { rules: res.data.validation.rules_checked || 0 });
      }

    } catch (err) {
      console.error(err);
      if (isAI) {
        updateAgentStatus('syntax', 'ERROR', {});
        updateAgentStatus('semantic', 'ERROR', {});
        updateAgentStatus('compliance', 'ERROR', {});
      } else {
        updateProcessorStatus('lexer', 'ERROR', {});
        updateProcessorStatus('parser', 'ERROR', {});
        updateProcessorStatus('validator', 'ERROR', {});
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFhir = () => {
    if (!fhir) return;
    const blob = new Blob([JSON.stringify(fhir, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fhir_bundle.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Input Area */}
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              // HL7 MESSAGE INPUT
            </span>
            <span className={clsx(
              "font-mono text-[9px] font-bold uppercase px-2 py-0.5 border",
              isAI ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-600 bg-slate-50 text-slate-600"
            )}>
              {isAI ? '⚡ AI' : '⬡ ALGO'}
            </span>
          </div>
          <button 
            onClick={handleProcess}
            disabled={isProcessing || !inputMessage.trim()}
            className="bg-black text-white px-6 py-2 font-mono text-[11px] uppercase tracking-widest font-bold flex items-center hover:bg-slate-800 disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'EXECUTE SEQUENCE'} <Play size={14} className="ml-2" />
          </button>
        </div>
        <textarea 
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          className="w-full h-32 border-2 border-black p-3 font-mono text-xs bg-slate-50 focus:outline-none focus:border-[var(--color-nexus-red)] resize-none"
          placeholder="Paste raw HL7 v2 message here..."
        />
      </div>

      {/* Output Area - Split horizontally */}
      <div className="flex-1 flex space-x-4 min-h-0">
        
        {/* Segment Tree */}
        <div className="flex-1 flex flex-col border-2 border-black bg-white min-w-0">
          <div className="bg-slate-900 px-3 py-1.5 border-b-2 border-black">
            <span className="text-white font-mono text-[10px] uppercase tracking-widest">
              / AST PARSE TREE
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 bg-slate-50">
            {ast ? (
              <div className="font-mono text-[11px] space-y-2">
                {ast.segments.map((seg, i) => (
                  <div key={seg.id} className="border border-slate-300 p-2 bg-white">
                    <div className="font-bold text-[var(--color-nexus-red)] mb-1">
                      {seg.name} <span className="text-slate-400 font-normal">({seg.fields.length} fields)</span>
                    </div>
                    <div className="pl-4 space-y-1">
                      {seg.fields.map(f => (
                        <div key={f.sequence} className="flex space-x-2">
                          <span className="text-slate-400 w-14 flex-shrink-0 whitespace-nowrap">{seg.name}-{f.sequence}</span>
                          <span className="text-slate-700 break-all">{f.raw || '""'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-mono text-[10px]">
                [ AWAITING_PAYLOAD ]
              </div>
            )}
          </div>
        </div>

        {/* Validation Matrix */}
        <div className="w-64 flex flex-col border-2 border-black bg-white flex-shrink-0">
          <div className="bg-slate-900 px-3 py-1.5 border-b-2 border-black">
            <span className="text-white font-mono text-[10px] uppercase tracking-widest">
              / COMPLIANCE VALIDATION
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {validation ? (
              <div className="flex flex-col space-y-4">
                <div className={clsx(
                  "border-2 p-3 text-center",
                  validation.status === 'PASS' ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50"
                )}>
                  <span className={clsx(
                    "font-mono text-xl font-bold uppercase tracking-widest",
                    validation.status === 'PASS' ? "text-green-600" : "text-red-600"
                  )}>
                    {validation.status}
                  </span>
                </div>

                {/* Rules summary */}
                <div className="font-mono text-[9px] text-slate-500 border-b border-gray-200 pb-1">
                  {validation.rules_checked || 0} RULES CHECKED · {validation.rules_passed || 0} PASSED
                </div>

                {/* Errors */}
                <div className="space-y-2">
                  <span className="font-mono text-[10px] font-bold text-slate-500 uppercase border-b border-gray-200 pb-1 block">
                    ERRORS ({validation.errors.length})
                  </span>
                  {validation.errors.length > 0 ? validation.errors.map((err, i) => (
                    <div key={i} className="text-[10px] font-mono text-red-600 border-l-2 border-red-600 pl-2 bg-red-50 p-1">
                      <strong>{err.rule}: {err.segment}-{err.field}:</strong> {err.message}
                    </div>
                  )) : (
                    <span className="text-[10px] font-mono text-slate-400">0 ERRORS DETECTED</span>
                  )}
                </div>

                {/* Warnings */}
                {validation.warnings && validation.warnings.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-mono text-[10px] font-bold text-amber-600 uppercase border-b border-amber-200 pb-1 block">
                      WARNINGS ({validation.warnings.length})
                    </span>
                    {validation.warnings.map((warn, i) => (
                      <div key={i} className="text-[10px] font-mono text-amber-700 border-l-2 border-amber-500 pl-2 bg-amber-50 p-1">
                        <strong>{warn.rule}:</strong> {warn.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-mono text-[10px]">
                [ NO_DATA ]
              </div>
            )}
          </div>
        </div>
        
        {/* FHIR Bridge Output */}
        <div className="flex-1 flex flex-col border-2 border-[var(--color-nexus-red)] bg-white min-w-0">
          <div className="bg-[var(--color-nexus-red)] px-3 py-1.5 border-b-2 border-[var(--color-nexus-red)]">
            <span className="text-white font-mono text-[10px] uppercase tracking-widest">
              / FHIR BUNDLE EXPORT
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 bg-red-50 text-blue-900 font-mono text-[10px] whitespace-pre">
            {fhir ? JSON.stringify(fhir, null, 2) : (
              <span className="text-slate-400">[ AWAITING_PAYLOAD ]</span>
            )}
          </div>
          {fhir && (
            <div className="p-2 border-t-2 border-[var(--color-nexus-red)] bg-white flex justify-end">
              <button onClick={downloadFhir} className="bg-[var(--color-nexus-red)] text-white px-4 py-1 font-mono text-[9px] uppercase font-bold hover:bg-red-800">
                [DOWNLOAD FHIR JSON]
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
