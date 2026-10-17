#!/usr/bin/env node
/**
 * Find TDCv2 data packs by words — the addresses a config can use in
 * <gen type="template" value="…"/>, from the packs this machine actually has.
 *
 *   node find-packs.mjs <words…> [--locale fr] [--limit 15]
 *
 * Prints one line per pack: the value to write in the config, the locales that
 * have it, and what it holds. Pack contents are never printed. How it ranks:
 * lib/packs.mjs. Which engine it asks: the project's own, else the version the
 * skill's commands run, borrowed from npx for this call — never some other tdcv2
 * on PATH, whose packs the generating engine may not have.
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

const USAGE = `usage: find-packs.mjs <words…> [--locale fr] [--limit 15]

  words      what the column holds, in English: last name, email, city, iban
             (a country narrows it: usa phone, france city)
  --locale   only packs for this locale; says how to install it if missing
  --limit    at most this many lines (default 15)`;
if (words.includes('--help') || words.includes('-h')) { console.log(USAGE); process.exit(0); }
if (!words.length) { console.log(USAGE); process.exit(2); }

/** No usable engine here: borrow one from npx for this one call. */
function viaNpx() {
  if (fromNpx) {
    console.error('find-packs: could not load the tdcv2 engine, even under npx.');
    process.exit(1);
  }
  const args = ['-y', '-p', 'tdcv2@0.3.5', '--', 'node', process.argv[1], ...process.argv.slice(2), '--from-npx'];
  // On Windows npx is npx.cmd, which Node starts only through a shell.
  const r = process.platform === 'win32'
    ? spawnSync(['npx', ...args].map(winQuote).join(' '), { stdio: 'inherit', shell: true })
    : spawnSync('npx', args, { stdio: 'inherit' });
  if (r.error || r.status === null) {
    console.error(`find-packs: no tdcv2 engine here, and npx could not start (${r.error?.code ?? r.signal ?? 'unknown'}).`);
    console.error('Install Node.js with npm (https://nodejs.org), or add the engine to the project: npm i -D tdcv2@0.3.5');
    process.exit(1);
  }
  process.exit(r.status);
}

// Under npx its own copy is first on PATH — the version asked for; otherwise PATH is not looked at.
const engine = await loadEngine({ path: fromNpx ? process.env.PATH : '' });
if (!engine) viaNpx();
if (process.env.FIND_PACKS_DEBUG) console.error(`find-packs: engine ${engine.mod.VERSION} at ${engine.index}`);
for (const l of formatPackSearch(searchPacks(engine.mod, { words, locale, limit }))) console.log(l);
