#!/usr/bin/env node
/**
 * A short summary of a generated file — the proof that it holds what was asked,
 * without reading the whole file into the conversation.
 *
 *   node peek.mjs <file> [--column <name>] [--rows 3]
 *
 * CSV (with a header) and JSON (an array of objects, or one object per line):
 * row count, then per column — distinct values, empties, the split when there
 * are few values, the range when they are numbers. SQL: INSERT rows per table.
 * Anything else: line count. Plus the first few rows.
 *
 * Plain Node, no shell tools: the same command works in bash, zsh, PowerShell
 * and cmd.
 */
import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { summarize } from './lib/peek.mjs';

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
};
const column = opt('column');
const sampleRows = Number(opt('rows', 3));
const file = argv[0];
const USAGE = `usage: peek.mjs <file> [--column <name>] [--rows 3]

  CSV, JSON (an array, one object per line, or an object of arrays — one table each,
  and every <x>_id checked against <x>s.id), SQL INSERTs, anything else by lines.
  --column   one column in full    --rows   sample rows to show (default 3)
  Exit 1 when the file is not what it claims, or a link points nowhere.`;
if (file === '--help' || file === '-h') { console.log(USAGE); process.exit(0); }
if (!file) { console.log(USAGE); process.exit(2); }
const { lines, ok } = summarize(readFileSync(file, 'utf8'), { name: basename(file), ext: extname(file), column, rows: sampleRows });
for (const l of lines) console.log(l);
if (!ok) process.exit(1);

