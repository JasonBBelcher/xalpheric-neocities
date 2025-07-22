const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');
const { execSync } = require('child_process');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const API_KEY = process.env.NEOCITIES_API_KEY;

// Help text
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🚀 Neocities Recent Commit Deploy

Uploads only files changed in the most recent Git commit to Neocities.

Usage:
  npm run deploy-recent            # Deploy recent commit changes
  npm run deploy-recent --dry-run  # Preview what would be uploaded

Options:
  --dry-run    Show what would be uploaded without actually uploading
  --help, -h   Show this help message

Environment Variables Required:
  NEOCITIES_API_KEY    Your Neocities API key

Example:
  npm run deploy-recent --dry-run
  
Always test with --dry-run first!
`);
  process.exit(0);
}

// Configuration
const CONFIG = {
  dryRun: process.argv.includes('--dry-run'),
  delayBetweenRequests: 1000, // 1 second between uploads for rate limiting
};

// Validate required environment variables (skip in dry-run for testing)
if (!API_KEY && !CONFIG.dryRun) {
  console.error("❌ NEOCITIES_API_KEY environment variable is required");
  console.error("💡 Set it with: export NEOCITIES_API_KEY='your_api_key_here'");
  process.exit(1);
}

const PUBLIC_DIR = path.join(__dirname, '../../public');

console.log("🚀 Neocities Recent Commit Deploy");
console.log(`📁 Source: ${PUBLIC_DIR}`);
console.log(`🔍 Dry Run: ${CONFIG.dryRun ? 'YES' : 'NO'}`);
console.log("");

// Utility functions
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return { result: "error", message: "Invalid JSON from server" };
  }
}

// API call wrapper with rate limiting
async function makeAPICall(options, data = null) {
  return new Promise((resolve) => {
    const req = https.request(options, res => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        const json = tryParseJSON(responseData);
        resolve(json);
      });
    });

    req.on('error', err => {
      resolve({ result: "error", message: err.message });
    });

    if (data) {
      data.pipe(req);
    } else {
      req.end();
    }
  });
}

/**
 * Get files changed in the most recent commit
 */
function getRecentCommitFiles() {
  try {
    console.log('🔍 Getting files changed in most recent commit...');
    
    // Get files changed in the most recent commit
    const output = execSync('git diff --name-only HEAD~1 HEAD', { 
      encoding: 'utf8',
      cwd: path.join(__dirname, '../..')
    });
    
    const changedFiles = output.trim().split('\n').filter(file => file);
    
    if (changedFiles.length === 0) {
      console.log('📝 No files changed in recent commit.');
      return [];
    }
    
    console.log(`📋 Files changed in recent commit (${changedFiles.length}):`);
    changedFiles.forEach(file => console.log(`   ${file}`));
    console.log('');
    
    return changedFiles;
  } catch (error) {
    console.error('❌ Error getting git diff:', error.message);
    console.error('💡 Make sure you are in a Git repository with at least one commit');
    return [];
  }
}

/**
 * Filter files to only include those in the public directory that exist
 */
function filterPublicFiles(files) {
  const publicFiles = [];
  
  for (const file of files) {
    if (file.startsWith('public/')) {
      const relativePath = file.replace('public/', '');
      const fullPath = path.join(PUBLIC_DIR, relativePath);
      
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        publicFiles.push({
          localPath: fullPath,
          remotePath: relativePath
        });
      }
    }
  }
  
  console.log(`📁 Public files to upload: ${publicFiles.length}`);
  if (publicFiles.length > 0) {
    publicFiles.forEach(file => console.log(`   ${file.remotePath}`));
    console.log('');
  }
  
  return publicFiles;
}

/**
 * Upload a single file to Neocities
 */
async function uploadFile(localPath, remotePath, retryCount = 0) {
  const maxRetries = 2;
  
  if (CONFIG.dryRun) {
    console.log(`🔍 DRY RUN - Would upload: ${remotePath}`);
    return true;
  }

  if (!fs.existsSync(localPath)) {
    console.log(`⚠️  Skipping ${remotePath} (file not found)`);
    return false;
  }

  const form = new FormData();
  form.append(remotePath, fs.createReadStream(localPath));

  const options = {
    method: 'POST',
    host: 'neocities.org',
    path: '/api/upload',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...form.getHeaders()
    }
  };

  const response = await makeAPICall(options, form);
  
  if (response.result !== 'success') {
    console.warn(`⚠️ Upload failed for ${remotePath} (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    if (retryCount < maxRetries) {
      console.log(`🔄 Retrying in ${CONFIG.delayBetweenRequests}ms...`);
      await delay(CONFIG.delayBetweenRequests);
      return await uploadFile(localPath, remotePath, retryCount + 1);
    } else {
      console.error(`❌ Failed to upload ${remotePath} after ${maxRetries + 1} attempts`);
      return false;
    }
  }

  console.log(`✅ Uploaded: ${remotePath}`);
  return true;
}

/**
 * Upload all files from the recent commit
 */
async function uploadRecentCommitFiles(files) {
  if (files.length === 0) {
    console.log('📝 No files to upload.');
    return;
  }

  console.log(`📤 Uploading ${files.length} files...`);
  console.log('');
  
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    console.log(`📤 Uploading ${i + 1}/${files.length}: ${file.remotePath}`);
    
    const success = await uploadFile(file.localPath, file.remotePath);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Rate limiting delay between uploads
    if (i < files.length - 1) {
      await delay(CONFIG.delayBetweenRequests);
    }
  }

  console.log('');
  console.log('📊 Upload Summary:');
  console.log(`✅ Successfully uploaded: ${successCount} files`);
  console.log(`❌ Failed uploads: ${failureCount} files`);
  
  if (failureCount === 0) {
    console.log('🎉 All files uploaded successfully!');
  } else {
    console.log('⚠️  Some files failed to upload. Check the logs above.');
    process.exit(1);
  }
}

/**
 * Main deployment function
 */
async function deployRecentCommit() {
  try {
    // Get files changed in recent commit
    const changedFiles = getRecentCommitFiles();
    
    if (changedFiles.length === 0) {
      console.log('📝 No changes to deploy.');
      return;
    }

    // Filter to only public directory files that exist
    const publicFiles = filterPublicFiles(changedFiles);
    
    if (publicFiles.length === 0) {
      console.log('📝 No public files to upload from recent commit.');
      return;
    }

    // Upload the files
    await uploadRecentCommitFiles(publicFiles);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run the deployment
deployRecentCommit();
