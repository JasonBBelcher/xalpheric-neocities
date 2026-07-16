#!/usr/bin/env node
/* ============================================================================
   validate-release.js
   ----------------------------------------------------------------------------
   Bundled validator for the add-xalpheric-release skill. Validates a single
   release entry against the schema used in src/_data/releases.json, then
   performs the JSON edit (insert or replace), runs the sync-releases.js
   mirror, and prints a deploy reminder.

   Usage:
     node .github/skills/add-xalpheric-release/scripts/validate-release.js \
       --id good_mood_geometry \
       --title "Good Mood Geometry" \
       --cover assets/koala-album-art-default.jpg \
       --audio music/Good-mood-geometry.mp3 \
       --description "..." \
       --year 2025 \
       --duration 2:32

   Flags:
     --id <slug>           Required. snake_case slug.
     --title <str>         Required. Display title.
     --cover <path>        Required. Relative path, prefixed assets/...
     --audio <path>        Required. Relative path, prefixed music/...
     --description <str>   Required. One paragraph, ≤ 280 chars.
     --year <int>          Required. 4-digit year.
     --duration <m:ss>     Required. m:ss format.
     --position <front|end>  Optional. Default: front.
     --dry-run             Print what would be written, don't edit.
     --help, -h            Show this header.

   Exit code 0 on success, 1 on validation failure.
   ============================================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');

// scripts/validate-release.js is at .github/skills/add-xalpheric-release/scripts/
//   __dirname = .github/skills/add-xalpheric-release/scripts
//   ../       = .github/skills/add-xalpheric-release
//   ../../    = .github/skills
//   ../../../ = .github
//   ../../../../ = repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function parseArgs(argv) {
  const flags = new Set(['--dry-run', '--help', '-h']);
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (flags.has(a)) {
      if (a === '--help' || a === '-h') {
        const src = fs.readFileSync(__filename, 'utf8');
        const m = src.match(/\/\* =+\n([\s\S]*?)\n\s*\*\//);
        console.log(m ? m[1] : src);
        process.exit(0);
      }
      out[a.slice(2)] = true;
    } else if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[++i];
      if (val === undefined) {
        console.error(`ERROR: --${key} requires a value`);
        process.exit(1);
      }
      out[key] = val;
    } else {
      console.error('Unknown arg:', a);
      process.exit(1);
    }
  }
  return out;
}

function fail(msg) {
  console.error('ERROR:', msg);
  process.exit(1);
}

function validate(entry) {
  const required = ['id', 'title', 'cover', 'audio', 'description', 'year', 'duration'];
  const missing = required.filter((k) => !entry[k] && entry[k] !== 0);
  if (missing.length) fail(`missing fields: ${missing.join(', ')}`);

  if (!/^[a-z][a-z0-9_]*$/.test(entry.id)) {
    fail(`id must be snake_case, got "${entry.id}"`);
  }

  if (!/^assets\//.test(entry.cover)) fail(`cover must start with "assets/", got "${entry.cover}"`);

  if (!/^music\//.test(entry.audio)) fail(`audio must start with "music/", got "${entry.audio}"`);

  if (entry.description.length > 280) {
    fail(`description is ${entry.description.length} chars, max 280`);
  }

  const year = Number(entry.year);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    fail(`year must be an integer 1900-2100, got "${entry.year}"`);
  }
  entry.year = year;

  if (!/^\d+:\d{2}$/.test(entry.duration)) {
    fail(`duration must be m:ss format, got "${entry.duration}"`);
  }

  // Check files exist in public/
  const audioPath = path.join(REPO_ROOT, 'public', entry.audio);
  if (!fs.existsSync(audioPath)) {
    fail(`audio file does not exist: public/${entry.audio}`);
  }
  if (entry.cover !== 'assets/koala-album-art-default.jpg') {
    const coverPath = path.join(REPO_ROOT, 'public', entry.cover);
    if (!fs.existsSync(coverPath)) {
      fail(`cover file does not exist: public/${entry.cover}`);
    }
  }
}

function edit(entry, position) {
  const dataPath = path.join(REPO_ROOT, 'src', '_data', 'releases.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const existing = data.releases.findIndex((r) => r.id === entry.id);
  if (existing !== -1) {
    data.releases[existing] = entry;
    console.log(`REPLACED existing release at index ${existing} (id: ${entry.id})`);
  } else {
    if (position === 'end') {
      data.releases.push(entry);
      console.log(`INSERTED at end (id: ${entry.id})`);
    } else {
      data.releases.unshift(entry);
      console.log('INSERTED at front (index 0, newest-first)');
    }
  }

  // 2-space indent to match existing releases.json
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
  return dataPath;
}

function main() {
  const args = parseArgs(process.argv);
  const entry = {
    id: args.id,
    title: args.title,
    cover: args.cover,
    audio: args.audio,
    description: args.description,
    year: args.year,
    duration: args.duration
  };
  const position = args.position || 'front';

  validate(entry);

  if (args['dry-run'] === true) {
    console.log('--- DRY RUN ---');
    console.log(JSON.stringify(entry, null, 2));
    console.log('--- position: ' + position + ' ---');
    process.exit(0);
  }

  const written = edit(entry, position);
  console.log('Wrote', written);

  // Run the mirror
  const { execSync } = require('child_process');
  try {
    execSync('node scripts/sync-releases.js', { cwd: REPO_ROOT, stdio: 'inherit' });
    console.log('Mirror updated. Next steps:');
    console.log('  npm run build:site');
    console.log('  node cli/index.js deploy config');
    console.log('  node cli/index.js deploy recent');
  } catch (e) {
    console.error('Mirror failed; you can re-run it with: node scripts/sync-releases.js');
    process.exit(1);
  }
}

main();
