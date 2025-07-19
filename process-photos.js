#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node process-photos.js <size> <format> [naming_pattern]');
  console.log('Examples:');
  console.log('  node process-photos.js 512x512 jpg');
  console.log('  node process-photos.js 512x512 jpg studio{increment}');
  console.log('  node process-photos.js 512x512 png photo{increment}');
  process.exit(1);
}

const size = args[0];
const format = args[1];
const naming = args[2] || '';

// Build the command
const scriptPath = path.join(__dirname, 'process_photos', 'run_me.sh');
let command = `cd process_photos && ./run_me.sh ${size} ${format}`;

if (naming) {
  command += ` "${naming}"`;
}

try {
  console.log(`🎯 Running: ${command}`);
  execSync(command, { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.error('❌ Photo processing failed:', error.message);
  process.exit(1);
}
