#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const https = require('https');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  force: args.includes('--force'),
  skipOrphanCheck: args.includes('--skip-orphan-check'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  help: args.includes('--help') || args.includes('-h')
};

// Help message
if (options.help) {
  console.log(`
Music Deployment Script for Neocities

Usage: node deploy-music.js [options]

Options:
  --force              Deploy all MP3 files, not just new/changed ones
  --skip-orphan-check  Skip detection of orphaned MP3 files
  --verbose, -v        Verbose output
  --help, -h           Show this help message

Environment Variables:
  NEOCITIES_API_KEY    Required: Your Neocities API key
  NEOCITIES_SITENAME   Optional: Your site name (for verification)
  CI                   Set to 'true' in CI environments for non-interactive mode
`);
  process.exit(0);
}

// Configuration
const CONFIG_FILE = path.join(__dirname, 'public/config/releases.json');
const MUSIC_DIR = path.join(__dirname, 'public/music');
const NEOCITIES_API_KEY = process.env.NEOCITIES_API_KEY;
const IS_CI = process.env.CI === 'true';

if (!NEOCITIES_API_KEY) {
  console.error('❌ NEOCITIES_API_KEY environment variable not set');
  process.exit(1);
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset', isVerbose = false) {
  // Skip verbose messages unless verbose mode is enabled
  if (isVerbose && !options.verbose) {
    return;
  }
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Load releases configuration
function loadReleasesConfig() {
  try {
    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    log(`❌ Error loading releases config: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Get list of MP3 files in music directory
function getMusicFiles() {
  try {
    const files = fs.readdirSync(MUSIC_DIR);
    return files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.mp3' || ext === '.ogg';
    });
  } catch (error) {
    log(`❌ Error reading music directory: ${error.message}`, 'red');
    return [];
  }
}

// Get remote file list from Neocities
async function getRemoteFiles() {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      host: 'neocities.org',
      path: '/api/list',
      headers: {
        'Authorization': `Bearer ${NEOCITIES_API_KEY}`
      }
    };
    
    const req = https.request(options, res => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          
          if (jsonData.result !== 'success') {
            log(`❌ Error from Neocities API: ${jsonData.message}`, 'red');
            resolve([]);
            return;
          }
          
          const musicFiles = jsonData.files.filter(file => 
            file.path.startsWith('music/') && (file.path.endsWith('.mp3') || file.path.endsWith('.ogg'))
          );
          resolve(musicFiles);
        } catch (error) {
          log(`❌ Error parsing response: ${error.message}`, 'red');
          resolve([]);
        }
      });
    });
    
    req.on('error', error => {
      log(`❌ Error fetching remote files: ${error.message}`, 'red');
      resolve([]);
    });
    
    req.end();
  });
}

// Upload file to Neocities
async function uploadFile(filePath, remotePath) {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append(remotePath, fs.createReadStream(filePath));
    
    const options = {
      method: 'POST',
      host: 'neocities.org',
      path: '/api/upload',
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${NEOCITIES_API_KEY}`
      }
    };
    
    const req = https.request(options, res => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.result !== 'success') {
            log(`❌ Upload failed: ${result.message || 'Unknown error'}`, 'red');
            resolve(false);
            return;
          }
          
          resolve(true);
        } catch (error) {
          log(`❌ Error parsing upload response: ${error.message}`, 'red');
          resolve(false);
        }
      });
    });
    
    req.on('error', error => {
      log(`❌ Error uploading ${remotePath}: ${error.message}`, 'red');
      resolve(false);
    });
    
    formData.pipe(req);
  });
}

