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
if (!file) {
  console.log('usage: peek.mjs <file> [--column <name>] [--rows 3]');
  process.exit(2);
}
const { lines, ok } = summarize(readFileSync(file, 'utf8'), { name: basename(file), ext: extname(file), column, rows: sampleRows });
for (const l of lines) console.log(l);
if (!ok) process.exit(1);

