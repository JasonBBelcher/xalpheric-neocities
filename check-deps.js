#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔍 Checking all project dependencies...\n');

// Check system dependencies
const systemDeps = [
  { command: 'magick', name: 'ImageMagick', needed: 'photo processing' },
  { command: 'ffmpeg', name: 'FFmpeg', needed: 'video processing' },
  { command: 'jq', name: 'jq', needed: 'video processing (JSON handling)' }
];

console.log('📋 System Dependencies:');
systemDeps.forEach(dep => {
  try {
    execSync(`command -v ${dep.command}`, { stdio: 'ignore' });
    console.log(`✅ ${dep.name} - available`);
  } catch {
    console.log(`❌ ${dep.name} - missing (needed for ${dep.needed})`);
  }
});

// Check Node.js dependencies
console.log('\n📋 Node.js Dependencies:');
const nodeDeps = ['form-data', 'markdown-it'];

nodeDeps.forEach(pkg => {
  try {
    require(pkg);
    console.log(`✅ ${pkg} - available`);
  } catch {
    console.log(`❌ ${pkg} - missing`);
  }
});

console.log('\n💡 Run individual scripts to get installation prompts!');
