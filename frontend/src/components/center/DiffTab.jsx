import React, { useState } from 'react';
import { useNexusStore } from '../../store/nexusStore';
import { Play } from 'lucide-react';
import clsx from 'clsx';

/**
 * H-05: Segment-aware HL7 diff engine.
 * Instead of naive line-by-line comparison, this matches segments by their
 * 3-letter identifier and compares fields within matched segments.
 */

function parseSegments(msg) {
  const normalized = msg.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter(l => l.trim());
  return lines.map(line => ({
    name: line.substring(0, 3),
    raw: line,
    fields: line.split('|'),
  }));
}

function buildSegmentDiff(segs1, segs2) {
  const diff = [];
  const used2 = new Set();

  // Match segments by name (first occurrence matching)
  for (let i = 0; i < segs1.length; i++) {
    const seg1 = segs1[i];
    let matchIdx = -1;

    // Find matching segment in msg2 that hasn't been used yet
    for (let j = 0; j < segs2.length; j++) {
      if (!used2.has(j) && segs2[j].name === seg1.name) {
        matchIdx = j;
        used2.add(j);
        break;
      }
    }

    if (matchIdx === -1) {
      // Segment exists in msg1 but not msg2
      diff.push({ type: 'removed', segment: seg1.name, text: seg1.raw, fields: [] });
    } else {
      const seg2 = segs2[matchIdx];
      if (seg1.raw === seg2.raw) {
        diff.push({ type: 'unchanged', segment: seg1.name, text: seg1.raw, fields: [] });
      } else {
        // Segments match by name but have different content — do field-level diff
        const fieldDiffs = [];
        const maxFields = Math.max(seg1.fields.length, seg2.fields.length);
        for (let f = 0; f < maxFields; f++) {
          const f1 = seg1.fields[f] || '';
          const f2 = seg2.fields[f] || '';
          if (f1 !== f2) {
            fieldDiffs.push({ index: f, old: f1, new: f2 });
          }
        }
        diff.push({
          type: 'modified',
          segment: seg1.name,
          text: seg2.raw,
          oldText: seg1.raw,
          fields: fieldDiffs
        });
      }
    }
  }

  // Any segments in msg2 that weren't matched → added
  for (let j = 0; j < segs2.length; j++) {
    if (!used2.has(j)) {
      diff.push({ type: 'added', segment: segs2[j].name, text: segs2[j].raw, fields: [] });
    }
  }

  return diff;
}

export default function DiffTab() {
  const [msg1, setMsg1] = useState("MSH|^~\\&|APP1|FAC1|APP2|FAC2|20260510||ADT^A01|MSG1|P|2.5.1\nPID|1||12345||DOE^JOHN||19800101|M");
  const [msg2, setMsg2] = useState("MSH|^~\\&|APP1|FAC1|APP2|FAC2|20260510||ADT^A01|MSG2|P|2.5.1\nPID|1||12345||DOE^JOHN^A||19800101|M\nPV1|1|I|WARD1");
  const [diffResult, setDiffResult] = useState(null);
  
  const addEvent = useNexusStore((state) => state.addEvent);

  const handleDiff = () => {
    addEvent({
      type: 'EventType.USER_ACTION',
      engine: 'algorithm',
      detail: 'Initiated segment-aware HL7 diff comparison',
      severity: 'INFO'
    });

    const segs1 = parseSegments(msg1);
    const segs2 = parseSegments(msg2);
    const diff = buildSegmentDiff(segs1, segs2);
    setDiffResult(diff);
  };

  const downloadDiff = () => {
    if (!diffResult) return;
    const content = diffResult.map(entry => {
      const prefix = entry.type === 'added' ? '+' : entry.type === 'removed' ? '-' : entry.type === 'modified' ? '~' : ' ';
      let line = `${prefix} ${entry.text}`;
      if (entry.type === 'modified' && entry.fields.length > 0) {
        line += `\n  Changes: ${entry.fields.map(f => `Field ${f.index}: "${f.old}" → "${f.new}"`).join(', ')}`;
      }
      return line;
    }).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hl7_diff_report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]">
          Segment-aware comparison
        </span>
        <button 
          onClick={handleDiff}
          className="nexus-tool-action flex items-center border px-6 py-2 font-mono text-[11px] font-bold uppercase tracking-widest"
        >
          COMPARE MESSAGES <Play size={14} className="ml-2" />
        </button>
      </div>

      {/* Input Split */}
      <div className="flex space-x-4 h-48">
        <textarea 
          value={msg1}
          onChange={(e) => setMsg1(e.target.value)}
          className="nexus-tool-textarea flex-1 resize-none border-2 border-black p-3 font-mono text-[10px] focus:outline-none"
          placeholder="Original HL7 message..."
        />
        <textarea 
          value={msg2}
          onChange={(e) => setMsg2(e.target.value)}
          className="nexus-tool-textarea flex-1 resize-none border-2 border-black p-3 font-mono text-[10px] focus:outline-none"
          placeholder="Modified HL7 message..."
        />
      </div>

      {/* Output */}
      <div className="nexus-tool-panel nexus-diff-panel flex-1 flex flex-col border-2 border-black min-h-0">
        <div className="nexus-tool-panel-header nexus-tool-panel-header--accent px-3 py-1.5 border-b-2 border-black bg-[var(--color-nexus-red)]">
          <span className="text-white text-[11px] font-semibold uppercase tracking-[0.14em]">
            Comparison output
          </span>
        </div>
        <div className="nexus-diff-body flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1">
          {diffResult ? diffResult.map((entry, i) => (
            <div key={i}>
              <div className={clsx("px-2 py-0.5", {
                'bg-green-900/50 text-green-400': entry.type === 'added',
                'bg-red-900/50 text-red-400': entry.type === 'removed',
                'bg-amber-900/30 text-amber-300': entry.type === 'modified',
              })}>
                <span className="mr-2 inline-block w-4 text-center font-bold">
                  {entry.type === 'added' ? '+' : entry.type === 'removed' ? '-' : entry.type === 'modified' ? '~' : ' '}
                </span>
                <span className="nexus-diff-segment mr-2">[{entry.segment}]</span>
                {entry.type === 'modified' ? entry.oldText : entry.text}
              </div>
              {/* Show field-level diffs for modified segments */}
              {entry.type === 'modified' && entry.fields.map((f, fi) => (
                <div key={fi} className="pl-8 py-0.5 text-[10px]">
                  <span className="nexus-diff-segment">Field {f.index}:</span>{' '}
                  <span className="text-red-400 line-through">{f.old || '(empty)'}</span>
                  {' → '}
                  <span className="text-green-400">{f.new || '(empty)'}</span>
                </div>
              ))}
            </div>
          )) : (
            <div className="nexus-tool-empty h-full flex items-center justify-center">
              Awaiting comparison
            </div>
          )}
        </div>
        {diffResult && (
          <div className="nexus-diff-footer p-2 border-t-2 border-black flex justify-between items-center">
            <span className="nexus-diff-meta font-mono text-[9px]">
              {diffResult.filter(d => d.type === 'unchanged').length} unchanged · 
              {diffResult.filter(d => d.type === 'modified').length} modified · 
              {diffResult.filter(d => d.type === 'added').length} added · 
              {diffResult.filter(d => d.type === 'removed').length} removed
            </span>
            <button onClick={downloadDiff} className="nexus-tool-secondary-action border px-4 py-1 font-mono text-[9px] font-bold uppercase">
              [EXPORT DIFF REPORT]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
