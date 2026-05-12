import React, { useState } from 'react';
import { Database, ListPlus, X } from 'lucide-react';
import clsx from 'clsx';
import { LOCAL_DB_ROWS } from '../../utils/batchUtils';
import { motion } from 'framer-motion';

export default function DatabaseModal({ isOpen, onClose, onImport }) {
  const [dbConfig, setDbConfig] = useState({
    driver: 'SQLite',
    connection: './data/hl7_messages.db',
    table: 'hl7_messages',
  });
  const [dbStatus, setDbStatus] = useState('idle');
  const [dbRows, setDbRows] = useState([]);
  const [selectedDbIds, setSelectedDbIds] = useState([]);

  const handleConnectDatabase = () => {
    setDbStatus('connected');
    setDbRows(LOCAL_DB_ROWS);
    setSelectedDbIds(LOCAL_DB_ROWS.map((row) => row.id));
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

    onImport(selectedMessages, `${dbConfig.driver} table ${dbConfig.table}`);
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="nexus-config-overlay fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
        className="nexus-config-dialog flex max-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-nexus-red)]">
              Data Ingestion
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 flex items-center">
              <Database size={20} className="mr-2" /> Local Database Source
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[120px_1fr_140px]">
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Driver</span>
              <select
                value={dbConfig.driver}
                onChange={(e) => setDbConfig({ ...dbConfig, driver: e.target.value })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] outline-none focus:border-[var(--color-nexus-red)]"
              >
                <option>SQLite</option>
                <option>PostgreSQL</option>
                <option>MySQL</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Connection</span>
              <input
                value={dbConfig.connection}
                onChange={(e) => setDbConfig({ ...dbConfig, connection: e.target.value })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] outline-none focus:border-[var(--color-nexus-red)]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Table</span>
              <input
                value={dbConfig.table}
                onChange={(e) => setDbConfig({ ...dbConfig, table: e.target.value })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] outline-none focus:border-[var(--color-nexus-red)]"
              />
            </label>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleConnectDatabase}
              className="bg-slate-900 text-white px-6 py-2.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-sm"
            >
              Connect and list HL7 messages
            </button>
          </div>

          {dbRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Detected Rows ({dbRows.length})
                </span>
                <span className="text-[10px] font-mono text-green-600 font-bold uppercase">
                  Connected
                </span>
              </div>
              <div className="max-h-60 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                {dbRows.map((row) => {
                  const selected = selectedDbIds.includes(row.id);
                  return (
                    <button
                      key={row.id}
                      onClick={() => toggleDbRow(row.id)}
                      className={clsx(
                        'flex w-full items-center justify-between gap-4 rounded-md border p-3 text-left transition-all',
                        selected ? 'border-red-200 bg-red-50/50 ring-1 ring-red-100' : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] font-bold text-slate-900">{row.id}</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 font-mono">{row.type}</span>
                        </div>
                        <div className="mt-1 flex items-center space-x-2 text-[10px] text-slate-500">
                          <span className="truncate">{row.patient}</span>
                          <span>•</span>
                          <span className="flex-shrink-0">{row.receivedAt}</span>
                        </div>
                      </div>
                      <div className={clsx(
                        'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border text-[9px] font-bold transition-colors',
                        selected ? 'bg-[var(--color-nexus-red)] border-[var(--color-nexus-red)] text-white' : 'border-slate-300 text-transparent'
                      )}>
                        {selected ? '✓' : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white p-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={loadSelectedDbRows}
            disabled={selectedDbIds.length === 0}
            className="flex items-center bg-[var(--color-nexus-red)] text-white px-6 py-2 rounded-md font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-red-800 transition-colors disabled:opacity-50 shadow-md"
          >
            <ListPlus size={14} className="mr-2" />
            Load Selected ({selectedDbIds.length})
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

