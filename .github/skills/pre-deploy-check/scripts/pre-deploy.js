#!/usr/bin/env node
/* ============================================================================
   pre-deploy.js
   ----------------------------------------------------------------------------
   Bundled orchestrator for the pre-deploy-check skill. Runs four checks and
   reports go/no-go. READ-ONLY: edits no files. Exit 0 if all green, 1 if any
   failure.

   Checks:
     1. public/ staleness — every src/ file should have a corresponding
        public/ file that's newer or equal in mtime.
     2. data mirrors in sync — src/_data/*.json === public/config/*.json
     3. jest suite green — runs `npm test` and propagates the exit code
     4. public/ asset audit — YouTube IDs, IG shortcodes, oversized images

   Usage:
     node .github/skills/pre-deploy-check/scripts/pre-deploy.js
     node .github/skills/pre-deploy-check/scripts/pre-deploy.js --skip-tests
     node .github/skills/pre-deploy-check/scripts/pre-deploy.js --skip-build-check
   ============================================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// scripts/pre-deploy.js is at .github/skills/pre-deploy-check/scripts/
//   __dirname   = .github/skills/pre-deploy-check/scripts
//   ../         = .github/skills/pre-deploy-check
//   ../../      = .github/skills
//   ../../../   = .github
//   ../../../../ = repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function parseArgs(argv) {
  const flags = new Set(['--skip-tests', '--skip-build-check', '--skip-audit', '--help', '-h']);
  const out = { skipTests: false, skipBuildCheck: false, skipAudit: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!flags.has(a)) {
      console.error('Unknown flag:', a);
      process.exit(1);
    }
    if (a === '--help' || a === '-h') {
      const src = fs.readFileSync(__filename, 'utf8');
      const m = src.match(/\/\* =+\n([\s\S]*?)\n\s*\*\//);
      console.log(m ? m[1] : src);
      process.exit(0);
    }
    if (a === '--skip-tests') out.skipTests = true;
    if (a === '--skip-build-check') out.skipBuildCheck = true;
    if (a === '--skip-audit') out.skipAudit = true;
  }
  return out;
}

function header(title) {
  console.log('\n=== ' + title + ' ===');
}

function check1_BuildStaleness() {
  header('Check 1: src/ vs public/ staleness');

  // Mirror pairs (src/_data → public/config) — content-equal is enough,
  // not strictly mtime-newer, because sync-releases.js is a no-op on
  // byte-equal content (so the mirror's mtime can lag without being stale).
  const mirrorPairs = [
    { src: 'src/_data/releases.json', dest: 'public/config/releases.json' },
    { src: 'src/_data/light_bleeder_releases.json', dest: 'public/config/light_bleeder_releases.json' }
  ];

  // Page pairs (src/*.njk → public/*.html) — Eleventy rewrites these on
  // every build, so a stale mtime on the output really does mean the
  // page is stale.
  const pagePairs = [];
  const srcDir = path.join(REPO_ROOT, 'src');
  if (fs.existsSync(srcDir)) {
    for (const entry of fs.readdirSync(srcDir)) {
      if (entry.endsWith('.njk')) {
        pagePairs.push({
          src: `src/${entry}`,
          dest: `public/${entry.replace(/\.njk$/, '.html')}`
        });
      }
    }
  }

  const failures = [];

  // Mirror pairs: content-equal is fine
  for (const { src, dest } of mirrorPairs) {
    const srcPath = path.join(REPO_ROOT, src);
    const destPath = path.join(REPO_ROOT, dest);
    if (!fs.existsSync(srcPath)) continue;
    if (!fs.existsSync(destPath)) {
      failures.push(`MISSING mirror: ${dest} (run \`node scripts/sync-releases.js\`)`);
      continue;
    }
    const a = fs.readFileSync(srcPath, 'utf8').replace(/\s+/g, ' ').trim();
    const b = fs.readFileSync(destPath, 'utf8').replace(/\s+/g, ' ').trim();
    if (a !== b) {
      failures.push(`DRIFT: ${src} content !== ${dest} content (re-run \`node scripts/sync-releases.js\`)`);
    }
  }
  if (failures.length === 0) {
    console.log(`  ✓ all ${mirrorPairs.length} data mirrors are content-equal`);
  }

  // Page pairs: mtime-based is fine, Eleventy always rewrites
  for (const { src, dest } of pagePairs) {
    const srcPath = path.join(REPO_ROOT, src);
    const destPath = path.join(REPO_ROOT, dest);
    if (!fs.existsSync(srcPath)) continue;
    if (!fs.existsSync(destPath)) {
      failures.push(`MISSING build output: ${dest} (run \`npm run build:site\`)`);
      continue;
    }
    const srcMtime = fs.statSync(srcPath).mtimeMs;
    const destMtime = fs.statSync(destPath).mtimeMs;
    if (srcMtime > destMtime) {
      failures.push(`STALE: ${src} is newer than ${dest} (rebuild)`);
    }
  }
  if (pagePairs.length && failures.length === 0) {
    console.log(`  ✓ all ${pagePairs.length} page pairs are fresh`);
  }

  if (failures.length) {
    failures.forEach((f) => console.error('  ✗', f));
    return 1;
  }
  return 0;
}

function check2_DataMirrors() {
  header('Check 2: data-layer mirrors in sync');
  const pairs = [
    { src: 'src/_data/releases.json', dest: 'public/config/releases.json' },
    { src: 'src/_data/light_bleeder_releases.json', dest: 'public/config/light_bleeder_releases.json' }
  ];
  let rc = 0;
  for (const { src, dest } of pairs) {
    const srcPath = path.join(REPO_ROOT, src);
    const destPath = path.join(REPO_ROOT, dest);
    if (!fs.existsSync(srcPath)) continue;
    if (!fs.existsSync(destPath)) {
      console.error(`  ✗ ${dest} missing (run \`node scripts/sync-releases.js\`)`);
      rc = 1;
      continue;
    }
    const a = fs.readFileSync(srcPath, 'utf8').replace(/\s+/g, ' ').trim();
    const b = fs.readFileSync(destPath, 'utf8').replace(/\s+/g, ' ').trim();
    if (a !== b) {
      console.error(`  ✗ ${src} !== ${dest} (run \`node scripts/sync-releases.js\`)`);
      rc = 1;
    } else {
      console.log(`  ✓ ${src} === ${dest}`);
    }
  }
  return rc;
}

function check3_Jest() {
  header('Check 3: jest suite');
  try {
    execSync('npm test --silent', { cwd: REPO_ROOT, stdio: 'inherit' });
    console.log('  ✓ all tests pass');
    return 0;
  } catch (e) {
    console.error('  ✗ jest failed');
    return 1;
  }
}

function check4_AssetAudit() {
  header('Check 4: public/ asset audit');
  let rc = 0;
  const publicDir = path.join(REPO_ROOT, 'public');
  if (!fs.existsSync(publicDir)) {
    console.error('  ✗ public/ does not exist');
    return 1;
  }

  // Walk public/ for HTML files
  const htmlFiles = [];
  const stack = [publicDir];
  while (stack.length) {
    const cur = stack.pop();
    for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && e.name.endsWith('.html')) htmlFiles.push(full);
    }
  }

  // Check YouTube IDs
  const ytRe = /youtube\.com\/embed\/([A-Za-z0-9_-]+)/g;
  const ytValid = /^[A-Za-z0-9_-]{11}$/;
  const ytSeen = new Set();
  for (const f of htmlFiles) {
    const text = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = ytRe.exec(text)) !== null) {
      const id = m[1];
      if (ytSeen.has(id)) continue;
      ytSeen.add(id);
      if (!ytValid.test(id)) {
        console.error(`  ✗ bad YouTube id "${id}" in ${path.relative(REPO_ROOT, f)}`);
        rc = 1;
      }
    }
  }
  console.log(`  ✓ ${ytSeen.size} unique YouTube IDs, all valid format`);

  // Check IG shortcodes
  const igRe = /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/g;
  const igValid = /^[A-Za-z0-9_-]{11}$/;
  const igSeen = new Set();
  for (const f of htmlFiles) {
    const text = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = igRe.exec(text)) !== null) {
      const id = m[1];
      if (igSeen.has(id)) continue;
      igSeen.add(id);
      if (!igValid.test(id)) {
        console.error(`  ✗ bad IG shortcode "${id}" in ${path.relative(REPO_ROOT, f)}`);
        rc = 1;
      }
    }
  }
  console.log(`  ✓ ${igSeen.size} unique IG shortcodes, all valid format`);

  // Check oversized images
  const imgDir = path.join(publicDir, 'images');
  if (fs.existsSync(imgDir)) {
    const oversized = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.isFile() && /\.(jpe?g|png|webp)$/i.test(e.name)) {
          const size = fs.statSync(full).size;
          if (size > 1_000_000) {
            oversized.push({ file: path.relative(REPO_ROOT, full), size });
          }
        }
      }
    };
    walk(imgDir);
    if (oversized.length) {
      for (const o of oversized) {
        console.error(`  ✗ oversized image: ${o.file} (${(o.size / 1024 / 1024).toFixed(2)}MB)`);
        rc = 1;
      }
    } else {
      console.log('  ✓ no images over 1MB in public/images/');
    }
  }

  return rc;
}

function main() {
  const args = parseArgs(process.argv);
  const results = [];

  if (!args.skipBuildCheck) results.push(['1. Staleness', check1_BuildStaleness()]);
  results.push(['2. Data mirrors', check2_DataMirrors()]);
  if (!args.skipTests) results.push(['3. Jest', check3_Jest()]);
  if (!args.skipAudit) results.push(['4. Asset audit', check4_AssetAudit()]);

  console.log('\n=== Summary ===');
  let anyFail = false;
  for (const [name, rc] of results) {
    const mark = rc === 0 ? '✓' : '✗';
    console.log(`  ${mark} ${name}`);
    if (rc !== 0) anyFail = true;
  }

  if (anyFail) {
    console.log('\nNO-GO. Surface the failures above; do not deploy.');
    process.exit(1);
  } else {
    console.log('\nGO. Safe to deploy.');
    process.exit(0);
  }
}

main();
