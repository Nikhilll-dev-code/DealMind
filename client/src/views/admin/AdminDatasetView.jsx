import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, FileCheck2, AlertTriangle, XCircle, CheckCircle2, Database,
  Loader2, History, Copy, Info, RotateCcw, Sparkles
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { validateDataset, importDataset, getDatasetImports, resetDemo } from '../../services/api';
import { formatDateTime } from '../../lib/format';
import Button from '../../components/common/Button';

const SAMPLE_JSON = JSON.stringify([
  { deal_id: 'DEAL-SAMPLE-1', customer: 'Acme Corp', segment: 'enterprise', industry: 'technology', concession_percent: 8, contract_years: 2, outcome: 'WON', competitor_pressure: true, strategy: '8% + support package' },
  { deal_id: 'DEAL-SAMPLE-2', customer: 'Acme Corp', segment: 'enterprise', industry: 'technology', concession_percent: 22, contract_years: 1, outcome: 'LOST', competitor_pressure: false, strategy: 'Deep price cut' }
], null, 2);

const SAMPLE_CSV = `deal_id,customer,segment,industry,date,objection,strategy,concession_percent,competitor_pressure,contract_years,outcome,outcome_reason
DEAL-2024-001,Acme Corp,enterprise,technology,2024-01-15,Price is 20% higher than competitor,Offered 12% discount in exchange for 3-year term commitment and case study,12,true,3,WON,Customer signed 3-year enterprise contract with annual upfront billing.
DEAL-2024-002,Acme Corp,enterprise,technology,2024-02-10,Demanded 25% price cut without term extension,Held firm at 8% maximum discount and added premium 24/7 SLA,8,true,1,LOST,Competitor offered 30% discount; customer chose budget option.
DEAL-2024-003,Stark Industries,enterprise,fintech,2024-01-22,Budget capped for current fiscal quarter,Restructured payment schedule across quarterly tranches with 5% discount,5,false,2,WON,CFO approved quarterly milestone payment structure.
DEAL-2024-004,Stark Industries,enterprise,fintech,2024-02-18,Competitor offering free implementation,Bundled white-glove onboarding and technical training at 10% concession,10,true,2,WON,Customer valued dedicated solutions architect and fast time-to-value.
DEAL-2024-005,Wayne Enterprises,enterprise,security,2024-01-30,Hesitant on multi-year lock-in,Offered 1-year contract with 7% concession and guaranteed renewal price lock,7,false,1,WON,Risk mitigated by 1-year trial with capped year-2 rate.`;

