/**
 * One version everywhere: mcp/package.json, the plugin, the marketplace entry's
 * plugin and server.json must agree — and with the tag, when a tag is released.
 *
 *   node scripts/check-version.mjs [v0.1.1]
 */
import { readFileSync } from 'node:fs';

const read = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
const pkg = read('mcp/package.json');
const found = {
  'mcp/package.json': pkg.version,
  '.claude-plugin/plugin.json': read('.claude-plugin/plugin.json').version,
  'server.json': read('server.json').version,
  'server.json packages[0]': read('server.json').packages[0].version,
};
const tag = process.argv[2];
if (tag) found[`tag ${tag}`] = tag.replace(/^v/, '');
const versions = new Set(Object.values(found));
for (const [where, v] of Object.entries(found)) console.log(`${versions.size === 1 ? '✓' : '·'} ${where}: ${v}`);
if (versions.size !== 1) { console.error('✗ versions differ'); process.exit(1); }
if (read('server.json').name !== pkg.mcpName) { console.error(`✗ server.json name ${read('server.json').name} ≠ mcpName ${pkg.mcpName}`); process.exit(1); }
console.log(`one version: ${[...versions][0]}`);
