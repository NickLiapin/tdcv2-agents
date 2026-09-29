/**
 * The knowledge the server hands out is the skill's own — SKILL.md, traps.md,
 * from-code.md, the reference built from the engine's docs — never a second copy
 * written for the server. In the published package the skill is copied into
 * ./skill at pack time (scripts/copy-skill.mjs); in a repository it is read from
 * ../skills/tdcv2, or ../skill/tdcv2 in the development repository.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const SKILL_DIR = [join(here, '..', 'skill'), join(here, '..', '..', 'skills', 'tdcv2'), join(here, '..', '..', 'skill', 'tdcv2')]
  .find((d) => existsSync(join(d, 'SKILL.md')));
if (!SKILL_DIR) throw new Error('tdcv2-mcp: the skill folder is missing (expected ./skill in the package, or ../skills/tdcv2 in the repository)');

/** The skill's shared modules: engine lookup, pack search, file summary. */
export const lib = {
  engine: await import(pathToFileURL(join(SKILL_DIR, 'scripts', 'lib', 'engine.mjs')).href),
  packs: await import(pathToFileURL(join(SKILL_DIR, 'scripts', 'lib', 'packs.mjs')).href),
  peek: await import(pathToFileURL(join(SKILL_DIR, 'scripts', 'lib', 'peek.mjs')).href),
};

/**
 * The guide was written for agents with a terminal. With this server the same
 * steps are tools; this preface says which.
 */
const PREFACE = `> **Using this through the tdcv2 MCP server.** The guide below was written for agents with a
> terminal. Here, use the tools instead:
> \`npx -y tdcv2 check\` → **tdc_check** · \`npx -y tdcv2 <file> --count 5\` → **tdc_generate** (preview) ·
> \`npx -y tdcv2 <file> -o <out>\` → **tdc_generate** with \`output\` · \`scripts/find-packs.mjs\` →
> **tdc_find_packs** · \`scripts/peek.mjs\` → **tdc_peek** · pages under \`<skill>/\` and \`reference/\` →
> **tdc_read_docs**. Write the config into a \`.tdc\` file in the project with your file tools and pass its
> \`path\` — the config is the deliverable, handed over with the data. Everything runs on this machine;
> nothing is sent anywhere.

`;

/** SKILL.md without its front matter, with the preface. */
export function guide() {
  const text = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
  return PREFACE + text.trim() + '\n';
}

/** Named pages beside the reference. */
const NAMED = {
  guide: null, // built by guide()
  traps: 'traps.md',
  'from-code': 'from-code.md',
  index: join('reference', 'INDEX.md'),
};

/**
 * A page by name: "guide", "traps", "from-code", "index", or a reference page as
 * "generators/date", "generators/date.md" or "reference/generators/date.md".
 * Returns null for anything outside the skill folder.
 */
export function readPage(name) {
  const key = name.trim().replace(/^\/+/, '').replace(/\.md$/, '');
  if (key === 'guide') return { name: 'guide', text: guide() };
  if (NAMED[key]) return { name: key, text: readFileSync(join(SKILL_DIR, NAMED[key]), 'utf8') };
  const rel = key.replace(/^reference\//, '');
  const file = normalize(join(SKILL_DIR, 'reference', `${rel}.md`));
  if (!file.startsWith(join(SKILL_DIR, 'reference') + sep) || !existsSync(file)) return null;
  return { name: `reference/${rel}.md`, text: readFileSync(file, 'utf8') };
}

/** Index lines whose path, title or gist mention every word. */
export function searchDocs(query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const index = readFileSync(join(SKILL_DIR, 'reference', 'INDEX.md'), 'utf8').split('\n').filter((l) => l.startsWith('- `'));
  const extra = [
    '- `traps` — **Traps.** What `check` does and does not tell you: silent traps (no seed, mm vs MM, entities in <data>, integers by default, date format), the fixes for common errors.',
    '- `from-code` — **TDCv2 data from code.** Load a .tdc in TypeScript, Python, Java, C# or Rust tests; each language\'s traps.',
    '- `guide` — **The guide.** Workflow, the shape of a config, generators, checks, mistakes.',
  ];
  return [...extra, ...index].filter((l) => words.every((w) => l.toLowerCase().includes(w)));
}