// Delete file from Neocities
async function deleteFile(remotePath) {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('filenames[]', remotePath);
    
    const options = {
      method: 'POST',
      host: 'neocities.org',
      path: '/api/delete',
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${NEOCITIES_API_KEY}`
      }
    };
    
    const req = https.request(options, res => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.result !== 'success') {
            log(`❌ Delete failed: ${result.message || 'Unknown error'}`, 'red');
            resolve(false);
            return;
          }
          
          resolve(true);
        } catch (error) {
          log(`❌ Error parsing delete response: ${error.message}`, 'red');
          resolve(false);
        }
      });
    });
    
    req.on('error', error => {
      log(`❌ Error deleting ${remotePath}: ${error.message}`, 'red');
      resolve(false);
    });
    
    formData.pipe(req);
  });
}

// Main deployment function
async function deployMusic() {
  log('🎵 Starting music deployment...', 'cyan');
  
  // Load configuration
  const config = loadReleasesConfig();
  const configuredAudioFiles = config.releases.map(release => 
    path.basename(release.audio)
  );
  
  log(`📋 Found ${config.releases.length} releases in configuration`, 'blue');
  
  // Get local MP3 files
  const localMp3Files = getMusicFiles();
  log(`📂 Found ${localMp3Files.length} MP3 files locally`, 'blue');
  
  // Initialize orphan tracking
  let orphanedLocal = [];
  
  // Check for orphaned local files
  if (!options.skipOrphanCheck) {
    orphanedLocal = localMp3Files.filter(file => 
      !configuredAudioFiles.includes(file)
    );
    
    if (orphanedLocal.length > 0) {
      log('⚠️  Warning: Found orphaned local MP3 files:', 'yellow');
      orphanedLocal.forEach(file => log(`   - ${file}`, 'yellow'));
      log('   These files exist locally but are not referenced in releases.json', 'yellow');
    }
  } else {
    log('⏭️  Skipping orphaned file check', 'cyan');
  }
  
  // Check for missing local files
  const missingLocal = configuredAudioFiles.filter(file => 
    !localMp3Files.includes(file)
  );
  
  if (missingLocal.length > 0) {
    log('❌ Error: Missing required MP3 files:', 'red');
    missingLocal.forEach(file => log(`   - ${file}`, 'red'));
    log('   These files are referenced in releases.json but not found locally', 'red');
    process.exit(1);
  }
  
  // Get remote files
  log('🌐 Checking remote files...', 'blue');
  const remoteFiles = await getRemoteFiles();
  const remoteMp3Names = remoteFiles.map(file => path.basename(file.path));
  
  log(`📋 Found ${remoteFiles.length} MP3 files on Neocities`, 'blue');
  
  // Determine files to upload
  const filesToUpload = configuredAudioFiles.filter(file => {
    const localPath = path.join(MUSIC_DIR, file);
    const localExists = fs.existsSync(localPath);
    const remoteExists = remoteMp3Names.includes(file);
    
    if (!localExists) {
      log(`⚠️  Skipping ${file} - not found locally`, 'yellow');
      return false;
    }
    
    // If force mode is enabled, upload all files regardless of remote status
    if (options.force) {
      return true;
    }
    
    return !remoteExists;
  });
  
  if (options.force && filesToUpload.length > 0) {
    log(`🔄 Force mode: Uploading all ${filesToUpload.length} configured MP3 files`, 'cyan');
  }
  
  // Determine orphaned remote files to delete
  const orphanedRemote = remoteMp3Names.filter(file => 
    !configuredAudioFiles.includes(file)
  );
  
  // Upload new files
  let uploadSuccess = 0;
  let uploadFailed = 0;
  
  if (filesToUpload.length > 0) {
    log(`📤 Uploading ${filesToUpload.length} new MP3 files...`, 'green');
    
    for (const file of filesToUpload) {
      const localPath = path.join(MUSIC_DIR, file);
      const remotePath = `music/${file}`;
      
      log(`📤 Uploading: ${file}`, 'cyan');
      
      const success = await uploadFile(localPath, remotePath);
      
      if (success) {
        log(`✅ Successfully uploaded: ${file}`, 'green');
        uploadSuccess++;
      } else {
        uploadFailed++;
      }
      
      // Rate limiting - wait 1 second between uploads
      if (filesToUpload.indexOf(file) < filesToUpload.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } else {
    log('📋 No new MP3 files to upload', 'blue');
  }
  
  // Handle orphaned remote files
  if (!options.skipOrphanCheck && orphanedRemote.length > 0) {
    log(`⚠️  Found ${orphanedRemote.length} orphaned files on Neocities:`, 'yellow');
    orphanedRemote.forEach(file => log(`   - ${file}`, 'yellow'));
    
    let shouldDelete = false;
    
    if (IS_CI) {
      log('🤖 CI mode: Skipping interactive cleanup', 'cyan');
    } else {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('Delete orphaned remote files? (y/N): ', resolve);
      });
      rl.close();
      
      shouldDelete = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
    }
    
    if (shouldDelete) {
      for (const file of orphanedRemote) {
        const remotePath = `music/${file}`;
        log(`🗑️  Deleting: ${file}`, 'yellow');
        
        const success = await deleteFile(remotePath);
        
        if (success) {
          log(`✅ Successfully deleted: ${file}`, 'green');
        }
        
        // Rate limiting
        if (orphanedRemote.indexOf(file) < orphanedRemote.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  } else if (options.skipOrphanCheck) {
    log('⏭️  Skipping orphaned remote file check', 'cyan');
  } else {
    log('✅ No orphaned remote files found', 'green');
  }
  
  // Summary
  log('\n📊 Deployment Summary:', 'cyan');
  log(`✅ Successful uploads: ${uploadSuccess}`, 'green');
  if (uploadFailed > 0) {
    log(`❌ Failed uploads: ${uploadFailed}`, 'red');
  }
  log(`📋 Total configured releases: ${config.releases.length}`, 'blue');
  
  if (orphanedLocal.length > 0) {
    log(`⚠️  Orphaned local files: ${orphanedLocal.length}`, 'yellow');
  }
  
  log('\n🎉 Music deployment completed!', 'green');
}

// Run the deployment
if (require.main === module) {
  deployMusic().catch(error => {
    log(`❌ Deployment failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { deployMusic };
