import React, { useState } from 'react';
import { FileUp, X, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { extractFileMessages } from '../../utils/batchUtils';
import { motion } from 'framer-motion';

export default function FileImportModal({ isOpen, onClose, onImport }) {
  const [importSummary, setImportSummary] = useState('');
  const [importError, setImportError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileImport = async (event) => {
    const files = Array.from(event.target.files || []);
    processFiles(files);
  };

  const processFiles = async (files) => {
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

      onImport(importedMessages, `${files.length} imported file(s)`);
      setImportSummary(`${importedMessages.length} HL7 message(s) imported from ${files.length} file(s).`);
      
      setTimeout(onClose, 1500);
    } catch (err) {
      setImportError(err.message || 'Import failed.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
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
        className="nexus-config-dialog flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-nexus-red)]">
              Payload ingestion
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 flex items-center">
              <FileUp size={20} className="mr-2" /> Import Message Files
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 bg-slate-50/50">
          <label 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={clsx(
              "flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all",
              isDragging ? "border-[var(--color-nexus-red)] bg-red-50" : "border-slate-300 bg-white hover:border-slate-400"
            )}
          >
            <div className={clsx(
              "p-4 rounded-full mb-4 transition-colors",
              isDragging ? "bg-red-100 text-[var(--color-nexus-red)]" : "bg-slate-100 text-slate-400"
            )}>
              <FileUp size={32} />
            </div>
            <span className="font-mono text-[12px] font-bold uppercase tracking-wider text-slate-700">
              {isDragging ? 'Drop files now' : 'Select JSON, CSV, HL7, or TXT'}
            </span>
            <p className="mt-2 text-[11px] text-slate-500 max-w-xs leading-relaxed">
              Drag & drop your files here or click to browse. Supports multiple file selection.
            </p>
            <input
              type="file"
              multiple
              accept=".hl7,.txt,.json,.csv,application/json,text/csv,text/plain"
              className="sr-only"
              onChange={handleFileImport}
            />
          </label>

          {importSummary && (
            <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-green-700 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={18} className="flex-shrink-0" />
              <div className="flex-1 font-mono text-[11px] font-bold uppercase leading-tight">
                {importSummary}
              </div>
            </div>
          )}

          {importError && (
            <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-700 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} className="flex-shrink-0" />
              <div className="flex-1 font-mono text-[11px] font-bold uppercase leading-tight">
                {importError}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white p-4 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-md font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-sm">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

