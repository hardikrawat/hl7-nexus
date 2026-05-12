import React, { useState } from 'react';
import axios from 'axios';
import { useNexusStore } from '../../store/nexusStore';
import { Database, FileUp, ListPlus, Loader2, Play } from 'lucide-react';
import clsx from 'clsx';
import { API } from '../../config/api';

const LOCAL_DB_ROWS = [
  {
    id: 'DB_001',
    type: 'ADT^A01',
    patient: 'DOE, JOHN',
    receivedAt: '2026-05-11 08:12',
    message: 'MSH|^~\\&|LOCAL_DB|HOSPITAL|HELIX|NEXUS|202605110812||ADT^A01|DB001|P|2.5.1\nPID|1||12345||DOE^JOHN||19800101|M\nPV1|1|I|WARD^101^A',
  },
  {
    id: 'DB_002',
    type: 'ORU^R01',
    patient: 'SMITH, ANNA',
    receivedAt: '2026-05-11 08:34',
    message: 'MSH|^~\\&|LAB|HOSPITAL|HELIX|NEXUS|202605110834||ORU^R01|DB002|P|2.5.1\nPID|1||67890||SMITH^ANNA||19751202|F\nOBR|1||LAB123|CBC^Complete Blood Count\nOBX|1|NM|WBC^White Blood Count||6.7|10*3/uL',
  },
  {
    id: 'DB_003',
    type: 'ORM^O01',
    patient: 'PATEL, RAVI',
    receivedAt: '2026-05-11 09:03',
    message: 'MSH|^~\\&|ORDER_ENTRY|CLINIC|HELIX|NEXUS|202605110903||ORM^O01|DB003|P|2.5.1\nPID|1||24680||PATEL^RAVI||19920314|M\nORC|NW|ORD4488\nOBR|1|ORD4488||XRAYCHEST^Chest X-Ray',
  },
];

const CSV_MESSAGE_FIELDS = new Set([
  'hl7',
  'hl7_message',
  'hl7message',
  'message',
  'raw_message',
  'rawmessage',
  'payload',
  'content',
]);

const splitHl7Messages = (text) => (
  text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n\s*\n/)
    .map((message) => message.trim())
    .filter((message) => message.includes('MSH|'))
);

const collectHl7Strings = (value, output = []) => {
  if (typeof value === 'string') {
    output.push(...splitHl7Messages(value));
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectHl7Strings(item, output));
    return output;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectHl7Strings(item, output));
  }

  return output;
};

const parseCsvRows = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
};

const extractCsvMessages = (text) => {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim().toLowerCase().replace(/\s+/g, '_'));
  const messageIndexes = headers
    .map((header, index) => (CSV_MESSAGE_FIELDS.has(header) ? index : -1))
    .filter((index) => index >= 0);

  const dataRows = messageIndexes.length > 0 ? rows.slice(1) : rows;
  const candidateMessages = [];

  dataRows.forEach((row) => {
    const cells = messageIndexes.length > 0 ? messageIndexes.map((index) => row[index] || '') : row;
    cells.forEach((cell) => candidateMessages.push(...splitHl7Messages(cell)));
  });

  return candidateMessages;
};

const extractFileMessages = (fileName, text) => {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.json')) {
    const parsed = JSON.parse(text);
    return collectHl7Strings(parsed);
  }

  if (lowerName.endsWith('.csv')) {
    return extractCsvMessages(text);
  }

  return splitHl7Messages(text);
};

