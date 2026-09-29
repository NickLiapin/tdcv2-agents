/**
 * Shell-neutral assertions for the cross-OS workflow: the steps under test run
 * the exact commands an agent types, in bash, PowerShell or cmd, and redirect
 * their output to files; this script judges the files. Comparing text in each
 * shell's own syntax would test three syntaxes instead of the skill.
 *
 *   node test/expect.mjs contains <file> <text>
 *   node test/expect.mjs sha256 <file> <hex>
 *
 * Windows PowerShell 5.1 writes `>` redirections as UTF-16 — decoded here.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const [what, file, want] = process.argv.slice(2);
const bytes = readFileSync(file);
const text = bytes[0] === 0xff && bytes[1] === 0xfe
  ? bytes.subarray(2).toString('utf16le')
  : bytes.toString('utf8').replace(/^﻿/, '');

if (what === 'contains') {
  if (!text.includes(want)) {
    console.error(`✗ ${file} does not contain "${want}". It holds:\n${text.slice(0, 800)}`);
    process.exit(1);
  }
  console.log(`✓ ${file} contains "${want}"`);
} else if (what === 'sha256') {
  const got = createHash('sha256').update(bytes).digest('hex');
  if (got !== want) {
    const crlf = bytes.includes(13);
    console.error(`✗ ${file}: sha256 ${got}, expected ${want}${crlf ? ' — the file has CR bytes (CRLF line ends?)' : ''}`);
    process.exit(1);
  }
  console.log(`✓ ${file}: same bytes as on the reference machine`);
} else {
  console.error('usage: expect.mjs contains <file> <text> | sha256 <file> <hex>');
  process.exit(2);
}
