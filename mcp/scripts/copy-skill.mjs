/**
 * Copies the skill into this package before `npm pack` / `npm publish`, so the
 * published server carries the same knowledge and scripts the skill has. The
 * copy (./skill) is generated — never edit it; it is not in git.
 *
 * Finds the skill beside the package: ../skills/tdcv2, or ../skill/tdcv2 in the
 * development repository.
 */
import { cpSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = [join(pkg, '..', 'skills', 'tdcv2'), join(pkg, '..', 'skill', 'tdcv2')].find((d) => existsSync(join(d, 'SKILL.md')));
if (!source) throw new Error('copy-skill: no skill beside this package (../skills/tdcv2 or ../skill/tdcv2)');
const target = join(pkg, 'skill');
rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log(`${source} → ${target}`);
