#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { compareDirectories, syncGeneratedOutput } = require('./check-public-sync');

const projectRoot = path.resolve(__dirname, '..');
const tempDir = path.join(projectRoot, '.tmp-public-build');
const publicDir = path.join(projectRoot, 'public');
const generatedDir = tempDir;
const checkOnly = process.argv.includes('--check');

function runEleventy() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  const result = spawnSync('./node_modules/.bin/eleventy', ['--output', tempDir], {
    cwd: projectRoot,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function main() {
  runEleventy();

  const comparison = compareDirectories({ generatedDir, publicDir });

  if (comparison.drift.length > 0 || comparison.missing.length > 0) {
    console.log('\nPublic HTML drift detected:');
    if (comparison.drift.length > 0) {
      console.log('Different HTML files:');
      for (const file of comparison.drift) {
        console.log(`  - ${file}`);
      }
    }
    if (comparison.missing.length > 0) {
      console.log('Missing from public:');
      for (const file of comparison.missing) {
        console.log(`  - ${file}`);
      }
    }
  }

  if (checkOnly) {
    process.exit(comparison.drift.length > 0 || comparison.missing.length > 0 ? 1 : 0);
  }

  const sync = syncGeneratedOutput({ generatedDir, publicDir });
  if (sync.skipped.length > 0) {
    console.log('\nPreserved manual edits in public for:');
    for (const file of sync.skipped) {
      console.log(`  - ${file}`);
    }
  }

  if (sync.copied.length > 0) {
    console.log('\nUpdated generated files:');
    for (const file of sync.copied) {
      console.log(`  - ${file}`);
    }
  }

  console.log('\nSafe build complete. Manual HTML changes in public were preserved.');
}

main();
