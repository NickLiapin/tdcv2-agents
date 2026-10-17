/**
 * The tools, as plain functions: arguments in, { text, data } out. server.mjs
 * wraps them for MCP; test/smoke.mjs calls them through a real MCP client.
 *
 * Paths are relative to the server's working directory — the project the
 * client started it in — and a file is only ever written inside it.
 */
import { readFileSync, statSync, openSync, readSync, closeSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, relative as nativeRelative, isAbsolute, dirname, basename, extname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lib, readPage, searchDocs, guide } from './skill.mjs';

export const PREVIEW_DEFAULT = 10;
export const PREVIEW_MAX = 50;
/** Above this many records a preview asks for `output` instead of rendering in memory. */
export const IN_MEMORY_MAX = 5000;
const PAGE_CHUNK = 20000;

const ROOT = process.cwd();
/** A path relative to the project, with forward slashes on every OS — the same text on Windows. */
const relative = (from, to) => nativeRelative(from, to).split(sep).join('/');
const OWN_ENGINE = dirname(dirname(fileURLToPath(import.meta.resolve('tdcv2'))));

const engines = new Map();
/**
 * The engine this project uses: its own install, else the server's own — the
 * version this release was checked with. Not some other tdcv2 on PATH: its packs
 * and behaviour may differ from what the skill and the tests promise.
 * TDCV2_ENGINE=<package folder> pins one explicitly.
 */
export async function engine() {
  if (!engines.has(ROOT)) {
    const pinned = process.env.TDCV2_ENGINE;
    const found = pinned
      ? await lib.engine.loadEngine({ cwd: pinned, path: '', fallback: pinned })
      : await lib.engine.loadEngine({ cwd: ROOT, path: '', fallback: OWN_ENGINE });
    if (!found) throw new Error('no tdcv2 engine could be loaded — install it in the project: npm i -D tdcv2@0.3.5');
    engines.set(ROOT, found);
  }
  return engines.get(ROOT);
}

class ToolError extends Error {}

function inside(p, what) {
  const abs = resolve(ROOT, p);
  const rel = nativeRelative(ROOT, abs);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new ToolError(`${what} must be inside the project folder (${ROOT}); got ${p}`);
  return abs;
}

function source({ config, path }) {
  if (Boolean(config) === Boolean(path)) throw new ToolError('give exactly one of `config` (the .tdc text) or `path` (a .tdc file in the project)');
  if (config) return { configString: config };
  const file = inside(path, 'path');
  if (!existsSync(file)) throw new ToolError(`no such file: ${path}`);
  return { configFile: file };
}

const pickDiagnostic = (d) => ({
  code: d.code ?? null, severity: d.severity ?? 'error', line: d.line ?? null, column: d.column ?? null,
  message: d.message, hint: d.hint ?? null, suggestion: d.suggestion ?? null,
});
const diagLine = (d) => `${d.code ?? ''} ${d.line ?? '?'}:${d.column ?? '?'} ${d.message}${d.hint ? ` — ${d.hint}` : ''}${d.suggestion ? ` (did you mean "${d.suggestion}"?)` : ''}`.trim();

/**
 * "assert failed on row 16: a fee is never negative\n  Fee >= 0   with Fee = -3"
 * → { row: 16, says, condition, values: { Fee: "-3" } }. The engine keeps the first
 * line's form the same in all five implementations.
 */
export function parseAssert(message) {
  const m = message.match(/assert failed(?: on row (\d+))?: ([^\n]*)(?:\n\s*(.*?)\s{2,}with (.*))?/);
  if (!m) return null;
  const values = {};
  for (const part of (m[4] ?? '').split(/,\s+(?=[\w.]+ = )/)) {
    const kv = part.match(/^([\w.]+) = (.*)$/);
    if (kv) values[kv[1]] = kv[2];
  }
  return { row: m[1] ? Number(m[1]) : null, says: m[2], condition: m[3] ?? null, values };
}

/** A refusal from the engine, turned into something an agent can fix from. */
function refusal(e) {
  if (Array.isArray(e.diagnostics)) {
    const diagnostics = e.diagnostics.map(pickDiagnostic);
    return { text: `The config is refused:\n${diagnostics.map(diagLine).join('\n')}`, data: { ok: false, diagnostics } };
  }
  const failed = parseAssert(e.message ?? '');
  if (failed) {
    const at = failed.row ? `on row ${failed.row}` : 'over the whole run';
    return { text: `An <assert> failed ${at}: ${failed.says}${failed.condition ? `\n  ${failed.condition}   with ${Object.entries(failed.values).map(([k, v]) => `${k} = ${v}`).join(', ')}` : ''}\nFix the config (or the assert, if the request allows it) and run again.`, data: { ok: false, assert: failed } };
  }
  return { text: `The engine refused: ${String(e.message ?? e).split('\n')[0]}`, data: { ok: false, error: String(e.message ?? e) } };
}

function seedNote(info) {
  return info?.generated ? '\nNote: no seed= in <env> — every run draws differently. Set seed= so the file can be reproduced.' : '';
}

