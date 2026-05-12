export const LOCAL_DB_ROWS = [
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

export const CSV_MESSAGE_FIELDS = new Set([
  'hl7',
  'hl7_message',
  'hl7message',
  'message',
  'raw_message',
  'rawmessage',
  'payload',
  'content',
]);

export const splitHl7Messages = (text) => (
  text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n\s*\n/)
    .map((message) => message.trim())
    .filter((message) => message.includes('MSH|'))
);

export const collectHl7Strings = (value, output = []) => {
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

export const parseCsvRows = (text) => {
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

export const extractCsvMessages = (text) => {
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

export const extractFileMessages = (fileName, text) => {
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
