import { db, normalizeCustomerId } from '../db/database.js';

/**
 * Dataset Intelligence Engine (spec §7)
 *
 * Parses CSV/JSON negotiation datasets, validates types/required columns,
 * reports valid/invalid/duplicate/missing rows, and imports ONLY validated rows.
 * Invalid data is never silently discarded — every rejected row is reported.
 */

const REQUIRED_FIELDS = ['customer', 'segment'];
const KNOWN_OUTCOMES = ['WON', 'LOST', 'PENDING'];

/**
 * Minimal RFC-4180-ish CSV parser: handles quoted fields, embedded commas,
 * escaped double-quotes, and CRLF/LF line endings.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = String(text || '').replace(/^\uFEFF/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\r') {
      // ignore, handled by \n
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(r => r.some(cell => String(cell).trim() !== ''));
}

function csvRowsToObjects(rows) {
  if (rows.length === 0) return [];
  const header = rows[0].map(h => String(h).trim());
  return rows.slice(1).map(cells => {
    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = cells[idx] !== undefined ? String(cells[idx]).trim() : '';
    });
    return obj;
  });
}

export function parseDataset(content, format = 'auto') {
  const fmt = String(format || 'auto').toLowerCase();
  const raw = String(content || '').trim();

  if (fmt === 'csv' || (fmt === 'auto' && looksLikeCsv(raw)) || (fmt === 'json' && looksLikeCsv(raw))) {
    return { format: 'csv', records: csvRowsToObjects(parseCsv(raw)) };
  }
  
  // JSON: accept an array or { negotiations: [...] } / { data: [...] }
  try {
    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.negotiations)
      ? parsed.negotiations
      : Array.isArray(parsed?.data)
      ? parsed.data
      : Array.isArray(parsed?.items)
      ? parsed.items
      : null;
    if (!records) {
      throw new Error('JSON dataset must be an array of records (or { negotiations: [...] }).');
    }
    return { format: 'json', records };
  } catch (err) {
    if (looksLikeCsv(raw)) {
      return { format: 'csv', records: csvRowsToObjects(parseCsv(raw)) };
    }
    throw err;
  }
}

function looksLikeCsv(content) {
  const firstLine = String(content || '').split(/\r?\n/)[0] || '';
  return !firstLine.trim().startsWith('[') && !firstLine.trim().startsWith('{') && firstLine.includes(',');
}

function toBool(value) {
  if (typeof value === 'boolean') return value;
  const s = String(value).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1' || s === 'y';
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(value);
  return isNaN(n) ? NaN : n;
}

/**
 * Validate + normalize a single raw record. Returns { valid, record, errors, warnings }.
 */