// ── tools ──────────────────────────────────────────────────────────────────

export async function tdcCheck(args) {
  const { mod } = await engine();
  let tdc;
  try { tdc = new mod.TDC(source(args)); } catch (e) {
    if (e instanceof ToolError) throw e;
    const r = refusal(e);
    return { text: r.text, data: { valid: false, engine: mod.VERSION, ...r.data } };
  }
  const warnings = (Array.isArray(tdc.diagnostics) ? tdc.diagnostics : []).map(pickDiagnostic);
  const seed = tdc.seedInfo?.() ?? null;
  const text = `Valid (tdcv2 ${mod.VERSION}), ${tdc.count?.() ?? '?'} records.${warnings.length ? `\nWarnings:\n${warnings.map(diagLine).join('\n')}` : ''}${seedNote(seed)}`;
  return { text, data: { valid: true, engine: mod.VERSION, count: tdc.count?.() ?? null, seed, warnings } };
}

function headLines(file, n) {
  const fd = openSync(file, 'r');
  const buf = Buffer.alloc(64 * 1024);
  const read = readSync(fd, buf, 0, buf.length, 0);
  closeSync(fd);
  return buf.subarray(0, read).toString('utf8').split(/\r?\n/).slice(0, n);
}
const clip = (l) => (l.length > 300 ? `${l.slice(0, 297)}…` : l);

export async function tdcGenerate(args) {
  const { mod } = await engine();
  const preview = Math.min(Math.max(args.preview ?? PREVIEW_DEFAULT, 0), PREVIEW_MAX);
  const opts = { ...source(args) };
  if (args.count !== undefined) opts.count = args.count;
  if (args.seed !== undefined) opts.seed = args.seed;
  let tdc;
  try { tdc = new mod.TDC(opts); } catch (e) {
    if (e instanceof ToolError) throw e;
    const r = refusal(e);
    return { text: r.text, data: { engine: mod.VERSION, ...r.data } };
  }
  const count = tdc.count?.() ?? null;
  const seed = tdc.seedInfo?.() ?? null;
  if (args.output) {
    const out = inside(args.output, 'output');
    mkdirSync(dirname(out), { recursive: true });
    const started = Date.now();
    const had = existsSync(out) ? statSync(out).size : null;
    try { await tdc.writeFileAsync(out); } catch (e) {
      const r = refusal(e);
      // Say what actually happened to the file rather than guess by version: the
      // 0.3.2 command line empties it, its library and later versions keep it.
      // Look instead.
      const now = existsSync(out) ? statSync(out).size : null;
      const rel = relative(ROOT, out);
      const state = had === null ? (now ? `${rel} holds a partial run (${now} bytes) — do not use it.` : `${rel} was not written.`)
        : now === had ? `${rel} is as it was before (${had} bytes).` : `${rel} was ${now ? `left with ${now} bytes` : 'emptied'} by the failed run (it had ${had}).`;
      return { text: `${r.text}\n${state}`, data: { engine: mod.VERSION, ...r.data, output: rel, bytesBefore: had, bytesAfter: now } };
    }
    const bytes = statSync(out).size;
    const head = preview ? headLines(out, preview).map(clip) : [];
    const rel = relative(ROOT, out);
    let summary = [];
    if (bytes < 20 * 1024 * 1024 && ['.csv', '.tsv', '.json', '.jsonl', '.ndjson', '.sql'].includes(extname(out).toLowerCase())) {
      summary = lib.peek.summarize(readFileSync(out, 'utf8'), { name: basename(out), ext: extname(out), rows: 0 }).lines;
    }
    // The config is the deliverable: if it came as text, it is not in the project yet.
    const unsaved = args.config ? `\nThe config itself is not saved in the project. Save it as a .tdc file beside ${rel} (e.g. ${rel.replace(/\.[^.\/]+$/, '')}.tdc) and hand it over with the data — it regenerates this file byte for byte.` : '';
    const text = [`Wrote ${rel} — ${count} records, ${bytes} bytes, ${Date.now() - started} ms (tdcv2 ${mod.VERSION}, seed ${seed?.seed ?? '?'}).`,
      ...(summary.length ? ['', ...summary] : []), ...(head.length ? ['', `First ${head.length} lines:`, ...head] : [])].join('\n') + seedNote(seed) + unsaved;
    return { text, data: { ok: true, engine: mod.VERSION, output: rel, bytes, count, seed, summary, head } };
  }
  if (count !== null && count > IN_MEMORY_MAX) {
    return {
      text: `This config makes ${count} records; a preview renders at most ${IN_MEMORY_MAX} in memory. Give \`output\` to write the file, or pass \`count\` for a smaller look (note: a smaller count can change the values of pack columns).`,
      data: { ok: false, engine: mod.VERSION, count, reason: 'too-large-for-preview' },
    };
  }
  let text;
  try { text = tdc.toString(); } catch (e) {
    const r = refusal(e);
    return { text: r.text, data: { engine: mod.VERSION, ...r.data } };
  }
  const lines = text.split('\n');
  if (lines.at(-1) === '') lines.pop();
  const head = lines.slice(0, preview).map(clip);
  return {
    text: [`${count} records, ${lines.length} lines (tdcv2 ${mod.VERSION}, seed ${seed?.seed ?? '?'}). Nothing written — give \`output\` to write the file.`,
      ...(head.length ? ['', `First ${head.length} lines:`, ...head] : [])].join('\n') + seedNote(seed),
    data: { ok: true, engine: mod.VERSION, count, lines: lines.length, seed, head },
  };
}