export default function AdminDatasetView() {
  const toast = useToast();
  const fileRef = useRef(null);

  const [content, setContent] = useState('');
  const [filename, setFilename] = useState('dataset');
  const [format, setFormat] = useState('auto');
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [report, setReport] = useState(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [history, setHistory] = useState([]);

  const loadHistory = () => getDatasetImports().then(h => setHistory(Array.isArray(h) ? h : [])).catch(() => {});
  useEffect(() => { loadHistory(); }, []);

  const detectFormat = (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed) return 'auto';
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) return 'json';
    if (trimmed.includes(',') && (trimmed.includes('\n') || trimmed.includes('deal_id') || trimmed.includes('customer'))) return 'csv';
    return 'auto';
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const inferred = file.name.toLowerCase().endsWith('.csv') ? 'csv' : file.name.toLowerCase().endsWith('.json') ? 'json' : 'auto';
    setFormat(inferred);
    const reader = new FileReader();
    reader.onload = () => {
      const txt = String(reader.result || '');
      setContent(txt);
      if (inferred === 'auto') setFormat(detectFormat(txt));
    };
    reader.readAsText(file);
  };

  const handleContentChange = (val) => {
    setContent(val);
    const auto = detectFormat(val);
    if (auto !== 'auto') {
      setFormat(auto);
    }
  };

  const handleValidate = async () => {
    if (!content.trim()) { toast.warning('No data', 'Upload a file or paste dataset content first.'); return; }
    setValidating(true);
    setReport(null);
    try {
      const activeFormat = format === 'auto' ? detectFormat(content) : format;
      const res = await validateDataset(content, activeFormat, filename);
      setReport(res);
      toast.success('Validation complete', `${res.summary.validRows} valid · ${res.summary.invalidRows} invalid`);
    } catch (err) {
      toast.error('Validation failed', err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!content.trim()) return;
    setImporting(true);
    try {
      const activeFormat = format === 'auto' ? detectFormat(content) : format;
      const res = await importDataset(content, activeFormat, filename, replaceExisting);
      if (res.ok) {
        toast.success('Import complete', `${res.summary.importedRows} records imported (replaced existing deals).`);
      } else {
        toast.error('Import rejected', 'The dataset failed validation.');
      }
      setReport({ ...report, ...res });
      loadHistory();
    } catch (err) {
      toast.error('Import failed', err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleResetToDemo = async () => {
    if (!window.confirm('Reset this tenant to canonical demo dataset (Acme Corp historical data, 12 deals)?')) return;
    setResetting(true);
    try {
      await resetDemo();
      setContent('');
      setFilename('dataset');
      setReport(null);
      await loadHistory();
      toast.success('Demo Dataset Restored', 'Re-seeded canonical Acme Corp dataset (12 deals) & baseline learning timeline.');
    } catch (err) {
      toast.error('Reset Failed', err.message);
    } finally {
      setResetting(false);
    }
  };

  const summary = report?.summary;

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <div className="mb-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dm-ink">Dataset Management</h1>
          <p className="mt-1.5 text-sm text-dm-muted">
            Upload custom CSV or JSON datasets, or restore the canonical Acme Corp demonstration dataset.
          </p>
        </div>
        <div>
          <Button
            variant="outline"
            onClick={handleResetToDemo}
            loading={resetting}
            className="border-dm-blue/40 text-dm-blue hover:bg-dm-tint/60 text-xs font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-dm-blue" />
            Reset to Demo Data (Acme Corp)
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-white border border-dm-border rounded-2xl shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-dm-ink flex items-center gap-2"><Upload className="w-4 h-4 text-dm-blue" /> Source</h2>
              <div className="flex items-center gap-2">
                <select value={format} onChange={e => setFormat(e.target.value)} className="text-xs border border-dm-border rounded-lg px-2 py-1.5 bg-white font-medium">
                  <option value="auto">Auto Detect</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
                <button onClick={() => { setContent(SAMPLE_CSV); setFormat('csv'); setFilename('sample_deals.csv'); }} className="text-xs font-semibold text-dm-blue hover:text-dm-deep inline-flex items-center gap-1 bg-dm-tint/60 px-2 py-1 rounded-lg">
                  <Copy className="w-3.5 h-3.5" /> Sample CSV
                </button>
                <button onClick={() => { setContent(SAMPLE_JSON); setFormat('json'); setFilename('sample.json'); }} className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 px-1.5 py-1">
                  JSON
                </button>
              </div>
            </div>

            <input ref={fileRef} type="file" accept=".csv,.json" onChange={onFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-dm-border rounded-xl py-6 text-center hover:border-dm-blue/40 hover:bg-dm-tint/30 transition"
            >
              <Upload className="w-5 h-5 text-dm-muted mx-auto mb-2" />
              <div className="text-xs font-semibold text-dm-ink">Click to upload CSV or JSON</div>
              <div className="text-[11px] text-dm-muted mt-0.5">{filename || 'No file selected'}</div>
            </button>

            <textarea
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              rows={6}
              placeholder="…or paste CSV or JSON dataset content here"
              className="mt-3 w-full bg-dm-bg border border-dm-border rounded-xl p-3 text-[11px] font-mono text-dm-ink focus:outline-none focus:border-dm-blue resize-y"
            />

            {/* Replace Existing Data Option */}
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                  className="w-4 h-4 rounded text-dm-blue focus:ring-dm-blue border-gray-300"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Replace all existing deals (Clean Sync)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Clears old records and syncs this new dataset across both Sales Rep & Admin workspaces.
                  </div>
                </div>
              </label>
            </div>

            <div className="mt-3 flex gap-2">
              <Button onClick={handleValidate} loading={validating} variant="outline" className="flex-1">
                <FileCheck2 className="w-3.5 h-3.5" /> Validate & preview
              </Button>
              <Button onClick={handleImport} loading={importing} disabled={!report?.ok} className="flex-1">
                <Database className="w-3.5 h-3.5" /> Import dataset
              </Button>
            </div>
          </div>

          {report && (
            <div className="bg-white border border-dm-border rounded-2xl shadow-card p-5 animate-fade-up">
              {!report.ok ? (
                <div className="flex items-start gap-2.5 text-rose-700 text-xs">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Could not parse the dataset: {report.fatal}</span>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-dm-ink mb-3">Validation report</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      ['Total rows', summary.totalRows, 'text-dm-ink'],
                      ['Valid', summary.validRows, 'text-emerald-600'],
                      ['Invalid', summary.invalidRows, 'text-rose-500'],
                      ['Duplicates', summary.duplicateRows, 'text-amber-600']
                    ].map(([k, v, tone]) => (
                      <div key={k} className="rounded-xl border border-dm-border bg-dm-bg/60 p-3">
                        <div className="text-[10px] uppercase tracking-wider text-dm-muted font-semibold">{k}</div>
                        <div className={`text-lg font-black ${tone}`}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {report.errors?.length > 0 && (
                    <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200">
                      <div className="text-[11px] font-bold text-rose-700 mb-1.5 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> {report.errors.length} validation error(s)</div>
                      <ul className="space-y-1 max-h-40 overflow-y-auto">
                        {report.errors.slice(0, 12).map((e, i) => <li key={i} className="text-[11px] text-rose-600">• {e}</li>)}
                      </ul>
                    </div>
                  )}

                  {report.warnings?.length > 0 && (
                    <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="text-[11px] font-bold text-amber-700 mb-1.5 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {report.warnings.length} warning(s)</div>
                      <ul className="space-y-1 max-h-32 overflow-y-auto">
                        {report.warnings.slice(0, 10).map((w, i) => <li key={i} className="text-[11px] text-amber-700">• {w}</li>)}
                      </ul>
                    </div>
                  )}

                  {report.preview?.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold text-dm-ink mb-2">Preview (first {report.preview.length} valid rows)</div>
                      <div className="overflow-x-auto rounded-xl border border-dm-border">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-dm-subtle/60">
                            <tr>{['deal_id', 'customer', 'segment', 'discount', 'term', 'outcome'].map(h => (
                              <th key={h} className="px-3 py-2 font-bold uppercase tracking-wider text-dm-muted">{h}</th>
                            ))}</tr>
                          </thead>
                          <tbody>
                            {report.preview.map((r, i) => (
                              <tr key={i} className="border-t border-dm-border">
                                <td className="px-3 py-2 font-mono text-dm-ink">{r.deal_id}</td>
                                <td className="px-3 py-2 text-dm-ink">{r.customer}</td>
                                <td className="px-3 py-2 text-dm-muted">{r.segment}</td>
                                <td className="px-3 py-2 text-dm-ink">{r.concession_percent}%</td>
                                <td className="px-3 py-2 text-dm-muted">{r.contract_years}y</td>
                                <td className="px-3 py-2 font-semibold text-dm-ink">{r.outcome}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {report.importId && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                      <CheckCircle2 className="w-4 h-4" /> Import {report.status} · ID {report.importId}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-dm-border rounded-2xl shadow-card p-5">
            <h2 className="text-sm font-bold text-dm-ink mb-3 flex items-center gap-2"><History className="w-4 h-4 text-dm-blue" /> Import history</h2>
            {history.length === 0 ? (
              <p className="text-xs text-dm-muted">No imports recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map(h => (
                  <div key={h.import_id} className="rounded-xl border border-dm-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-dm-ink truncate">{h.filename}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${h.status.includes('FAILED') ? 'bg-rose-50 text-rose-600' : h.status.includes('WARNING') ? 'bg-amber-50 text-amber-700' : 'bg-dm-soft text-emerald-800'}`}>{h.status}</span>
                    </div>
                    <div className="text-[10px] text-dm-muted mt-1">
                      {h.imported_rows}/{h.total_rows} imported · {h.invalid_rows} invalid · {formatDateTime(h.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 p-4 rounded-2xl bg-dm-tint/50 border border-dm-blue/20 text-[11px] text-dm-deep leading-relaxed flex gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              Supported fields include deal_id, customer, segment, industry, date, objection, strategy,
              concession_percent, competitor_pressure, contract_years, outcome, and outcome_reason.
              Synthetic demo data should be labeled as such.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
