/**
 * `npx -y tdcv2-mcp@0.1.2 install-skill [--project | --agents | --dir <folder>]`
 *
 * Copies the skill this package carries — the same SKILL.md, scripts and pages
 * the server reads — into a skills folder, as <folder>/tdcv2. An older copy there
 * is replaced. Nothing else on the machine is touched.
 */
import { cpSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { SKILL_DIR } from './skill.mjs';

const args = process.argv.slice(3);
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
if (args.includes('--help') || args.includes('-h')) {
  console.log(`npx -y tdcv2-mcp@0.1.2 install-skill [where]

  (nothing)        ~/.claude/skills/tdcv2        Claude Code, for you in every project
  --project        ./.claude/skills/tdcv2        Claude Code, for this project only
  --agents         ~/.agents/skills/tdcv2        the shared skills folder other agents read
  --dir <folder>   <folder>/tdcv2                any other skills folder

An existing tdcv2 folder there is replaced by this version (${version}).`);
  process.exit(0);
}
const at = args.indexOf('--dir');
const base = at >= 0 ? resolve(args[at + 1] ?? '')
  : args.includes('--project') ? join(process.cwd(), '.claude', 'skills')
  : args.includes('--agents') ? join(homedir(), '.agents', 'skills')
  : join(homedir(), '.claude', 'skills');
if (at >= 0 && !args[at + 1]) { console.error('install-skill: --dir needs a folder'); process.exit(2); }

const target = join(base, 'tdcv2');
const stamp = join(target, '.tdcv2-mcp-version');
const before = existsSync(stamp) ? readFileSync(stamp, 'utf8').trim() : existsSync(target) ? 'unknown' : null;
mkdirSync(base, { recursive: true });
rmSync(target, { recursive: true, force: true });
cpSync(SKILL_DIR, target, { recursive: true });
writeFileSync(stamp, `${version}\n`);
console.log(before ? `Updated the TDCv2 skill in ${target} (${before} → ${version}).` : `Installed the TDCv2 skill in ${target} (${version}).`);
console.log('Start a new agent session; ask for test data in plain words and the agent picks the skill up.');
