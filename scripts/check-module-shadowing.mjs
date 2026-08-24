#!/usr/bin/env node
/**
 * Fails when two source files would answer to the same extensionless import.
 *
 * `src/components/Leaderboard.jsx` and `src/components/Leaderboard.tsx` both
 * satisfy `import Leaderboard from "./components/Leaderboard"`, and the two
 * tools in this repository disagree about which one wins:
 *
 *   - Vite's default `resolve.extensions` is
 *     ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'] — `.jsx` first.
 *   - TypeScript prefers `.ts` / `.tsx`.
 *
 * So the bundle got one file and `tsc` checked the other. Every type error
 * reported against the shadowed module was about code that never shipped, and
 * every real error in the code that did ship was invisible. Renaming the
 * surviving file during a migration, or adding one line of `resolve.extensions`
 * to vite.config.js, silently swaps which component users get.
 *
 * Run by `npm run check:shadowing`, and by the lint job in CI.
 */

import { readdirSync, statSync } from 'node:fs';
import { join, extname, basename, relative } from 'node:path';

/** Directories to walk. */
const ROOTS = ['src'];

/** Never descend into these. */
const SKIP_DIRECTORIES = new Set(['node_modules', 'dist', 'coverage', '.git']);

/**
 * Extensions that participate in extensionless module resolution.
 *
 * `.d.ts` is deliberately absent: a declaration file sitting beside its
 * implementation is the intended arrangement, not a collision.
 */
const RESOLVABLE = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts'];

/**
 * Every resolvable source file under `dir`, recursively.
 *
 * @param {string} dir
 * @returns {string[]}
 */
function collectFiles(dir) {
  /** @type {string[]} */
  const found = [];

  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRECTORIES.has(entry)) continue;

    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...collectFiles(full));
      continue;
    }

    if (entry.endsWith('.d.ts')) continue;
    if (RESOLVABLE.includes(extname(entry))) found.push(full);
  }

  return found;
}

/**
 * Groups files by the specifier that would resolve to them.
 *
 * @param {string[]} files
 * @returns {Map<string, string[]>}
 */
function groupBySpecifier(files) {
  /** @type {Map<string, string[]>} */
  const groups = new Map();

  for (const file of files) {
    const key = join(
      file.slice(0, file.length - basename(file).length),
      basename(file, extname(file))
    );
    const existing = groups.get(key);
    if (existing) existing.push(file);
    else groups.set(key, [file]);
  }

  return groups;
}

/**
 * The shadowed module names under `roots`, each with the files that claim it.
 *
 * @param {string[]} [roots]
 * @returns {{specifier: string, files: string[]}[]}
 */
export function findShadowedModules(roots = ROOTS) {
  const files = roots.flatMap((root) => collectFiles(root));

  return [...groupBySpecifier(files).entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([specifier, matches]) => ({
      specifier,
      files: matches.map((file) => relative(process.cwd(), file)).sort(),
    }))
    .sort((a, b) => a.specifier.localeCompare(b.specifier));
}

const isEntryPoint = process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]));

if (isEntryPoint) {
  const shadowed = findShadowedModules();

  if (shadowed.length === 0) {
    console.log('No shadowed modules found.');
    process.exit(0);
  }

  console.error('Shadowed modules found. Each of these resolves differently under Vite and tsc:\n');
  for (const { specifier, files } of shadowed) {
    console.error(`  ${specifier}`);
    for (const file of files) console.error(`    - ${file}`);
    console.error('');
  }
  console.error('Rename or delete one of each pair so a single file answers to the import.');
  process.exit(1);
}
