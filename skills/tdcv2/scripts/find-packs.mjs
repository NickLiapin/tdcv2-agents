#!/usr/bin/env node
/**
 * Find TDCv2 data packs by words — the addresses a config can use in
 * <gen type="template" value="…"/>, from the packs this machine actually has.
 *
 *   node find-packs.mjs <words…> [--locale fr] [--limit 15]
 *
 * Prints one line per pack: the value to write in the config, the locales that
 * have it, and what it holds. Pack contents are never printed. How it ranks:
 * lib/packs.mjs. Which engine it asks: lib/engine.mjs — the project's own
 * first, then PATH, then one borrowed from npx for this call.
 */
import { spawnSync } from 'node:child_process';
import { loadEngine, winQuote } from './lib/engine.mjs';
import { searchPacks, formatPackSearch } from './lib/packs.mjs';

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
};
const locale = opt('locale');
const limit = Number(opt('limit') ?? 15);
const fromNpx = argv.includes('--from-npx');
const words = argv.filter((a) => a !== '--from-npx');

if (!words.length) {
  console.log('usage: find-packs.mjs <words…> [--locale fr] [--limit 15]');
  process.exit(2);
}

/** No usable engine here: borrow one from npx for this one call. */
function viaNpx() {
  if (fromNpx) {
    console.error('find-packs: could not load the tdcv2 engine, even under npx.');
    process.exit(1);
  }
  const args = ['-y', '-p', 'tdcv2@0.3.3', '--', 'node', process.argv[1], ...process.argv.slice(2), '--from-npx'];
  // On Windows npx is npx.cmd, which Node starts only through a shell.
  const r = process.platform === 'win32'
    ? spawnSync(['npx', ...args].map(winQuote).join(' '), { stdio: 'inherit', shell: true })
    : spawnSync('npx', args, { stdio: 'inherit' });
  if (r.error || r.status === null) {
    console.error(`find-packs: no tdcv2 engine here, and npx could not start (${r.error?.code ?? r.signal ?? 'unknown'}).`);
    console.error('Install Node.js with npm (https://nodejs.org), or add the engine to the project: npm i -D tdcv2@0.3.3');
    process.exit(1);
  }
  process.exit(r.status);
}

const engine = await loadEngine();
if (!engine) viaNpx();
if (process.env.FIND_PACKS_DEBUG) console.error(`find-packs: engine ${engine.mod.VERSION} at ${engine.index}`);
for (const l of formatPackSearch(searchPacks(engine.mod, { words, locale, limit }))) console.log(l);