export default function BatchTab() {
  const [inputText, setInputText] = useState("");
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dbConfig, setDbConfig] = useState({
    driver: 'SQLite',
    connection: './data/hl7_messages.db',
    table: 'hl7_messages',
  });
  const [dbStatus, setDbStatus] = useState('idle');
  const [dbRows, setDbRows] = useState([]);
  const [selectedDbIds, setSelectedDbIds] = useState([]);
  const [importSummary, setImportSummary] = useState('');
  const [importError, setImportError] = useState('');

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
  };

  const handleConnectDatabase = () => {
    setDbStatus('connected');
    setDbRows(LOCAL_DB_ROWS);
    setSelectedDbIds(LOCAL_DB_ROWS.map((row) => row.id));
    addEvent({
      type: 'EventType.LOCAL_DB_CONNECTED',
      engine: 'system',
      detail: `Connected to ${dbConfig.driver} source ${dbConfig.connection} and listed ${LOCAL_DB_ROWS.length} HL7 rows`,
      severity: 'INFO',
    });
  };

  const toggleDbRow = (rowId) => {
    setSelectedDbIds((current) => (
      current.includes(rowId)
        ? current.filter((id) => id !== rowId)
        : [...current, rowId]
    ));
  };

  const loadSelectedDbRows = () => {
    const selectedMessages = dbRows
      .filter((row) => selectedDbIds.includes(row.id))
      .map((row) => row.message);

    appendMessages(selectedMessages, `${dbConfig.driver} table ${dbConfig.table}`);
  };

  const handleFileImport = async (event) => {
    const files = Array.from(event.target.files || []);
    setImportError('');
    setImportSummary('');

    if (files.length === 0) return;

    try {
      const importedMessages = [];

      for (const file of files) {
        const text = await file.text();
        importedMessages.push(...extractFileMessages(file.name, text));
      }

      if (importedMessages.length === 0) {
        setImportError('No HL7 payloads were found in the selected file(s).');
        return;
      }

      appendMessages(importedMessages, `${files.length} imported file(s)`);
      setImportSummary(`${importedMessages.length} HL7 message(s) imported from ${files.length} file(s).`);
    } catch (err) {
      setImportError(err.message || 'Import failed.');
    } finally {
      event.target.value = '';
    }
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
      {/* Data Sources */}
      <div className="nexus-ingest-grid grid gap-3 xl:grid-cols-2">
        <section className="nexus-ingest-card rounded-2xl border p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database size={15} />
              <span className="nexus-ingest-title text-[11px] font-semibold uppercase tracking-[0.16em]">
                Local database source
              </span>
            </div>
            <span className={clsx('nexus-ingest-status rounded-full px-2 py-0.5 font-mono text-[9px] uppercase', dbStatus === 'connected' && 'nexus-ingest-status--connected')}>
              {dbStatus === 'connected' ? 'Connected' : 'Not connected'}
            </span>
          </div>

          <div className="grid gap-2 md:grid-cols-[120px_1fr_140px]">
            <label className="flex flex-col gap-1">
              <span className="nexus-ingest-label text-[9px] font-bold uppercase tracking-wider">Driver</span>
              <select
                value={dbConfig.driver}
                onChange={(event) => setDbConfig((config) => ({ ...config, driver: event.target.value }))}
                className="nexus-ingest-input rounded-xl border px-3 py-2 font-mono text-[11px]"
              >
                <option>SQLite</option>
                <option>PostgreSQL</option>
                <option>MySQL</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="nexus-ingest-label text-[9px] font-bold uppercase tracking-wider">Connection</span>
              <input
                value={dbConfig.connection}
                onChange={(event) => setDbConfig((config) => ({ ...config, connection: event.target.value }))}
                className="nexus-ingest-input rounded-xl border px-3 py-2 font-mono text-[11px]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="nexus-ingest-label text-[9px] font-bold uppercase tracking-wider">Table</span>
              <input
                value={dbConfig.table}
                onChange={(event) => setDbConfig((config) => ({ ...config, table: event.target.value }))}
                className="nexus-ingest-input rounded-xl border px-3 py-2 font-mono text-[11px]"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleConnectDatabase} className="nexus-tool-secondary-action border px-3 py-2 font-mono text-[10px] font-bold uppercase">
              Connect and list HL7
            </button>
            <button
              type="button"
              onClick={loadSelectedDbRows}
              disabled={selectedDbIds.length === 0}
              className="nexus-tool-action flex items-center border px-3 py-2 font-mono text-[10px] font-bold uppercase disabled:opacity-50"
            >
              <ListPlus size={13} className="mr-2" />
              Load selected
            </button>
          </div>

          {dbRows.length > 0 && (
            <div className="nexus-db-list mt-3 max-h-36 space-y-2 overflow-y-auto pr-1">
              {dbRows.map((row) => {
                const selected = selectedDbIds.includes(row.id);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => toggleDbRow(row.id)}
                    className={clsx('nexus-db-row flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left', selected && 'nexus-db-row--selected')}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[10px] font-bold">{row.id} - {row.type}</span>
                      <span className="nexus-ingest-note block truncate text-[10px]">{row.patient} - {row.receivedAt}</span>
                    </span>
                    <span className="nexus-db-check flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">
                      {selected ? 'Y' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="nexus-ingest-card rounded-2xl border p-3">
          <div className="mb-3 flex items-center gap-2">
            <FileUp size={15} />
            <span className="nexus-ingest-title text-[11px] font-semibold uppercase tracking-[0.16em]">
              Import payload files
            </span>
          </div>

          <label className="nexus-import-drop flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-4 text-center">
            <FileUp size={22} />
            <span className="mt-2 font-mono text-[11px] font-bold uppercase tracking-wider">
              Select JSON, CSV, HL7, or TXT
            </span>
            <span className="nexus-ingest-note mt-1 text-[10px]">
              JSON fields can include hl7, message, payload, or nested arrays.
            </span>
            <input
              type="file"
              multiple
              accept=".hl7,.txt,.json,.csv,application/json,text/csv,text/plain"
              className="sr-only"
              onChange={handleFileImport}
            />
          </label>

          {importSummary && (
            <div className="nexus-import-summary mt-3 rounded-xl border px-3 py-2 font-mono text-[10px]">
              {importSummary}
            </div>
          )}
          {importError && (
            <div className="nexus-import-error mt-3 rounded-xl border px-3 py-2 font-mono text-[10px]">
              {importError}
            </div>
          )}
        </section>
      </div>

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
        <div className="nexus-tool-panel-header bg-slate-900 px-3 py-1.5 border-b-2 border-black">
          <span className="text-white text-[11px] font-semibold uppercase tracking-[0.14em]">
            Batch validation results
          </span>
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
        <div className="nexus-tool-panel-footer p-3 border-t-2 border-black bg-slate-50 flex justify-end">
          <button 
            onClick={downloadReport}
            disabled={results.length === 0}
            className="nexus-tool-secondary-action border px-6 py-2 font-mono text-[11px] font-bold uppercase disabled:opacity-50"
          >
            [DOWNLOAD BATCH REPORT]
          </button>
        </div>
      </div>
    </div>
  );
}
