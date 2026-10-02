/**
 * The server through a real MCP client over stdio, in an empty project folder:
 * every tool, the prompt and a resource. Pins the engine to this package's own
 * dependency (TDCV2_ENGINE) so the answers are the same on any machine.
 *
 *   node test/smoke.mjs
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');
const project = mkdtempSync(join(tmpdir(), 'tdcv2-mcp-smoke-'));
// SMOKE_SERVER=<installed package folder> tests a packed, installed copy instead of this tree.
const serverRoot = process.env.SMOKE_SERVER ?? pkgRoot;
const ownEngine = join(serverRoot, 'node_modules', 'tdcv2');
writeFileSync(join(project, 'orders.tdc'), readFileSync(join(here, 'fixtures', 'orders.tdc')));

const client = new Client({ name: 'smoke', version: '0' });
await client.connect(new StdioClientTransport({
  command: process.execPath, args: [join(serverRoot, 'src', 'cli.mjs')], cwd: project, // as `npx -y tdcv2-mcp@0.1.2` starts it
  env: { ...process.env, TDCV2_ENGINE: ownEngine },
}));

let failed = 0;
const say = (good, what) => { if (!good) failed++; console.log(`${good ? '✓' : '✗'} ${what}`); };
const call = (name, args) => client.callTool({ name, arguments: args });
// What the model reads: Claude Code shows `structuredContent` when there is one,
// so the substance must be there — check that part, not only `content`.
const text = (r) => r.structuredContent?.text ?? '';
const plain = (r) => r.content?.[0]?.text ?? '';

const tools = (await client.listTools()).tools.map((t) => t.name).sort();
say(tools.join() === 'tdc_check,tdc_find_packs,tdc_format,tdc_generate,tdc_peek,tdc_read_docs', `tools: ${tools.join(', ')}`);

const g = await call('tdc_read_docs', {});
say(plain(g) === text(g), 'every answer carries its text in structuredContent too');
say(text(g).includes('Using this through the tdcv2 MCP server') && text(g).includes('# TDCv2'), 'read_docs: the guide, with the MCP preface');
const trapsPage = await call('tdc_read_docs', { page: 'traps' });
say(text(trapsPage).includes('`mm` is minutes'), 'read_docs: traps');
const date = await call('tdc_read_docs', { page: 'generators/date' });
say(text(date).startsWith('# The `date` generator') || text(date).includes('date'), 'read_docs: a reference page');
const escape = await call('tdc_read_docs', { page: '../../../etc/passwd' });
say(escape.isError === true, 'read_docs: refuses a path outside the skill');

const fp = await call('tdc_find_packs', { query: 'last name' });
say(fp.structuredContent?.matches?.[0]?.path === 'person.lastName', `find_packs: first match ${fp.structuredContent?.matches?.[0]?.path}`);

const TYPO = '<tdc><env count="2" seed="s"><sequence name="A"><gen type="text" value="x" wat="1"/></sequence></env><block><line><data>${{A}}</data></line></block></tdc>';
const bad = await call('tdc_check', { config: TYPO });
say(bad.structuredContent?.valid === false && bad.structuredContent.diagnostics?.[0]?.code === 'TDC015', `check: typo → ${bad.structuredContent?.diagnostics?.[0]?.code}`);
const NOSEED = '<tdc><env count="2"><sequence name="A"><gen type="text" value="x"/></sequence></env><block><line><data>${{A}}</data></line></block></tdc>';
const ns = await call('tdc_check', { config: NOSEED });
say(ns.structuredContent?.valid === true && /no seed=/.test(text(ns)), 'check: valid, and says there is no seed');
const both = await call('tdc_check', { config: NOSEED, path: 'orders.tdc' });
say(both.isError === true, 'check: refuses config and path together');

const pv = await call('tdc_generate', { path: 'orders.tdc', preview: 3 });
say(pv.structuredContent?.count === 1000 && pv.structuredContent.head.length === 3 && !existsSync(join(project, 'orders.csv')), 'generate: preview of 3 lines, nothing written');
const ASSERT = '<tdc><env count="3" seed="s"><sequence name="Amount"><gen type="number" value="1..9"/></sequence><assert each="Amount > 100" says="every amount is large"/></env><block><line><data>${{Amount}}</data></line></block></tdc>';
const af = await call('tdc_generate', { config: ASSERT });
const a = af.structuredContent?.assert;
say(a?.row === 1 && a.says === 'every amount is large' && a.condition === 'Amount > 100' && a.values?.Amount === '5', `generate: failed assert → row ${a?.row}, ${a?.condition}, Amount=${a?.values?.Amount}`);

const wr = await call('tdc_generate', { path: 'orders.tdc', output: 'out/orders.csv' });
const sha = existsSync(join(project, 'out', 'orders.csv')) ? createHash('sha256').update(readFileSync(join(project, 'out', 'orders.csv'))).digest('hex') : '';
say(sha === '7dc88c467c941935841bc846b4a5f7e0ab0fdccf09a39507d27bf12ec42b4fc2', 'generate: output written, same bytes as the CLI on every OS');
say(/shipped 700, pending 200, cancelled 100/.test(text(wr)), 'generate: the answer carries the per-column summary');
const failInto = await call('tdc_generate', { config: ASSERT, output: 'out/orders.csv' });
say(/out\/orders\.csv (is as it was before|was emptied|was left with)/.test(text(failInto)), `generate: a failed run says what happened to the file — "${text(failInto).split('\n').at(-1)}"`);
const wc = await call('tdc_generate', { config: NOSEED, output: 'out/a.txt' });
say(/not saved in the project/.test(text(wc)), 'generate: config given as text → reminds to save the .tdc');
const out = await call('tdc_generate', { path: 'orders.tdc', output: '../escape.csv' });
say(out.isError === true && !existsSync(join(project, '..', 'escape.csv')), 'generate: refuses to write outside the project');

const pk = await call('tdc_peek', { path: 'out/orders.csv', column: 'status' });
say(/shipped 700/.test(text(pk)), 'peek: one column in full');
const fm = await call('tdc_format', { config: TYPO });
say(text(fm).split('\n').length > 3, 'format: pretty-printed');

const pr = await client.getPrompt({ name: 'tdcv2_guide' });
say(pr.messages?.[0]?.content?.text?.includes('# TDCv2'), 'prompt: tdcv2_guide');
const rs = await client.readResource({ uri: 'tdcv2://from-code' });
say(rs.contents?.[0]?.text?.includes('5 Robert 84'), 'resource: tdcv2://from-code');

await client.close();

// install-skill: the same package puts the skill into a skills folder.
const { spawnSync } = await import('node:child_process');
const skills = join(project, 'skills-here');
const inst = spawnSync(process.execPath, [join(serverRoot, 'src', 'cli.mjs'), 'install-skill', '--dir', skills], { encoding: 'utf8' });
say(inst.status === 0 && existsSync(join(skills, 'tdcv2', 'SKILL.md')) && existsSync(join(skills, 'tdcv2', 'scripts', 'find-packs.mjs')), `install-skill: ${inst.stdout.split('\n')[0].replace(project, '<project>')}`);
rmSync(project, { recursive: true, force: true });
console.log(failed ? `\n${failed} failed` : '\nall good');
process.exit(failed ? 1 : 0);
