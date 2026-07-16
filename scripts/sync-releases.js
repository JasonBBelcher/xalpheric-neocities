#!/usr/bin/env node
/* ============================================================================
   sync-releases.js
   ----------------------------------------------------------------------------
   Mirror data-layer JSON files from src/_data/ to public/config/ so the
   CLI's deploy commands find them at the expected paths.

   For every entry in the PAIRS list, the src/_data/<name>.json file is
   the canonical source of truth (edited by hand, next to the other
   data files: collective.json, site.json, light_bleeder_posts.json, etc.)
   and public/config/<name>.json is the build-time mirror.

   Runs as a no-op for any pair where the source doesn't exist or the
   destination is already up to date. This is wired into
   `npm run build:site` so the two never drift.
   ============================================================================
 */

const fs = require('fs');
const path = require('path');

// Each pair: { src, dest }  — label is derived from the basename.
const PAIRS = [
  {
    src:  path.resolve(__dirname, '..', 'src', '_data', 'releases.json'),
    dest: path.resolve(__dirname, '..', 'public', 'config', 'releases.json')
  },
  {
    src:  path.resolve(__dirname, '..', 'src', '_data', 'light_bleeder_releases.json'),
    dest: path.resolve(__dirname, '..', 'public', 'config', 'light_bleeder_releases.json')
  }
];

function syncOne({ src, dest }) {
  if (!fs.existsSync(src)) {
    // No canonical file yet — leave whatever is in public/ alone so an
    // existing deploy isn't wiped.
    return false;
  }

  const srcBytes  = fs.readFileSync(src);
  const destBytes = fs.existsSync(dest) ? fs.readFileSync(dest) : null;

  if (destBytes && Buffer.compare(srcBytes, destBytes) === 0) {
    // Already in sync.
    return false;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, srcBytes);
  console.log(`[sync-releases] ${path.relative(process.cwd(), src)} -> ${path.relative(process.cwd(), dest)}`);
  return true;
}

function main() {
  for (const pair of PAIRS) {
    syncOne(pair);
  }
}

main();
