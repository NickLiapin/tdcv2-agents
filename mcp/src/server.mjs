#!/usr/bin/env node
/**
 * tdcv2-mcp — TDCv2 as MCP tools, over stdio. A thin layer over the skill's own
 * scripts and knowledge (skill/tdcv2): the same engine lookup, pack search and
 * file summary, the same guide. Data is generated on this machine; nothing is
 * sent anywhere.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { tdcCheck, tdcGenerate, tdcFindPacks, tdcPeek, tdcReadDocs, tdcFormat, ToolError, guide, PREVIEW_MAX } from './tools.mjs';
import { readPage } from './skill.mjs';

const pkg = JSON.parse((await import('node:fs')).readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const server = new McpServer(
  { name: 'tdcv2', version: pkg.version },
  {
    instructions:
      'Use these tools whenever someone needs test data, fixtures, seed data, mock or synthetic records — CSV, JSON, SQL ' +
      'inserts or any text format — instead of writing a generator script or typing the data. TDCv2 makes the rows from a ' +
      'small .tdc config, on this machine, and the same config gives the same file every time. ' +
      'Start with tdc_read_docs (the guide, once per session), then tdc_find_packs for real-world values, tdc_check until ' +
      'clean, and tdc_generate to preview rows or write the file. Hand over the config with the data; keep count and seed ' +
      'inside <env> so it reproduces the file.',
  },
);

/**
 * Tool result: the text, and the structured data beside it — with the text inside
 * the structured part too. Claude Code hands the model `structuredContent` when
 * it is present, not `content`; a bench run showed a model reading the guide's
 * metadata eighteen times and never its text. Whichever part a client shows, the
 * model gets the substance. A ToolError is the caller's mistake.
 */
const wrap = (fn) => async (args) => {
  try {
    const { text, data } = await fn(args);
    return { content: [{ type: 'text', text }], structuredContent: { text, ...data } };
  } catch (e) {
    const msg = e instanceof ToolError ? e.message : `tdcv2-mcp: ${e?.message ?? e}`;
    return { content: [{ type: 'text', text: msg }], isError: true };
  }
};

const configOrPath = {
  config: z.string().optional().describe('The .tdc config text. Give this or `path`.'),
  path: z.string().optional().describe('A .tdc file, relative to the project folder. Give this or `config`.'),
};

server.registerTool('tdc_check', {
  title: 'Check a TDCv2 config',
  description: 'Validate a .tdc config without generating anything. Returns every diagnostic with its code, line, column, hint and "did you mean" suggestion, plus warnings and whether a seed is set. Run it until the config is clean.',
  inputSchema: configOrPath,
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
}, wrap(tdcCheck));

server.registerTool('tdc_generate', {
  title: 'Generate data from a TDCv2 config',
  description: `Make test data — CSV, JSON, SQL, any text — from a .tdc config, instead of writing a generator script. Without \`output\`: renders in memory and returns the first \`preview\` lines (max ${PREVIEW_MAX}) — nothing is written. With \`output\`: writes the whole file inside the project folder and returns its size, a per-column summary and the first lines. A failed <assert> comes back as row, message, condition and values, so the config can be fixed. Same config and seed give the same bytes every time.`,
  inputSchema: {
    ...configOrPath,
    output: z.string().optional().describe('File to write, relative to the project folder. Omit to preview only.'),
    preview: z.number().int().min(0).max(PREVIEW_MAX).optional().describe(`Lines to return (default 10, max ${PREVIEW_MAX}).`),
    count: z.number().int().min(0).optional().describe('Override <env count> for this run. For the delivered file keep count in the config instead.'),
    seed: z.string().optional().describe('Override <env seed> for this run. For the delivered file keep seed in the config instead.'),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
}, wrap(tdcGenerate));

server.registerTool('tdc_find_packs', {
  title: 'Find TDCv2 data packs',
  description: 'Search the data packs installed on this machine by words ("last name", "iban", "city") — the paths to write in <gen type="template" value="…"/>. Never guess a path; ask this. Returns path, the locales that have it, and what it holds (never the values).',
  inputSchema: {
    query: z.string().min(1).describe('Words to look for, English works best: "last name", "email", "country".'),
    locale: z.string().optional().describe('Only packs for this locale, e.g. "fr". Says how to install it if missing.'),
    limit: z.number().int().min(1).max(30).optional().describe('At most this many results (default 15).'),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
}, wrap(tdcFindPacks));

server.registerTool('tdc_peek', {
  title: 'Summarise a generated file',
  description: 'A short summary of a CSV, JSON or SQL file in the project: row count; per column the distinct values, the split, the range; INSERT rows per table. The proof that a file holds what was asked, without reading it all.',
  inputSchema: {
    path: z.string().describe('The file, relative to the project folder.'),
    column: z.string().optional().describe('One column in full (up to 50 values with counts).'),
    rows: z.number().int().min(0).max(10).optional().describe('Sample rows to include (default 3).'),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
}, wrap(tdcPeek));

server.registerTool('tdc_read_docs', {
  title: 'Read the TDCv2 guide and reference',
  description: 'Start here when asked for test data, fixtures or seed data: the TDCv2 guide ("guide" — read it before the first config), traps check does not catch ("traps"), using the data from test code in five languages ("from-code"), the list of reference pages ("index"), or one reference page such as "generators/date". `query` searches the page list.',
  inputSchema: {
    page: z.string().optional().describe('guide | traps | from-code | index | a reference path like generators/date. Default: guide.'),
    query: z.string().optional().describe('Words to find in the page list instead of opening a page.'),
    offset: z.number().int().min(0).optional().describe('For long pages: continue from this character.'),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
}, wrap(tdcReadDocs));

server.registerTool('tdc_format', {
  title: 'Format a TDCv2 config',
  description: 'Pretty-print a .tdc config the way `tdcv2 format` does. Returns the text unchanged if it does not parse.',
  inputSchema: { config: z.string().describe('The .tdc config text.') },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
}, wrap(tdcFormat));

// For clients that take a prompt rather than reading docs through a tool.
server.registerPrompt('tdcv2_guide', {
  title: 'TDCv2 guide',
  description: 'How to make test data with TDCv2 through this server: workflow, config shape, generators, traps.',
}, () => ({ messages: [{ role: 'user', content: { type: 'text', text: guide() } }] }));

for (const [name, title] of [['guide', 'TDCv2 guide'], ['traps', 'TDCv2 traps'], ['from-code', 'TDCv2 data from code']]) {
  server.registerResource(name, `tdcv2://${name}`, { title, mimeType: 'text/markdown' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: readPage(name).text }] }));
}

await server.connect(new StdioServerTransport());