export function validateRecord(raw, index) {
  const errors = [];
  const warnings = [];

  const rec = {
    deal_id: raw.deal_id ?? raw.dealId ?? null,
    customer: raw.customer ?? raw.customer_name ?? null,
    customer_id: raw.customer_id ?? raw.customerId ?? null,
    segment: raw.segment ?? null,
    industry: raw.industry ?? null,
    date: raw.date ?? null,
    objection: raw.objection ?? null,
    strategy: raw.strategy ?? null,
    concession_percent: raw.concession_percent ?? raw.concessionPercent ?? raw.requested_discount_percent ?? raw.requestedDiscountPercent ?? null,
    competitor_pressure: raw.competitor_pressure ?? raw.competitorPressure ?? null,
    contract_years: raw.contract_years ?? raw.contractYears ?? null,
    outcome: raw.outcome ?? null,
    outcome_reason: raw.outcome_reason ?? raw.outcomeReason ?? null,
    memory_type: raw.memory_type ?? 'experience'
  };

  for (const field of REQUIRED_FIELDS) {
    if (!rec[field] || String(rec[field]).trim() === '') {
      errors.push(`Row ${index + 1}: missing required field '${field}'.`);
    }
  }

  const concession = toNumberOrNull(rec.concession_percent);
  if (concession === null) {
    warnings.push(`Row ${index + 1}: 'concession_percent' missing; defaulting to 0.`);
    rec.concession_percent = 0;
  } else if (isNaN(concession)) {
    errors.push(`Row ${index + 1}: 'concession_percent' is not a number.`);
  } else if (concession < 0 || concession > 100) {
    errors.push(`Row ${index + 1}: 'concession_percent' must be between 0 and 100.`);
  } else {
    rec.concession_percent = concession;
  }

  const years = toNumberOrNull(rec.contract_years);
  if (years === null) {
    rec.contract_years = 1;
  } else if (isNaN(years) || !Number.isInteger(years) || years < 1) {
    errors.push(`Row ${index + 1}: 'contract_years' must be a positive integer.`);
  } else {
    rec.contract_years = years;
  }

  const outcome = String(rec.outcome || 'PENDING').toUpperCase();
  if (!KNOWN_OUTCOMES.includes(outcome)) {
    errors.push(`Row ${index + 1}: 'outcome' must be one of ${KNOWN_OUTCOMES.join(', ')}.`);
  } else {
    rec.outcome = outcome;
  }

  rec.competitor_pressure = toBool(rec.competitor_pressure);

  if (!rec.customer_id && rec.customer) {
    rec.customer_id = normalizeCustomerId(rec.customer);
  }
  if (!rec.deal_id) {
    rec.deal_id = `DEAL-IMP-${Date.now()}-${index + 1}`;
    warnings.push(`Row ${index + 1}: 'deal_id' missing; generated '${rec.deal_id}'.`);
  }

  return { valid: errors.length === 0, record: rec, errors, warnings };
}

/**
 * Validate an entire dataset and produce a preview + quality report WITHOUT importing.
 */
export function validateDataset(content, format = 'json') {
  let parsed;
  try {
    parsed = parseDataset(content, format);
  } catch (err) {
    return {
      ok: false,
      fatal: err.message,
      format: format || 'json',
      summary: { totalRows: 0, validRows: 0, invalidRows: 0, duplicateRows: 0, missingValueRows: 0 },
      preview: [],
      errors: [{ row: null, message: err.message }],
      warnings: []
    };
  }

  const records = parsed.records || [];
  const errors = [];
  const warnings = [];
  const validRecords = [];
  const seenDealIds = new Set();
  const existingDealIds = new Set(
    db.prepare('SELECT deal_id FROM negotiations').all().map(r => r.deal_id)
  );
  let duplicateRows = 0;
  let invalidRows = 0;
  let missingValueRows = 0;

  records.forEach((raw, idx) => {
    const res = validateRecord(raw, idx);
    // Missing-value accounting (present but empty in the source)
    const rawValues = Object.values(raw || {});
    if (rawValues.some(v => v === null || v === undefined || String(v).trim() === '')) {
      missingValueRows++;
    }

    if (!res.valid) {
      invalidRows++;
      errors.push(...res.errors);
      return;
    }

    if (seenDealIds.has(res.record.deal_id) || existingDealIds.has(res.record.deal_id)) {
      duplicateRows++;
      warnings.push(`Row ${idx + 1}: duplicate deal_id '${res.record.deal_id}' — will be skipped/replaced.`);
    } else {
      seenDealIds.add(res.record.deal_id);
    }

    warnings.push(...res.warnings);
    validRecords.push(res.record);
  });

  return {
    ok: true,
    format: parsed.format,
    summary: {
      totalRows: records.length,
      validRows: validRecords.length,
      invalidRows,
      duplicateRows,
      missingValueRows
    },
    preview: validRecords.slice(0, 10),
    records: validRecords,
    errors,
    warnings
  };
}

/**
 * Import validated rows into the negotiations table. Returns an import report.
 * Only valid rows are imported; the caller persists the report.
 */
