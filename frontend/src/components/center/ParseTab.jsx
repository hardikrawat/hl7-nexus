import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { useNexusStore } from '../../store/nexusStore';
import { Download, Eye, Play, X } from 'lucide-react';
import clsx from 'clsx';
import { API } from '../../config/api';
import PayloadSources from '../shared/PayloadSources';

function DetailMetric({ label, value }) {
  return (
    <div className="nexus-detail-metric rounded-xl border px-3 py-2">
      <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.16em]">
        {label}
      </span>
      <strong className="mt-1 block font-mono text-lg leading-none">
        {value}
      </strong>
    </div>
  );
}

function AstSegmentBlocks({ segments, withBody = true }) {
  if (!segments.length) {
    const emptyState = (
      <div className="h-full flex items-center justify-center text-slate-400 font-mono text-[10px]">
        No parse tree data
      </div>
    );

    return withBody ? (
      <div className="nexus-parse-panel-body flex-1 overflow-y-auto p-3 bg-slate-50">
        {emptyState}
      </div>
    ) : emptyState;
  }

  const content = (
    <div className="font-mono text-[11px] space-y-2">
      {segments.map((seg) => (
        <div key={seg.id} className="nexus-parse-segment border border-slate-300 p-2 bg-white">
          <div className="font-bold text-[var(--color-nexus-red)] mb-1">
            {seg.name} <span className="text-slate-400 font-normal">({seg.fields.length} fields)</span>
          </div>
          <div className="pl-4 space-y-1">
            {seg.fields.map((field) => (
              <div key={field.sequence} className="flex space-x-2">
                <span className="text-slate-400 w-14 flex-shrink-0 whitespace-nowrap">
                  {seg.name}-{field.sequence}
                </span>
                <span className="text-slate-700 break-all">
                  {field.raw || '""'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (!withBody) {
    return content;
  }

  return (
    <div className="nexus-parse-panel-body flex-1 overflow-y-auto p-3 bg-slate-50">
      {content}
    </div>
  );
}

function ValidationDetailBlocks({ validation }) {
  const errors = validation?.errors || [];
  const warnings = validation?.warnings || [];
  const status = validation?.status || 'UNKNOWN';

  return (
    <div className="nexus-parse-panel-body flex-1 overflow-y-auto p-3 bg-slate-50">
      <div className="font-mono text-[11px] space-y-2">
        <div className="nexus-parse-segment border border-slate-300 p-2 bg-white">
          <div className="font-bold text-[var(--color-nexus-red)] mb-1">
            {status} <span className="text-slate-400 font-normal">({validation?.rules_checked || 0} rules)</span>
          </div>
          <div className="pl-4 space-y-1">
            <div className="flex space-x-2">
              <span className="text-slate-400 w-14 flex-shrink-0 whitespace-nowrap">RULES</span>
              <span className="text-slate-700 break-all">{validation?.rules_checked || 0}</span>
            </div>
            <div className="flex space-x-2">
              <span className="text-slate-400 w-14 flex-shrink-0 whitespace-nowrap">PASSED</span>
              <span className="text-slate-700 break-all">{validation?.rules_passed || 0}</span>
            </div>
            <div className="flex space-x-2">
              <span className="text-slate-400 w-14 flex-shrink-0 whitespace-nowrap">ISSUES</span>
              <span className="text-slate-700 break-all">{errors.length} errors / {warnings.length} warnings</span>
            </div>
          </div>
        </div>

        {errors.length === 0 && warnings.length === 0 && (
          <div className="nexus-parse-segment border border-slate-300 p-2 bg-white">
            <div className="font-bold text-[var(--color-nexus-red)] mb-1">
              No errors detected <span className="text-slate-400 font-normal">(PASS)</span>
            </div>
            <div className="pl-4 space-y-1">
              <div className="flex space-x-2">
                <span className="text-slate-400 w-14 flex-shrink-0 whitespace-nowrap">RESULT</span>
                <span className="text-slate-700 break-all">All validation rules passed for the current payload.</span>
              </div>
            </div>
          </div>
        )}

        {errors.map((error, index) => (
          <div key={`error-${index}`} className="nexus-parse-segment border border-slate-300 p-2 bg-white">
            <div className="font-bold text-[var(--color-nexus-red)] mb-1">
              {error.rule || 'Validation error'} <span className="text-slate-400 font-normal">(ERROR)</span>
            </div>
            <div className="pl-4 space-y-1">
              <div className="flex space-x-2">
                <span className="text-slate-400 w-14 flex-shrink-0 whitespace-nowrap">FIELD</span>
                <span className="text-slate-700 break-all">{error.segment || 'SEG'}-{error.field || 'FIELD'}</span>
              </div>
              <div className="flex space-x-2">
                <span className="text-slate-400 w-14 flex-shrink-0 whitespace-nowrap">MSG</span>
                <span className="text-slate-700 break-all">{error.message || 'No error message provided'}</span>
              </div>
            </div>
          </div>
        ))}

        {warnings.map((warning, index) => (
          <div key={`warning-${index}`} className="nexus-parse-segment border border-slate-300 p-2 bg-white">
            <div className="font-bold text-[var(--color-nexus-red)] mb-1">
              {warning.rule || 'Validation warning'} <span className="text-slate-400 font-normal">(WARN)</span>
            </div>
            <div className="pl-4 space-y-1">
              <div className="flex space-x-2">
                <span className="text-slate-400 w-14 flex-shrink-0 whitespace-nowrap">MSG</span>
                <span className="text-slate-700 break-all">{warning.message || 'No warning message provided'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PayloadDetailModal({ type, ast, fhir, validation, onClose }) {
  const isAst = type === 'ast';
  const isValidation = type === 'validation';
  const payload = isAst ? ast : isValidation ? validation : fhir;
  const astSegments = ast?.segments || [];
  const astFieldCount = astSegments.reduce((count, segment) => count + (segment.fields?.length || 0), 0);
  const fhirEntries = fhir?.entry || [];
  const fhirTypes = [...new Set(fhirEntries.map((entry) => entry.resource?.resourceType).filter(Boolean))];
  const validationErrors = validation?.errors || [];
  const validationWarnings = validation?.warnings || [];
  const modalContent = isAst
    ? {
      ariaLabel: 'AST parse tree details',
      eyebrow: 'Parser output',
      title: 'AST Parse Tree',
      description: 'Structured segment and field tree generated from the current HL7 message.',
    }
    : isValidation
      ? {
        ariaLabel: 'Compliance validation details',
        eyebrow: 'Rule engine output',
        title: 'Compliance Validation',
        description: 'Pass, error, and warning details generated by the validation rules.',
      }
      : {
        ariaLabel: 'JSON',
        eyebrow: 'Interoperability export',
        title: 'JSON',
        description: 'JSON generated from the current HL7 transformation.',
      };
  const handleClose = (event) => {
    event?.stopPropagation();
    window.setTimeout(onClose, 0);
  };
  const handleOverlayClick = (event) => {
    const target = event.target;
    const requestedClose = target === event.currentTarget || target.closest?.('[data-detail-close="true"]');

    if (requestedClose) {
      handleClose(event);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const handleDocumentClick = (event) => {
      const target = event.target;
      const requestedClose = target?.closest?.('[data-detail-close="true"]')
        || target?.dataset?.detailOverlay === 'true';

      if (requestedClose) {
        event.preventDefault();
        event.stopPropagation();
        window.setTimeout(onClose, 0);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [onClose]);

  if (!payload) return null;

  return (
    <div
      className="nexus-detail-overlay fixed inset-0 z-[9999] flex items-center justify-center p-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={modalContent.ariaLabel}
      data-detail-overlay="true"
      onClickCapture={handleOverlayClick}
    >
      <div
        className="nexus-detail-dialog flex min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="nexus-detail-header flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <div className="nexus-detail-eyebrow font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
              {modalContent.eyebrow}
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {modalContent.title}
            </h2>
            <p className="nexus-detail-copy mt-1 text-sm">
              {modalContent.description}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            data-detail-close="true"
            aria-label="Close details"
            className="nexus-detail-close mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border"
            title="Close details"
          >
            <X size={15} />
          </button>
        </div>

        <div className="nexus-detail-body flex min-h-0 flex-1 flex-col overflow-hidden p-5 pb-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {isAst ? (
              <>
                <DetailMetric label="Segments" value={astSegments.length} />
                <DetailMetric label="Fields" value={astFieldCount} />
                <DetailMetric label="Root" value="HL7 v2" />
              </>
            ) : isValidation ? (
              <>
                <DetailMetric label="Status" value={validation?.status || 'UNKNOWN'} />
                <DetailMetric label="Errors" value={validationErrors.length} />
                <DetailMetric label="Warnings" value={validationWarnings.length} />
              </>
            ) : (
              <>
                <DetailMetric label="Resource type" value={fhir?.resourceType || 'Bundle'} />
                <DetailMetric label="Entries" value={fhirEntries.length} />
                <DetailMetric label="Types" value={fhirTypes.length || 0} />
              </>
            )}
          </div>

          <div className="mt-4 grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[0.85fr_1.15fr]">
            <section className="nexus-detail-section flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border">
              <div className="nexus-detail-section-title border-b px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
                Details
              </div>
              {isAst ? (
                <AstSegmentBlocks segments={astSegments} />
              ) : isValidation ? (
                <ValidationDetailBlocks validation={validation} />
              ) : (
                <div className="nexus-parse-panel-body flex-1 overflow-y-auto p-3 bg-slate-50">
                  <div className="font-mono text-[11px] space-y-2">
                  {fhirEntries.length > 0 ? fhirEntries.map((entry, index) => (
                    <div key={entry.fullUrl || index} className="nexus-parse-segment border border-slate-300 p-2 bg-white">
                      <div className="font-bold text-[var(--color-nexus-red)] mb-1">
                        {entry.resource?.resourceType || 'Resource'} <span className="text-slate-400 font-normal">({String(index + 1).padStart(2, '0')})</span>
                      </div>
                      <div className="pl-4 space-y-1">
                        <div className="flex space-x-2">
                          <span className="text-slate-400 w-14 flex-shrink-0 whitespace-nowrap">TYPE</span>
                          <span className="text-slate-700 break-all">
                          {entry.resource?.resourceType || 'Resource'}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <span className="text-slate-400 w-14 flex-shrink-0 whitespace-nowrap">ID</span>
                          <span className="text-slate-700 break-all">
                            {entry.fullUrl || entry.resource?.id || 'No resource identifier'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="nexus-detail-empty rounded-xl border px-3 py-6 text-center font-mono text-[10px]">
                      No bundle entries available
                    </div>
                  )}
                  </div>
                </div>
              )}
            </section>

            <section className="nexus-detail-section flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border">
              <div className="nexus-detail-section-title border-b px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
                Raw JSON
              </div>
              <pre className="nexus-detail-code flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ParseTab() {
  const [inputMessage, setInputMessage] = useState("");
  const [ast, setAst] = useState(null);
  const [validation, setValidation] = useState(null);
  const [fhir, setFhir] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detailView, setDetailView] = useState(null);

  const engineMode = useNexusStore((state) => state.engineMode);
  const addEvent = useNexusStore((state) => state.addEvent);
  const updateProcessorStatus = useNexusStore((state) => state.updateProcessorStatus);
  const updateAgentStatus = useNexusStore((state) => state.updateAgentStatus);

  const isAI = engineMode === 'cloud_ai' || engineMode === 'local_ai';

  const loadSourceMessage = (messages, sourceLabel) => {
    const cleanMessages = [...new Set(messages.map((message) => message.trim()).filter(Boolean))];
    if (cleanMessages.length === 0) return 0;

    setInputMessage(cleanMessages[0]);
    setAst(null);
    setValidation(null);
    setFhir(null);
    setDetailView(null);

    addEvent({
      type: 'EventType.INGEST_MESSAGES',
      engine: 'system',
      detail: cleanMessages.length > 1
        ? `Loaded first HL7 message from ${sourceLabel}; ${cleanMessages.length - 1} additional message(s) ignored for single-message validation`
        : `Loaded 1 HL7 message from ${sourceLabel}`,
      severity: 'INFO',
    });

    return 1;
  };

  const handleProcess = async () => {
    if (!inputMessage.trim()) return;

    setIsProcessing(true);
    setAst(null);
    setValidation(null);
    setFhir(null);
    setDetailView(null);
    
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
        
        const res = await apiClient.post(
          API.ALGO_PROCESS,
          { message: inputMessage },
          { timeout: 30000 }
        );
        
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
        
        const res = await apiClient.post(
          API.ALGO_PROCESS,
          { message: inputMessage },
          { timeout: 30000 }
        );
        
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
    <div className="flex flex-col h-full space-y-4 min-h-0">
      <PayloadSources
        compact
        loadSelectedLabel="Use selected"
        onLoadMessages={loadSourceMessage}
        selectionMode="single"
      />

      {/* Input Area */}
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]">
              HL7 message input
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
            className="nexus-parse-action flex items-center border px-6 py-2 font-mono text-[11px] font-bold uppercase tracking-widest disabled:opacity-50"
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
        <div className="nexus-parse-panel nexus-parse-panel--ast flex-1 flex flex-col overflow-hidden rounded-2xl border-2 border-black bg-white min-w-0">
          <div className="nexus-parse-panel-header flex items-center justify-between gap-3 bg-slate-900 px-3 py-1.5 border-b-2 border-black">
            <span className="text-white text-[11px] font-semibold uppercase tracking-[0.14em]">
              AST parse tree
            </span>
            <button
              type="button"
              onClick={() => setDetailView('ast')}
              disabled={!ast}
              className="nexus-output-header-action inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] font-bold uppercase disabled:opacity-45"
            >
              <Eye size={12} />
              View
            </button>
          </div>
          <div className="nexus-parse-panel-body flex-1 overflow-y-auto p-3 bg-slate-50">
            {ast ? (
              <AstSegmentBlocks segments={ast.segments} withBody={false} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-mono text-[10px]">
                Awaiting payload
              </div>
            )}
          </div>
        </div>

        {/* Validation Matrix */}
        <div className="nexus-parse-panel nexus-parse-panel--validation w-64 flex flex-col overflow-hidden rounded-2xl border-2 border-black bg-white flex-shrink-0">
          <div className="nexus-parse-panel-header flex items-center justify-between gap-3 bg-slate-900 px-3 py-1.5 border-b-2 border-black">
            <span className="text-white text-[11px] font-semibold uppercase tracking-[0.14em]">
              Compliance validation
            </span>
            <button
              type="button"
              onClick={() => setDetailView('validation')}
              disabled={!validation}
              className="nexus-output-header-action inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] font-bold uppercase disabled:opacity-45"
            >
              <Eye size={12} />
              View
            </button>
          </div>
          <div className="nexus-parse-panel-body flex-1 overflow-y-auto p-3">
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
                No validation data
              </div>
            )}
          </div>
        </div>
        
        {/* FHIR Bridge Output */}
        <div className="nexus-fhir-panel flex-1 flex flex-col overflow-hidden rounded-2xl border-2 border-[var(--color-nexus-red)] bg-white min-w-0">
          <div className="nexus-fhir-header flex items-center justify-between gap-3 bg-[var(--color-nexus-red)] px-3 py-1.5 border-b-2 border-[var(--color-nexus-red)]">
            <span className="text-white text-[11px] font-semibold uppercase tracking-[0.14em]">
              JSON
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDetailView('fhir')}
                disabled={!fhir}
                className="nexus-output-header-action inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] font-bold uppercase disabled:opacity-45"
              >
                <Eye size={12} />
                View
              </button>
              <button
                type="button"
                onClick={downloadFhir}
                disabled={!fhir}
                aria-label="Download FHIR JSON"
                title="Download FHIR JSON"
                className="nexus-output-header-action inline-flex h-7 w-7 items-center justify-center rounded-md border font-mono text-[9px] font-bold uppercase disabled:opacity-45"
              >
                <Download size={12} />
              </button>
            </div>
          </div>
          <div className="nexus-fhir-body flex-1 overflow-y-auto p-3 font-mono text-[10px] whitespace-pre">
            {fhir ? JSON.stringify(fhir, null, 2) : (
              <span className="text-slate-400">Awaiting payload</span>
            )}
          </div>
        </div>

      </div>

      {detailView && (
        <PayloadDetailModal
          type={detailView}
          ast={ast}
          fhir={fhir}
          validation={validation}
          onClose={() => setDetailView(null)}
        />
      )}
    </div>
  );
}
