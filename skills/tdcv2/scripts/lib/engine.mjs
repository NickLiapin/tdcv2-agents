/**
 * Where the TDCv2 engine is on this machine. Shared by the skill's scripts and
 * the MCP server, so both use the same engine a person's project uses.
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, delimiter } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The package folder of whatever file inside tdcv2 a lookup landed on. */
export function packageRoot(file) {
  for (let d = dirname(file); d !== dirname(d); d = dirname(d)) {
    try {
      if (JSON.parse(readFileSync(join(d, 'package.json'), 'utf8')).name === 'tdcv2') return d;
    } catch { /* not here */ }
  }
  return null;
}

/**
 * The engine to load, as dist/index.js. Works on macOS, Linux and Windows:
 *   1. the project's own install — resolved the way Node resolves it from `cwd`;
 *   2. every PATH folder, in the three layouts npm uses: a symlinked bin (Unix),
 *      node_modules/.bin with .cmd shims (Windows, and npx's cache everywhere),
 *      a global prefix with node_modules beside the shims (Windows);
 *   3. `fallback`, a folder the caller brings (the MCP server's own dependency).
 * A candidate that is missing, dangling or unreadable (a stale `npm link`, a
 * sandbox) is skipped, not fatal.
 */
export function findEngine({ cwd = process.cwd(), path = process.env.PATH ?? '', fallback } = {}) {
  const tries = [() => packageRoot(createRequire(join(cwd, 'noop.js')).resolve('tdcv2'))];
  for (const d of path.split(delimiter).filter(Boolean)) {
    tries.push(() => packageRoot(realpathSync(join(d, 'tdcv2'))));
    tries.push(() => join(d, '..', 'tdcv2'));
    tries.push(() => join(d, 'node_modules', 'tdcv2'));
  }
  if (fallback) tries.push(() => fallback);
  for (const t of tries) {
    try {
      const root = t();
      const index = root && join(root, 'dist', 'index.js');
      if (index && existsSync(index)) return index;
    } catch { /* next */ }
  }
  return null;
}

/** Load the engine found by findEngine; null if none loads. */
export async function loadEngine(opts) {
  const index = findEngine(opts);
  if (!index) return null;
  try {
    const mod = await import(pathToFileURL(index).href);
    return { mod, index, root: dirname(dirname(index)) };
  } catch {
    return null;
  }
}

/** An argument for cmd.exe → CommandLineToArgvW: quoted, inner quotes and trailing backslashes escaped. */
export const winQuote = (a) => (/^[\w@.:\\/=+-]+$/.test(a) ? a : `"${a.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1')}"`);
