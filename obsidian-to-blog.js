#!/usr/bin/env node

/**
 * Complete Obsidian to Blog Workflow
 * 
 * This script automates the complete workflow:
 * 1. Sync Obsidian images to blog assets
 * 2. Build musings with enhanced markdown
 * 3. Optionally deploy to Neocities
 */

const { execSync } = require('child_process');

function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting complete Obsidian to Blog workflow...\n');
  
  // Step 1: Sync Obsidian images
  const syncSuccess = runCommand('npm run sync-obsidian-images', 'Syncing Obsidian images');
  if (!syncSuccess) {
    console.log('⚠️  Image sync failed, but continuing with build...');
  }
  
  // Step 2: Build musings
  const buildSuccess = runCommand('npm run build-musings', 'Building blog posts');
  if (!buildSuccess) {
    console.error('❌ Build failed, stopping workflow');
    process.exit(1);
  }
  
  // Step 3: Ask about deployment
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('\n📤 Deploy to Neocities? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('\n🚀 Deploying to Neocities...');
      runCommand('npm run deploy', 'Deploying blog content');
    } else {
      console.log('\n✅ Workflow complete! Run "npm run deploy" when ready to publish.');
    }
    
    console.log('\n🎵 Blog workflow finished! ✨');
    readline.close();
  });
}

main().catch(console.error);
