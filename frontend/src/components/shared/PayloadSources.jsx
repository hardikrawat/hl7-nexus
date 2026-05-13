import React, { useState } from 'react';
import { ChevronRight, Database, FileUp, ListPlus } from 'lucide-react';
import clsx from 'clsx';
import { useNexusStore } from '../../store/nexusStore';

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

const createImportRows = (messages) => (
  [...new Set(messages.map((message) => message.trim()).filter(Boolean))]
    .map((message, index) => {
      const firstLine = message.split('\n').find(Boolean) || '';
      const fields = firstLine.split('|');
      const messageType = fields[8] || 'HL7';
      return {
        id: `IMP_${String(index + 1).padStart(3, '0')}`,
        message,
        preview: firstLine,
        type: messageType,
      };
    })
);

export default function PayloadSources({
  compact = false,
  loadSelectedLabel = 'Load selected',
  onLoadMessages,
  selectionMode = 'multiple',
}) {
  const [dbConfig, setDbConfig] = useState({
    driver: 'SQLite',
    connection: './data/hl7_messages.db',
    table: 'hl7_messages',
  });
  const [dbStatus, setDbStatus] = useState('idle');
  const [dbRows, setDbRows] = useState([]);
  const [selectedDbIds, setSelectedDbIds] = useState([]);
  const [importRows, setImportRows] = useState([]);
  const [selectedImportIndex, setSelectedImportIndex] = useState(0);
  const [importSummary, setImportSummary] = useState('');
  const [importError, setImportError] = useState('');

  const addEvent = useNexusStore((state) => state.addEvent);
  const isSingleSelect = selectionMode === 'single';

  const handleConnectDatabase = () => {
    setDbStatus('connected');
    setDbRows(LOCAL_DB_ROWS);
    setSelectedDbIds(isSingleSelect ? [LOCAL_DB_ROWS[0].id] : LOCAL_DB_ROWS.map((row) => row.id));
    addEvent({
      type: 'EventType.LOCAL_DB_CONNECTED',
      engine: 'system',
      detail: `Connected to ${dbConfig.driver} source ${dbConfig.connection} and listed ${LOCAL_DB_ROWS.length} HL7 rows`,
      severity: 'INFO',
    });
  };

  const toggleDbRow = (rowId) => {
    if (isSingleSelect) {
      setSelectedDbIds([rowId]);
      return;
    }

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

    onLoadMessages(selectedMessages, `${dbConfig.driver} table ${dbConfig.table}`);
  };

  const loadImportedRow = (index) => {
    const row = importRows[index];
    if (!row) return;

    setSelectedImportIndex(index);
    onLoadMessages([row.message], `imported payload ${row.id}`);
    setImportSummary(`Loaded ${row.id} (${index + 1} of ${importRows.length}) into validation input.`);
  };

  const loadNextImportedRow = () => {
    if (importRows.length === 0) return;
    loadImportedRow((selectedImportIndex + 1) % importRows.length);
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

      if (isSingleSelect) {
        const rows = createImportRows(importedMessages);
        setImportRows(rows);
        setSelectedImportIndex(0);
        onLoadMessages([rows[0].message], `${files.length} imported file(s) ${rows[0].id}`);
        setImportSummary(`Loaded ${rows[0].id} of ${rows.length}. Select another row or use Next to validate the rest.`);
        return;
      }

      setImportRows([]);
      const loadedResult = onLoadMessages(importedMessages, `${files.length} imported file(s)`);
      const loadedCount = loadedResult ?? importedMessages.length;
      const loadedPrefix = loadedCount === importedMessages.length ? loadedCount : `${loadedCount} of ${importedMessages.length}`;
      setImportSummary(`${loadedPrefix} HL7 message(s) loaded from ${files.length} file(s).`);
    } catch (err) {
      setImportError(err.message || 'Import failed.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="nexus-ingest-grid grid gap-3 xl:grid-cols-2">
      <section className={clsx('nexus-ingest-card rounded-2xl border', compact ? 'p-2.5' : 'p-3')}>
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
            {loadSelectedLabel}
          </button>
        </div>

        {dbRows.length > 0 && (
          <div className={clsx('nexus-db-list mt-3 space-y-2 overflow-y-auto pr-1', compact ? 'max-h-28' : 'max-h-36')}>
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

      <section className={clsx('nexus-ingest-card rounded-2xl border', compact ? 'p-2.5' : 'p-3')}>
        <div className="mb-3 flex items-center gap-2">
          <FileUp size={15} />
          <span className="nexus-ingest-title text-[11px] font-semibold uppercase tracking-[0.16em]">
            Import payload files
          </span>
        </div>

        <label className={clsx('nexus-import-drop flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-4 text-center', compact ? 'min-h-20' : 'min-h-28')}>
          <FileUp size={compact ? 18 : 22} />
          <span className="mt-2 font-mono text-[11px] font-bold uppercase tracking-wider">
            Select JSON, CSV, HL7, or TXT
          </span>
          <span className="nexus-ingest-note mt-1 text-[10px]">
            JSON fields can include hl7, message, payload, or nested arrays.
          </span>
          <input
            type="file"
            multiple={!isSingleSelect}
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
        {isSingleSelect && importRows.length > 0 && (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="nexus-ingest-label font-mono text-[9px] font-bold uppercase tracking-wider">
                Imported messages {selectedImportIndex + 1}/{importRows.length}
              </span>
              <button
                type="button"
                onClick={loadNextImportedRow}
                disabled={importRows.length < 2}
                className="nexus-tool-secondary-action inline-flex items-center border px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase disabled:opacity-50"
              >
                Next
                <ChevronRight size={12} className="ml-1" />
              </button>
            </div>
            <div className={clsx('nexus-db-list space-y-2 overflow-y-auto pr-1', compact ? 'max-h-24' : 'max-h-36')}>
              {importRows.map((row, index) => {
                const selected = selectedImportIndex === index;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => loadImportedRow(index)}
                    className={clsx('nexus-db-row flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left', selected && 'nexus-db-row--selected')}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[10px] font-bold">{row.id} - {row.type}</span>
                      <span className="nexus-ingest-note block truncate text-[10px]">{row.preview}</span>
                    </span>
                    <span className="nexus-db-check flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">
                      {selected ? 'Y' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {importError && (
          <div className="nexus-import-error mt-3 rounded-xl border px-3 py-2 font-mono text-[10px]">
            {importError}
          </div>
        )}
      </section>
    </div>
  );
}