export function importDataset({ content, format = 'auto', filename = 'dataset', tenantId = 'tenant_default', importedBy = null, replaceExisting = true }) {
  const report = validateDataset(content, format);
  const importId = `IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  if (!report.ok) {
    const row = {
      tenant_id: tenantId,
      import_id: importId,
      filename,
      format,
      total_rows: 0,
      valid_rows: 0,
      invalid_rows: 0,
      duplicate_rows: 0,
      imported_rows: 0,
      status: 'FAILED',
      errors_json: JSON.stringify(report.errors || []),
      warnings_json: JSON.stringify(report.warnings || []),
      imported_by: importedBy,
      created_at: now
    };
    db.prepare(`
      INSERT INTO dataset_imports (tenant_id, import_id, filename, format, total_rows, valid_rows, invalid_rows, duplicate_rows, imported_rows, status, errors_json, warnings_json, imported_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(row.tenant_id, row.import_id, row.filename, row.format, row.total_rows, row.valid_rows, row.invalid_rows, row.duplicate_rows, row.imported_rows, row.status, row.errors_json, row.warnings_json, row.imported_by, row.created_at);
    return { ok: false, importId, status: 'FAILED', summary: report.summary, errors: report.errors, warnings: report.warnings };
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO negotiations (
      tenant_id, deal_id, customer, customer_id, segment, industry, date, objection,
      initial_offer, counter_offer, requested_discount_percent, strategy,
      concession_percent, competitor_pressure, contract_years, outcome, outcome_reason,
      customer_user_id, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'IMPORTED', ?)
  `);

  let imported = 0;
  db.transaction(() => {
    if (replaceExisting) {
      db.prepare('DELETE FROM negotiations WHERE tenant_id = ?').run(tenantId);
      db.prepare('DELETE FROM learning_timeline WHERE tenant_id = ?').run(tenantId);
      db.prepare('DELETE FROM negotiation_approvals WHERE tenant_id = ?').run(tenantId);
      db.prepare('DELETE FROM hindsight_outbox WHERE tenant_id = ?').run(tenantId);
      db.prepare('DELETE FROM agent_checkpoints WHERE tenant_id = ?').run(tenantId);
    }
    for (const r of report.records) {
      const concession = Number(r.concession_percent) || 0;
      const initialOffer = Number(r.initial_offer ?? r.deal_value ?? 100000) || 100000;
      const counterOffer = Math.round(initialOffer * (1 - concession / 100));
      insert.run(
        tenantId,
        r.deal_id,
        r.customer,
        r.customer_id || normalizeCustomerId(r.customer),
        r.segment,
        r.industry || 'technology',
        r.date || now.slice(0, 10),
        r.objection || 'Price',
        initialOffer,
        counterOffer,
        concession,
        r.strategy || 'Imported historical strategy',
        concession,
        r.competitor_pressure ? 1 : 0,
        r.contract_years || 1,
        r.outcome || 'PENDING',
        r.outcome_reason || '',
        now
      );
      imported++;
    }
  })();

  const status = report.summary.invalidRows > 0 ? 'IMPORTED_WITH_WARNINGS' : 'IMPORTED';
  const summary = { ...report.summary, importedRows: imported };

  db.prepare(`
    INSERT INTO dataset_imports (tenant_id, import_id, filename, format, total_rows, valid_rows, invalid_rows, duplicate_rows, imported_rows, status, errors_json, warnings_json, imported_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tenantId, importId, filename, report.format,
    report.summary.totalRows, report.summary.validRows, report.summary.invalidRows,
    report.summary.duplicateRows, imported, status,
    JSON.stringify(report.errors || []), JSON.stringify(report.warnings || []),
    importedBy, now
  );

  return { ok: true, importId, status, summary, errors: report.errors, warnings: report.warnings };
}

export function listDatasetImports(tenantId = 'tenant_default') {
  return db.prepare('SELECT * FROM dataset_imports WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 30')
    .all(tenantId)
    .map(row => ({
      ...row,
      errors: safeParse(row.errors_json),
      warnings: safeParse(row.warnings_json)
    }));
}

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    return [];
  }
}
