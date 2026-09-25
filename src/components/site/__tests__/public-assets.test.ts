import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/**
 * Every static asset the source points at must actually be on disk.
 *
 * A wrong path here fails silently in exactly the way that is hardest to
 * notice: the build passes, the page renders, the type checks, and the reader
 * gets a broken image. Nothing in the test suite looked at `public/` before
 * this, and a dead link of precisely this shape — a portal route that was
 * promised in a message and did not exist — had already shipped once.
 *
 * Deliberately a filesystem check rather than a mock. The failure mode is a
 * file not being there, so the only test that can catch it is one that looks.
 */

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const PUBLIC = join(ROOT, 'public');

/** Source extensions worth scanning for asset references. */
const CODE = new Set(['.ts', '.tsx', '.css']);

/**
 * Absolute public paths appearing in quotes or template literals.
 * Restricted to real asset extensions so it cannot mistake a route like
 * `/about` for a file, and so a `/api/...` string is never considered.
 */
const ASSET_REF =
  /["'`](\/(?:[A-Za-z0-9._\-/]+)\.(?:webp|png|jpe?g|svg|gif|avif|mp4|webm|ico|woff2?))["'`]/g;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      out.push(...sourceFiles(full));
    } else if (CODE.has(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function collectReferences(): Map<string, string[]> {
  const refs = new Map<string, string[]>();
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(ASSET_REF)) {
      const path = match[1];
      const seen = refs.get(path) ?? [];
      seen.push(file.slice(ROOT.length + 1));
      refs.set(path, seen);
    }
  }
  return refs;
}

describe('static assets referenced from source', () => {
  it('every referenced file exists in public/', () => {
    const refs = collectReferences();
    // Sanity: if the scanner ever stops finding anything, the assertion below
    // would pass vacuously and guard nothing.
    expect(refs.size).toBeGreaterThan(10);

    const missing: string[] = [];
    for (const [path, sources] of refs) {
      const onDisk = join(PUBLIC, path);
      if (!existsSync(onDisk) || !statSync(onDisk).isFile()) {
        missing.push(`${path}  <- ${[...new Set(sources)].join(', ')}`);
      }
    }
    expect(missing, `referenced but not in public/:\n${missing.join('\n')}`).toEqual([]);
  });

  it('every brain pose the BrainMark type allows has a render', async () => {
    // The real array, not a regex over the source: a pose added to the union
    // without the matching file is exactly the mistake this is here to catch,
    // and parsing the file for it could go stale against the code it guards.
    const { POSES } = await import('../BrainMark');
    expect(POSES.length).toBeGreaterThan(0);

    const missing = POSES.filter(
      (pose) => !existsSync(join(PUBLIC, '3dasset', `brain-${pose}.webp`)),
    );
    expect(missing, `poses with no file: ${missing.join(', ')}`).toEqual([]);
  });
});