export async function tdcFindPacks({ query, locale, limit = 15 }) {
  const { mod } = await engine();
  const r = lib.packs.searchPacks(mod, { words: [query], locale, limit: Math.min(limit, 30) });
  const install = (loc) => [`Install it: tdc_pack_add with ids ["${loc}"] — it sets the project up for packs first if it is not yet.`];
  const text = lib.packs.formatPackSearch(r, { install }).join('\n')
    .replaceAll('npx -y tdcv2@0.3.5 check --brief', 'tdc_check'); // this client checks through the tool
  return { text, data: r };
}

/** The engine's own command line, as its package declares it, run in the project. */
function engineCli(root, args) {
  const bin = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).bin?.tdcv2;
  if (!bin) throw new Error(`the tdcv2 package at ${root} declares no tdcv2 command`);
  const r = spawnSync(process.execPath, [join(root, bin), ...args], { cwd: ROOT, encoding: 'utf8', timeout: 10 * 60 * 1000 });
  return { command: `tdcv2 ${args.join(' ')}`, code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() || (r.error?.message ?? '') };
}

/**
 * Install data packs the way `tdcv2 pack add` does — it is that command, of the
 * engine this project uses. A project without a pack store gets one first with
 * `tdcv2 init --yes`, as the engine's own message asks.
 */
export async function tdcPackAdd({ ids }) {
  const { mod, root } = await engine();
  const want = [...new Set(ids.map((s) => s.trim()).filter(Boolean))];
  if (!want.length) throw new ToolError('give at least one pack id, such as "fr" (a language) or "france" (a country); tdc_find_packs names the missing one');
  const steps = [];
  let add = engineCli(root, ['pack', 'add', ...want]);
  if (add.code !== 0 && /no pack store configured/.test(add.out)) {
    // Engines that know --no-examples (their help says so) set up the store and
    // nothing else; older ones also drop a tdcv2-examples/ folder in the project.
    const quiet = /--no-examples\b/.test(engineCli(root, ['init', '--help']).out) ? ['--no-examples'] : [];
    const init = engineCli(root, ['init', '--yes', ...quiet]);
    steps.push(init);
    if (init.code !== 0) throw new ToolError(`${init.command} failed:\n${init.out}`);
    add = engineCli(root, ['pack', 'add', ...want]);
  }
  steps.push(add);
  const log = steps.map((s) => `$ ${s.command}\n${s.out}`).join('\n\n');
  if (add.code !== 0) throw new ToolError(log);
  mod.clearPackCache?.(); // the next search and check in this server see the new packs
  lib.packs.forgetPacks(mod);
  return {
    text: `${log}\n\nInstalled: ${want.join(', ')}. tdc_find_packs and tdc_check see them now.`,
    data: { ok: true, engine: mod.VERSION, installed: want, steps },
  };
}

export async function tdcPeek({ path, column, rows = 3 }) {
  const file = inside(path, 'path');
  if (!existsSync(file)) throw new ToolError(`no such file: ${path}`);
  const { lines, ok } = lib.peek.summarize(readFileSync(file, 'utf8'), { name: basename(file), ext: extname(file), column, rows: Math.min(rows, 10) });
  return { text: lines.join('\n'), data: { ok, lines } };
}

export async function tdcReadDocs({ page, query, offset = 0 }) {
  if (query) {
    const hits = searchDocs(query);
    return {
      text: hits.length ? `${hits.length} page(s) — open one with tdc_read_docs page=<path>:\n${hits.slice(0, 20).join('\n')}` : `No page mentions all of "${query}". Try fewer words, or page=index for the whole list.`,
      data: { hits },
    };
  }
  const p = readPage(page ?? 'guide');
  if (!p) throw new ToolError(`no page "${page}". Pages: guide, traps, from-code, linked-tables, index, or a reference path from index such as generators/date`);
  const chunk = p.text.slice(offset, offset + PAGE_CHUNK);
  const rest = p.text.length - offset - chunk.length;
  return {
    text: chunk + (rest > 0 ? `\n\n[… ${rest} more characters — call again with offset=${offset + chunk.length}]` : ''),
    data: { page: p.name, offset, length: p.text.length, more: rest > 0 },
  };
}

export async function tdcFormat({ config }) {
  const { mod } = await engine();
  const f = mod.formatTdc(config);
  return { text: typeof f === 'string' ? f : f?.text ?? config, data: {} };
}

export { ToolError, guide, ROOT };
