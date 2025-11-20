#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const https = require('https');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  help: args.includes('--help') || args.includes('-h')
};

// Help message
if (options.help) {
  console.log(`
Drum Machine Deployment Script for Neocities

Usage: node deploy-drum-machine.js [options]

Options:
  --dry-run            Show what would be deployed without uploading
  --verbose, -v        Verbose output
  --help, -h           Show this help message

Environment Variables:
  NEOCITIES_API_KEY    Required: Your Neocities API key
  CI                   Set to 'true' in CI environments
`);
  process.exit(0);
}

// Configuration
const DRUM_MACHINE_DIST = path.join(__dirname, '../drum-machine/dist');
const PUBLIC_DIR = path.join(__dirname, 'public');
const NEOCITIES_API_KEY = process.env.NEOCITIES_API_KEY;
const IS_CI = process.env.CI === 'true';

if (!NEOCITIES_API_KEY && !options.dryRun) {
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
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Get all files from a directory recursively
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  
  return arrayOfFiles;
}

// Upload file to Neocities
async function uploadFile(filePath, remotePath) {
  if (options.dryRun) {
    log(`[DRY RUN] Would upload: ${remotePath}`, 'cyan');
    return true;
  }
  
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append(remotePath, fs.createReadStream(filePath));
    
    const requestOptions = {
      method: 'POST',
      host: 'neocities.org',
      path: '/api/upload',
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${NEOCITIES_API_KEY}`
      }
    };
    
    const req = https.request(requestOptions, res => {
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

// Get file size in KB
function getFileSizeKB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024).toFixed(2);
}

// Main deployment function
async function deployDrumMachine() {
  log('🥁 Starting Drum Machine deployment...', 'cyan');
  
  // Check if dist directory exists
  if (!fs.existsSync(DRUM_MACHINE_DIST)) {
    log('❌ Error: drum-machine/dist directory not found', 'red');
    log('   Run "npm run build" in drum-machine directory first', 'yellow');
    process.exit(1);
  }
  
  // Check if main HTML file exists in public
  const mainHtmlPath = path.join(PUBLIC_DIR, 'drum-machine.html');
  if (!fs.existsSync(mainHtmlPath)) {
    log('❌ Error: public/drum-machine.html not found', 'red');
    process.exit(1);
  }
  
  // Check if CSS file exists in public
  const mainCssPath = path.join(PUBLIC_DIR, 'css', 'drum-machine.css');
  if (!fs.existsSync(mainCssPath)) {
    log('❌ Error: public/css/drum-machine.css not found', 'red');
    process.exit(1);
  }
  
  log('✅ Found drum-machine/dist directory', 'green');
  log('✅ Found drum-machine.html', 'green');
  log('✅ Found drum-machine.css', 'green');
  
  // Get all dist files
  const distFiles = getAllFiles(DRUM_MACHINE_DIST);
  log(`📋 Found ${distFiles.length} files to deploy from dist/`, 'blue');
  
  // Categorize files
  const fileCategories = {
    html: [],
    js: [],
    css: [],
    samples: [],
    maps: []
  };
  
  distFiles.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.html') fileCategories.html.push(file);
    else if (ext === '.js') fileCategories.js.push(file);
    else if (ext === '.css') fileCategories.css.push(file);
    else if (ext === '.wav' || ext === '.mp3' || ext === '.ogg') fileCategories.samples.push(file);
    else if (ext === '.map') fileCategories.maps.push(file);
  });
  
  log(`📊 File breakdown:`, 'cyan');
  log(`   HTML: ${fileCategories.html.length}`, 'blue');
  log(`   JavaScript: ${fileCategories.js.length}`, 'blue');
  log(`   CSS: ${fileCategories.css.length}`, 'blue');
  log(`   Samples: ${fileCategories.samples.length}`, 'blue');
  log(`   Source maps: ${fileCategories.maps.length}`, 'blue');
  
  // Calculate total size
  let totalSize = 0;
  distFiles.forEach(file => {
    if (!file.endsWith('.map')) { // Exclude source maps from size calculation
      totalSize += fs.statSync(file).size;
    }
  });
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  log(`📦 Total size (excluding source maps): ${totalSizeMB} MB`, 'cyan');
  
  if (options.dryRun) {
    log('\n🔍 DRY RUN MODE - No files will be uploaded\n', 'yellow');
  }
  
  // Prepare upload list
  const uploads = [];
  
  // 1. Main HTML page
  uploads.push({
    localPath: mainHtmlPath,
    remotePath: 'drum-machine.html',
    description: 'Main HTML page'
  });
  
  // 2. Main CSS
  uploads.push({
    localPath: mainCssPath,
    remotePath: 'css/drum-machine.css',
    description: 'Main stylesheet'
  });
  
  // 3. All dist files go to js/drum-machine/
  distFiles.forEach(file => {
    const relativePath = path.relative(DRUM_MACHINE_DIST, file);
    const remotePath = `js/drum-machine/${relativePath}`;
    
    // Skip source maps in production (saves bandwidth)
    if (file.endsWith('.map')) {
      return;
    }
    
    uploads.push({
      localPath: file,
      remotePath: remotePath,
      description: path.basename(file)
    });
  });
  
  log(`\n📤 Will upload ${uploads.length} files\n`, 'green');
  
  // Show file list in verbose mode
  if (options.verbose || options.dryRun) {
    log('📋 File list:', 'cyan');
    uploads.forEach(({ localPath, remotePath, description }) => {
      const sizeKB = getFileSizeKB(localPath);
      log(`   ${remotePath} (${sizeKB} KB)`, 'blue');
    });
    log('');
  }
  
  if (options.dryRun) {
    log('✅ Dry run complete - ready to deploy!', 'green');
    return;
  }
  
  // Upload files
  let uploadSuccess = 0;
  let uploadFailed = 0;
  
  log('📤 Starting upload...', 'cyan');
  
  for (let i = 0; i < uploads.length; i++) {
    const { localPath, remotePath, description } = uploads[i];
    
    log(`📤 [${i + 1}/${uploads.length}] Uploading: ${description}`, 'cyan');
    
    const success = await uploadFile(localPath, remotePath);
    
    if (success) {
      log(`✅ Successfully uploaded: ${remotePath}`, 'green');
      uploadSuccess++;
    } else {
      uploadFailed++;
    }
    
    // Rate limiting - wait 1 second between uploads
    if (i < uploads.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Summary
  log('\n📊 Deployment Summary:', 'cyan');
  log(`✅ Successful uploads: ${uploadSuccess}`, 'green');
  if (uploadFailed > 0) {
    log(`❌ Failed uploads: ${uploadFailed}`, 'red');
  }
  log(`📦 Total size deployed: ${totalSizeMB} MB`, 'blue');
  
  if (uploadSuccess === uploads.length) {
    log('\n🎉 Drum Machine deployment completed successfully!', 'green');
    log('🌐 Visit: https://xalpheric.neocities.org/drum-machine.html', 'cyan');
  } else {
    log('\n⚠️  Deployment completed with errors', 'yellow');
    process.exit(1);
  }
}

// Run the deployment
if (require.main === module) {
  deployDrumMachine().catch(error => {
    log(`❌ Deployment failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { deployDrumMachine };
