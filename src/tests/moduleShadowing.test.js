import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findShadowedModules } from '../../scripts/check-module-shadowing.mjs';

/**
 * Regression for #990.
 *
 * `src/components/Leaderboard.jsx` and `src/components/Leaderboard.tsx` both
 * answered to `import Leaderboard from "./components/Leaderboard"`. Vite
 * resolved the `.jsx` and shipped it; TypeScript resolved the `.tsx` and
 * reported errors about code that never ran. The same pair existed for
 * `LocationSearch`, where the shadow was a 49-line stub against a 509-line
 * component.
 */
describe('module shadowing guard', () => {
  /**
   * Builds a throwaway tree and returns its path plus a cleanup function.
   *
   * @param {Record<string, string>} files Relative path to contents.
   */
  function fixture(files) {
    const root = mkdtempSync(join(tmpdir(), 'shadow-check-'));
    for (const [relativePath, contents] of Object.entries(files)) {
      const full = join(root, relativePath);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, contents);
    }
    return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
  }

  it('reports nothing for a tree where every module name is unique', () => {
    const { root, cleanup } = fixture({
      'components/Leaderboard.jsx': 'export default function L() {}',
      'components/LocationSearch.jsx': 'export default function S() {}',
      'utils/format.ts': 'export const f = 1;',
    });

    try {
      expect(findShadowedModules([root])).toEqual([]);
    } finally {
      cleanup();
    }
  });

  it('reports a .jsx / .tsx pair sharing a basename', () => {
    const { root, cleanup } = fixture({
      'components/Leaderboard.jsx': 'export default function L() {}',
      'components/Leaderboard.tsx': 'export const Leaderboard = () => null;',
    });

    try {
      const shadowed = findShadowedModules([root]);
      expect(shadowed).toHaveLength(1);
      expect(shadowed[0].files).toHaveLength(2);
      expect(shadowed[0].files.some((file) => file.endsWith('Leaderboard.jsx'))).toBe(true);
      expect(shadowed[0].files.some((file) => file.endsWith('Leaderboard.tsx'))).toBe(true);
    } finally {
      cleanup();
    }
  });

  it('reports a .js / .ts pair as well', () => {
    const { root, cleanup } = fixture({
      'services/geocoding.js': 'export const a = 1;',
      'services/geocoding.ts': 'export const a: number = 1;',
    });

    try {
      expect(findShadowedModules([root])).toHaveLength(1);
    } finally {
      cleanup();
    }
  });

  it('does not report a declaration file sitting beside its implementation', () => {
    // `format.js` + `format.d.ts` is the intended arrangement, not a collision:
    // the .d.ts is never a module in its own right.
    const { root, cleanup } = fixture({
      'utils/format.js': 'export const f = 1;',
      'utils/format.d.ts': 'export declare const f: number;',
    });

    try {
      expect(findShadowedModules([root])).toEqual([]);
    } finally {
      cleanup();
    }
  });

  it('does not report the same basename in different directories', () => {
    const { root, cleanup } = fixture({
      'components/index.jsx': 'export default 1;',
      'utils/index.js': 'export default 2;',
    });

    try {
      expect(findShadowedModules([root])).toEqual([]);
    } finally {
      cleanup();
    }
  });

  it('finds shadowed pairs nested several directories deep', () => {
    const { root, cleanup } = fixture({
      'a/b/c/Deep.jsx': 'export default 1;',
      'a/b/c/Deep.tsx': 'export const Deep = 1;',
    });

    try {
      expect(findShadowedModules([root])).toHaveLength(1);
    } finally {
      cleanup();
    }
  });

  it('finds no shadowed modules in this repository', () => {
    // The check the CI job runs. If this fails, two files are answering to one
    // import again and the bundler and the type-checker have stopped agreeing.
    expect(findShadowedModules(['src'])).toEqual([]);
  });
});
