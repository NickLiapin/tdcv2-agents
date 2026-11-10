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
import { join, dirname, parse } from 'node:path';
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
  command: process.execPath, args: [join(serverRoot, 'src', 'cli.mjs')], cwd: project, // as `npx -y tdcv2-mcp@0.4.0` starts it
  env: { ...process.env, TDCV2_ENGINE: process.env.TDCV2_ENGINE ?? ownEngine }, // another engine: TDCV2_ENGINE=<package folder>
}));

let failed = 0;
const say = (good, what) => { if (!good) failed++; console.log(`${good ? '✓' : '✗'} ${what}`); };
const call = (name, args) => client.callTool({ name, arguments: args });
// What the model reads: Claude Code shows `structuredContent` when there is one,
// so the substance must be there — check that part, not only `content`.
const text = (r) => r.structuredContent?.text ?? '';
const plain = (r) => r.content?.[0]?.text ?? '';

const tools = (await client.listTools()).tools.map((t) => t.name).sort();
say(tools.join() === 'tdc_check,tdc_find_packs,tdc_format,tdc_generate,tdc_pack_add,tdc_peek,tdc_read_docs', `tools: ${tools.join(', ')}`);

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
say(!/did you mean "did you mean/.test(text(bad)) && /did you mean "/.test(text(bad)), 'check: a suggestion is said once, not "did you mean \"did you mean …\""');
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

const lt = await call('tdc_read_docs', { page: 'linked-tables' });
say(text(lt).includes('<pool name="Books"') && text(lt).includes('each` or pools'), 'read_docs: linked-tables, the recipe with its example');
// Several tables in one JSON object: peek shows each and checks every <x>_id.
writeFileSync(join(project, 'two.json'), JSON.stringify({ authors: [{ id: 1 }, { id: 2 }], books: [{ id: 1, author_id: 2 }, { id: 2, author_id: 7 }] }));
const pt = await call('tdc_peek', { path: 'two.json' });
say(text(pt).includes('books.author_id → authors.id: 1 of 2 not found'), 'peek: an object of arrays, a link that points nowhere is reported');

// http: the column goes to the service in batches (engine 0.4+), the file is the CLI's byte for byte.
{
  const { createServer } = await import('node:http');
  const { spawn } = await import('node:child_process');
  const seen = [];
  const svc = createServer((req, res) => {
    let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
      seen.push(Number(req.headers['x-tdc-offset'] ?? 0));
      res.end((body === '' ? [] : body.split('\n')).map((l) => createHash('sha256').update(l).digest('hex').slice(0, 12)).join('\n'));
    });
  });
  await new Promise((ok) => svc.listen(0, '127.0.0.1', ok));
  const HTTP = `<tdc><env count="25000" seed="h" local="en"><sequence name="Pass"><gen type="regex" value="[a-z]{8}"/></sequence><sequence name="Hash"><gen type="http" src="http://127.0.0.1:${svc.address().port}/" in="Pass"/></sequence></env><block><line><data>\${{Pass}},\${{Hash}}</data></line></block></tdc>`;
  writeFileSync(join(project, 'hashed.tdc'), HTTP);
  const hr = await call('tdc_generate', { path: 'hashed.tdc', output: 'out/hashed.csv' });
  const batches = seen.slice();
  const cliOut = join(project, 'out', 'hashed-cli.csv');
  const engineCli = join(process.env.TDCV2_ENGINE ?? ownEngine, 'dist', 'cli', 'main.js');
  const code = await new Promise((ok) => spawn(process.execPath, [engineCli, join(project, 'hashed.tdc'), '-o', cliOut], { stdio: 'ignore' }).on('exit', ok));
  const same = code === 0 && existsSync(join(project, 'out', 'hashed.csv')) && readFileSync(join(project, 'out', 'hashed.csv'), 'utf8') === readFileSync(cliOut, 'utf8');
  say(!hr.isError && same && batches.join() === '0,10000,20000', `generate: http column in ${batches.length} batches (offsets ${batches.join(', ')}), same bytes as the CLI${hr.isError ? ` — ${plain(hr).slice(0, 160)}` : ''}`);
  svc.close();
}

const pr = await client.getPrompt({ name: 'tdcv2_guide' });
say(pr.messages?.[0]?.content?.text?.includes('# TDCv2'), 'prompt: tdcv2_guide');
const rs = await client.readResource({ uri: 'tdcv2://from-code' });
say(rs.contents?.[0]?.text?.includes('5 Robert 84'), 'resource: tdcv2://from-code');

