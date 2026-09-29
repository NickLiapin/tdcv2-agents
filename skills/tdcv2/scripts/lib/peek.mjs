/**
 * A short summary of a generated file — shared by scripts/peek.mjs and the MCP
 * server. CSV (with a header) and JSON (an array of objects, or one object per
 * line): row count, then per column — distinct values, empties, the split when
 * there are few values, the range when they are numbers. SQL: INSERT rows per
 * table. Anything else: line count. Plus the first few rows.
 */
/** RFC 4180: quoted fields, doubled quotes, separators and newlines inside quotes. */
function parseCsv(src, sep) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === sep) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

function describe(values, full) {
  const counts = new Map();
  let empty = 0;
  for (const v of values) {
    if (v === '' || v === null || v === undefined) { empty++; continue; }
    const k = typeof v === 'object' ? JSON.stringify(v) : String(v);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const parts = [`${counts.size} distinct`];
  if (empty) parts.push(`${empty} empty`);
  const keys = [...counts.keys()];
  const nums = keys.length && keys.every((k) => k.trim() !== '' && !Number.isNaN(Number(k)));
  if (full || counts.size <= 12) {
    const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, full ? 50 : 12);
    parts.push(top.map(([k, n]) => `${k.length > 40 ? `${k.slice(0, 37)}…` : k} ${n}`).join(', '));
    if (full && counts.size > 50) parts.push(`… ${counts.size - 50} more`);
  } else if (nums) {
    const ns = keys.map(Number);
    parts.push(`${Math.min(...ns)} … ${Math.max(...ns)}`);
  } else {
    const lens = keys.map((k) => k.length);
    parts.push(`length ${Math.min(...lens)}–${Math.max(...lens)}, e.g. ${keys.slice(0, 2).map((k) => JSON.stringify(k.slice(0, 30))).join(', ')}`);
  }
  if (counts.size === values.length - empty && counts.size > 1 && !(full || counts.size <= 12)) parts.push('all unique');
  return parts.join(', ');
}

/**
 * @param {string} text   the file's contents
 * @param {{ name: string, ext: string, column?: string, rows?: number }} opts
 * @returns {{ lines: string[], ok: boolean }}
 */
export function summarize(text, { name, ext, column, rows: sampleRows = 3 }) {
  const out = [];
  let ok = true;
  ext = ext.toLowerCase();
  function table(kind, head, rows, sample) {
    out.push(`${name} — ${kind}, ${rows.length} rows, ${head.length} columns`);
    const width = Math.min(24, Math.max(...head.map((h) => h.length)));
    for (const [i, h] of head.entries()) {
      if (column && h !== column) continue;
      out.push(`  ${h.padEnd(width)}  ${describe(rows.map((r) => r[i]), Boolean(column))}`);
    }
    if (column && !head.includes(column)) out.push(`  no column "${column}"; columns: ${head.join(', ')}`);
    if (!column && sampleRows > 0) {
      out.push('first rows:');
      for (const s of sample.slice(0, sampleRows)) out.push(`  ${s.length > 200 ? `${s.slice(0, 197)}…` : s}`);
    }
  }

  function asJson() {
    let data;
    try { data = JSON.parse(text); } catch {
      // One object per line (NDJSON)?
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      try { data = lines.map((l) => JSON.parse(l)); } catch (e) {
        out.push(`${name} — not valid JSON: ${e.message}`);
        ok = false;
        return;
      }
    }
    if (!Array.isArray(data)) {
      out.push(`${name} — JSON ${typeof data}, not an array; top-level keys: ${Object.keys(data ?? {}).slice(0, 20).join(', ')}`);
      return;
    }
    const head = [...new Set(data.flatMap((o) => (o && typeof o === 'object' ? Object.keys(o) : [])))];
    table('JSON array', head, data.map((o) => head.map((h) => o?.[h])), data.map((o) => JSON.stringify(o)));
  }

  function asSql() {
    const per = new Map();
    const re = /INSERT\s+INTO\s+([\w."`\[\]]+)[^;]*?VALUES\s*([\s\S]*?);\s*(?=INSERT|$|\n)/gi;
    let m;
    while ((m = re.exec(text))) {
      const t = m[1].replace(/["`\[\]]/g, '');
      // Tuples: count top-level parentheses outside string literals.
      let depth = 0, inStr = false, tuples = 0;
      for (let i = 0; i < m[2].length; i++) {
        const c = m[2][i];
        if (inStr) { if (c === "'" && m[2][i + 1] === "'") i++; else if (c === "'") inStr = false; }
        else if (c === "'") inStr = true;
        else if (c === '(') { if (depth++ === 0) tuples++; }
        else if (c === ')') depth--;
      }
      per.set(t, (per.get(t) ?? 0) + tuples);
    }
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    out.push(`${name} — SQL, ${lines.length} non-empty lines`);
    if (!per.size) out.push('  no INSERT … VALUES statements found');
    for (const [t, n] of per) out.push(`  ${t}: ${n} rows inserted`);
    if (/CREATE\s+TABLE/i.test(text)) out.push('  has CREATE TABLE');
    if (sampleRows > 0) {
      out.push('first lines:');
      for (const l of lines.slice(0, sampleRows)) out.push(`  ${l.length > 200 ? `${l.slice(0, 197)}…` : l}`);
    }
  }

  if (ext === '.json' || ext === '.ndjson' || ext === '.jsonl') asJson();
  else if (ext === '.csv' || ext === '.tsv') {
    const rows = parseCsv(text, ext === '.tsv' ? '\t' : text.split('\n')[0].includes(';') && !text.split('\n')[0].includes(',') ? ';' : ',');
    const [head = [], ...body] = rows;
    const widths = new Set(body.map((r) => r.length));
    table('CSV', head, body, text.split(/\r?\n/).slice(1));
    if (widths.size > 1) out.push(`  rows have different field counts: ${[...widths].join(', ')} — a value with an unquoted separator?`);
  } else if (ext === '.sql') asSql();
  else {
    const lines = text.split(/\r?\n/);
    if (lines.at(-1) === '') lines.pop();
    out.push(`${name} — ${lines.length} lines`);
    for (const l of lines.slice(0, sampleRows)) out.push(`  ${l.length > 200 ? `${l.slice(0, 197)}…` : l}`);
  }
  return { lines: out, ok };
}
