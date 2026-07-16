#!/usr/bin/env node
/* ============================================================================
   sync-releases.js
   ----------------------------------------------------------------------------
   Mirror src/_data/releases.json (canonical, edited by hand) to
   public/config/releases.json (CLI deploy target).

   The src/_data/ copy is the single source of truth and lives next to the
   other data files (collective.json, light_bleeder_posts.json, site.json).
   The CLI's --config default still points at public/config/releases.json, so
   we keep that file in sync at build time. This script is wired into
   `npm run build:site` so the two never drift.

   Runs as a no-op if src/_data/releases.json is missing or the destination
   is already up to date.
   ============================================================================
 */

const fs = require('fs');
const path = require('path');

const SRC  = path.resolve(__dirname, '..', 'src', '_data', 'releases.json');
const DEST = path.resolve(__dirname, '..', 'public', 'config', 'releases.json');

function main() {
  if (!fs.existsSync(SRC)) {
    // No canonical file yet — leave whatever is in public/ alone so an
    // existing deploy isn't wiped.
    process.exit(0);
  }

  const srcBytes  = fs.readFileSync(SRC);
  const destBytes = fs.existsSync(DEST) ? fs.readFileSync(DEST) : null;

  if (destBytes && Buffer.compare(srcBytes, destBytes) === 0) {
    // Already in sync.
    process.exit(0);
  }

  fs.mkdirSync(path.dirname(DEST), { recursive: true });
  fs.writeFileSync(DEST, srcBytes);
  console.log(`[sync-releases] ${path.relative(process.cwd(), SRC)} -> ${path.relative(process.cwd(), DEST)}`);
}

main();