// Another language: the search says to install it, tdc_pack_add does (init first, in a project
// without a pack store), and the same server then finds the pack and generates from it.
const miss = await call('tdc_find_packs', { query: 'last name', locale: 'fr' });
if (miss.structuredContent?.missingLocale) say(text(miss).includes('tdc_pack_add'), 'find_packs: a missing locale points at tdc_pack_add');
else console.log('· find_packs: fr is already here with this engine (a development build reads every pack from its repository)');
const pa = await call('tdc_pack_add', { ids: ['fr'] });
say(pa.structuredContent?.ok && existsSync(join(project, 'tdcv2.config.json')) && existsSync(join(project, 'tdcv2-packs', 'fr')),
  `pack_add: ${pa.structuredContent?.steps?.map((s) => s.command).join(' → ') ?? plain(pa).slice(0, 200)}`);
if (pa.structuredContent?.steps?.[0]?.command.includes('--no-examples')) {
  say(!existsSync(join(project, 'tdcv2-examples')), 'pack_add: init --no-examples left no tdcv2-examples/ in the project');
}
const found = await call('tdc_find_packs', { query: 'last name', locale: 'fr' });
const frPath = found.structuredContent?.matches?.[0]?.path;
say(!found.structuredContent?.missingLocale && Boolean(frPath), `find_packs: fr found after pack_add, in the same server (${frPath})`);
const FR = `<tdc><env count="3" seed="s" local="fr"><sequence name="Nom"><gen type="template" value="${frPath}"/></sequence></env><block><line><data>\${{Nom}}</data></line></block></tdc>`;
const frRows = await call('tdc_generate', { config: FR, preview: 3 });
say(frRows.structuredContent?.ok && frRows.structuredContent?.head?.length === 3, `generate: French rows (${frRows.structuredContent?.head?.join(', ') ?? plain(frRows).slice(0, 120)})`);
const badId = await call('tdc_pack_add', { ids: ['xx-nope'] });
say(badId.isError && plain(badId).includes('unknown bundle'), 'pack_add: an unknown id is refused, with the list of ids');

await client.close();

// Started in / — as Claude Desktop starts servers: no project until one is named.
{
  const { ListRootsRequestSchema } = await import('@modelcontextprotocol/sdk/types.js');
  const { pathToFileURL } = await import('node:url');
  const fsRoot = parse(project).root;
  const start = async (env, roots) => {
    const c = new Client({ name: 'desktop', version: '0' }, roots ? { capabilities: { roots: { listChanged: true } } } : {});
    if (roots) c.setRequestHandler(ListRootsRequestSchema, () => ({ roots: [{ uri: pathToFileURL(roots).href, name: 'project' }] }));
    await c.connect(new StdioClientTransport({ command: process.execPath, args: [join(serverRoot, 'src', 'cli.mjs')], cwd: fsRoot,
      env: { ...process.env, TDCV2_ENGINE: process.env.TDCV2_ENGINE ?? ownEngine, ...env } }));
    return c;
  };
  const ask = (c, output) => c.callTool({ name: 'tdc_generate', arguments: { path: 'orders.tdc', output } });
  let c = await start({});
  const none = await ask(c, 'out/desktop.csv');
  say(none.isError && /no project folder/.test(none.content[0].text) && /TDCV2_PROJECT/.test(none.content[0].text), 'started in /: refuses to write, says how to name the project');
  const preview = await c.callTool({ name: 'tdc_generate', arguments: { config: NOSEED.replace('<env count="2">', '<env count="2" seed="s">'), preview: 2 } });
  say(!preview.isError, 'started in /: a config as text still previews');
  await c.close();
  c = await start({ TDCV2_PROJECT: project });
  const viaEnv = await ask(c, 'out/via-env.csv');
  say(!viaEnv.isError && existsSync(join(project, 'out', 'via-env.csv')), 'TDCV2_PROJECT: writes into that folder');
  await c.close();
  c = await start({}, project);
  const viaRoots = await ask(c, 'out/via-roots.csv');
  say(!viaRoots.isError && existsSync(join(project, 'out', 'via-roots.csv')), 'MCP roots: the client\'s folder is the project');
  await c.close();
}

// install-skill: the same package puts the skill into a skills folder.
const { spawnSync } = await import('node:child_process');
const skills = join(project, 'skills-here');
const inst = spawnSync(process.execPath, [join(serverRoot, 'src', 'cli.mjs'), 'install-skill', '--dir', skills], { encoding: 'utf8' });
say(inst.status === 0 && existsSync(join(skills, 'tdcv2', 'SKILL.md')) && existsSync(join(skills, 'tdcv2', 'scripts', 'find-packs.mjs')), `install-skill: ${inst.stdout.split('\n')[0].replace(project, '<project>')}`);
rmSync(project, { recursive: true, force: true });
console.log(failed ? `\n${failed} failed` : '\nall good');
process.exit(failed ? 1 : 0);
