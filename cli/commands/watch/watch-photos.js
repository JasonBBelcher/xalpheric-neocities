#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');
const chokidar = require('chokidar');
const os = require('os');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const CONFIG = {
  targetCaption: '#xalpheric',
  photosOutputDir: path.join(PROJECT_ROOT, 'process_photos'),
  videosOutputDir: path.join(PROJECT_ROOT, 'process_video'),
  photosLibraryPath: path.join(os.homedir(), 'Pictures/Photos Library.photoslibrary'),
  watchInterval: 5000, // 5 seconds between database checks
  processedListFile: path.join(__dirname, '..', '..', 'data', 'processed-photos.json'),
  supportedImageExtensions: ['.jpg', '.jpeg', '.png', '.heic', '.tiff', '.gif'],
  supportedVideoExtensions: ['.mov', '.mp4', '.m4v', '.avi'],
  maxFileSize: 100 * 1024 * 1024, // 100MB limit
};

console.log('📸 Xalpheric Photos Watcher');
console.log('============================');
console.log(`🔍 Looking for caption: "${CONFIG.targetCaption}"`);
console.log(`📁 Photos output: ${CONFIG.photosOutputDir}`);
console.log(`🎥 Videos output: ${CONFIG.videosOutputDir}`);
console.log(`📚 Photos Library: ${CONFIG.photosLibraryPath}`);
console.log('');

// Dependency checking
function checkDependencies() {
  const missing = [];
  
  // Check for required commands
  const commands = {
    sqlite3: 'SQLite3 (for database queries)',
    osascript: 'AppleScript (for Photos app integration)',
  };
  
  for (const [command, description] of Object.entries(commands)) {
    try {
      execSync(`command -v ${command}`, { stdio: 'ignore' });
      console.log(`✅ ${description} - available`);
    } catch {
      console.log(`❌ ${description} - missing`);
      missing.push(command);
    }
  }
  
  // Check for Node.js packages
  const nodePackages = ['chokidar'];
  for (const pkg of nodePackages) {
    try {
      require(pkg);
      console.log(`✅ ${pkg} package - available`);
    } catch {
      console.log(`❌ ${pkg} package - missing`);
      missing.push(pkg);
    }
  }
  
  return missing;
}

// Install missing dependencies
async function installMissingDeps(missing) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const shouldInstall = await new Promise((resolve) => {
    rl.question(`\n🤔 Would you like me to install missing dependencies? (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
  
  if (!shouldInstall) {
    console.log('\n❌ Cannot proceed without required dependencies.');
    process.exit(1);
  }
  
  // Install Node.js packages
  const nodePackages = missing.filter(dep => ['chokidar'].includes(dep));
  if (nodePackages.length > 0) {
    try {
      console.log('\n📦 Installing Node.js packages...');
      execSync(`npm install ${nodePackages.join(' ')}`, { stdio: 'inherit' });
      console.log('✅ Node.js packages installed!');
    } catch (error) {
      console.error('❌ Failed to install Node.js packages:', error.message);
      process.exit(1);
    }
  }
  
  // Check for system dependencies
  const systemDeps = missing.filter(dep => ['sqlite3', 'osascript'].includes(dep));
  if (systemDeps.includes('sqlite3')) {
    try {
      console.log('\n📦 Installing SQLite3...');
      execSync('brew install sqlite3', { stdio: 'inherit' });
      console.log('✅ SQLite3 installed!');
    } catch (error) {
      console.error('❌ Failed to install SQLite3. Please install manually:');
      console.error('   brew install sqlite3');
    }
  }
  
  if (systemDeps.includes('osascript')) {
    console.log('\n⚠️  AppleScript should be available on macOS by default.');
    console.log('    If you\'re seeing this error, there may be a system issue.');
  }
}

// Ensure output directories exist
function ensureDirectories() {
  [CONFIG.photosOutputDir, CONFIG.videosOutputDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
}

// Check if Photos library exists and is accessible
function checkPhotosLibrary() {
  if (!fs.existsSync(CONFIG.photosLibraryPath)) {
    console.error(`❌ Photos Library not found at: ${CONFIG.photosLibraryPath}`);
    console.error('💡 Make sure Photos app is set up and has been opened at least once.');
    return false;
  }
  
  const dbPath = path.join(CONFIG.photosLibraryPath, 'database/Photos.sqlite');
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Photos database not found at: ${dbPath}`);
    console.error('💡 Make sure Photos app has been opened and library is initialized.');
    return false;
  }
  
  console.log('✅ Photos Library found and accessible');
  return true;
}

// Get file extension category
function getFileCategory(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (CONFIG.supportedImageExtensions.includes(ext)) return 'photo';
  if (CONFIG.supportedVideoExtensions.includes(ext)) return 'video';
  return 'unknown';
}

// Copy file to appropriate directory
async function copyMediaFile(sourcePath, filename, category) {
  const targetDir = category === 'photo' ? CONFIG.photosOutputDir : CONFIG.videosOutputDir;
  const targetPath = path.join(targetDir, filename);
  
  // Check if file already exists
  if (fs.existsSync(targetPath)) {
    console.log(`⚠️  File already exists: ${filename}`);
    return false;
  }
  
  // Check file size
  const stats = fs.statSync(sourcePath);
  if (stats.size > CONFIG.maxFileSize) {
    console.log(`⚠️  File too large (${Math.round(stats.size / 1024 / 1024)}MB): ${filename}`);
    return false;
  }
  
  try {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`${category === 'photo' ? '📸' : '🎥'} Copied: ${filename} (${Math.round(stats.size / 1024)}KB)`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to copy ${filename}:`, error.message);
    return false;
  }
}

// Query Photos database for media with specific caption
async function queryPhotosDatabase() {
  const dbPath = path.join(CONFIG.photosLibraryPath, 'database/Photos.sqlite');
  
  // SQL query to find assets with our target caption
  // This is a complex query that joins multiple tables in the Photos database
  const query = `
    SELECT 
      ZASSET.ZFILENAME,
      ZASSET.ZDIRECTORY,
      ZASSET.ZKIND,
      ZADDITIONALASSETATTRIBUTES.ZTITLE,
      ZADDITIONALASSETATTRIBUTES.ZACCESSIBILITYDESCRPTION as CAPTION,
      ZASSET.ZMODIFICATIONDATE,
      ZGENERICASSET.ZMASTERFINGERPRINT
    FROM ZASSET
    LEFT JOIN ZADDITIONALASSETATTRIBUTES ON ZASSET.ZADDITIONALATTRIBUTES = ZADDITIONALASSETATTRIBUTES.Z_PK
    LEFT JOIN ZGENERICASSET ON ZASSET.Z_PK = ZGENERICASSET.Z_PK
    WHERE 
      (ZADDITIONALASSETATTRIBUTES.ZTITLE LIKE '%${CONFIG.targetCaption}%' 
       OR ZADDITIONALASSETATTRIBUTES.ZACCESSIBILITYDESCRPTION LIKE '%${CONFIG.targetCaption}%')
      AND ZASSET.ZTRASHEDSTATE = 0
      AND ZASSET.ZHIDDEN = 0
    ORDER BY ZASSET.ZMODIFICATIONDATE DESC;
  `;
  
  try {
    const result = execSync(`sqlite3 -header -csv "${dbPath}" "${query}"`, { 
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large results
    });
    
    return result.trim().split('\n').slice(1) // Remove header
      .filter(line => line.length > 0)
      .map(line => {
        const [filename, directory, kind, title, caption, modDate, fingerprint] = line.split(',');
        return {
          filename: filename?.replace(/"/g, ''),
          directory: directory?.replace(/"/g, ''),
          kind: parseInt(kind) || 0,
          title: title?.replace(/"/g, ''),
          caption: caption?.replace(/"/g, ''),
          modificationDate: modDate?.replace(/"/g, ''),
          fingerprint: fingerprint?.replace(/"/g, '')
        };
      });
  } catch (error) {
    console.error('❌ Failed to query Photos database:', error.message);
    return [];
  }
}

// Alternative: Use AppleScript to get Photos with specific keywords
async function queryPhotosViaAppleScript() {
  const script = `
    tell application "Photos"
      set targetAlbums to {}
      set allPhotos to photos
      
      repeat with currentPhoto in allPhotos
        try
          set photoKeywords to keywords of currentPhoto
          repeat with currentKeyword in photoKeywords
            if currentKeyword contains "${CONFIG.targetCaption}" then
              set photoName to name of currentPhoto
              set photoFilename to filename of currentPhoto
              set photoDate to date of currentPhoto
              set end of targetAlbums to {photoName, photoFilename, photoDate}
              exit repeat
            end if
          end repeat
        on error
          -- Skip photos that can't be accessed
        end try
      end repeat
      
      return targetAlbums
    end tell
  `;
  
  try {
    const result = execSync(`osascript -e '${script}'`, { 
      encoding: 'utf8',
      timeout: 30000 // 30 second timeout
    });
    
    console.log('AppleScript result:', result);
    return [];
  } catch (error) {
    console.error('❌ AppleScript method failed:', error.message);
    return [];
  }
}

// Process found media files
async function processFoundMedia(mediaList) {
  if (mediaList.length === 0) {
    console.log('ℹ️  No media found with caption "' + CONFIG.targetCaption + '"');
    return;
  }
  
  console.log(`\n🎯 Found ${mediaList.length} media items with "${CONFIG.targetCaption}":`);
  
  let copiedCount = 0;
  
  for (const media of mediaList) {
    try {
      // Construct the full path to the media file
      const sourcePath = path.join(CONFIG.photosLibraryPath, 'originals', media.directory, media.filename);
      
      if (!fs.existsSync(sourcePath)) {
        console.log(`⚠️  Source file not found: ${media.filename}`);
        continue;
      }
      
      const category = getFileCategory(media.filename);
      if (category === 'unknown') {
        console.log(`⚠️  Unsupported file type: ${media.filename}`);
        continue;
      }
      
      const success = await copyMediaFile(sourcePath, media.filename, category);
      if (success) copiedCount++;
      
    } catch (error) {
      console.error(`❌ Error processing ${media.filename}:`, error.message);
    }
  }
  
  console.log(`\n📊 Processing complete: ${copiedCount}/${mediaList.length} files copied`);
}

// Watch for changes in Photos library
function startWatching() {
  console.log('\n👀 Starting Photos library watcher...');
  console.log('Press Ctrl+C to stop watching\n');
  
  // Watch the Photos database file for changes
  const dbPath = path.join(CONFIG.photosLibraryPath, 'database/Photos.sqlite');
  
  let isProcessing = false;
  
  const watcher = chokidar.watch(dbPath, {
    persistent: true,
    usePolling: true,
    interval: CONFIG.watchInterval
  });
  
  watcher.on('change', async () => {
    if (isProcessing) return;
    
    isProcessing = true;
    console.log('📱 Photos database changed, checking for new media...');
    
    try {
      const mediaList = await queryPhotosDatabase();
      await processFoundMedia(mediaList);
    } catch (error) {
      console.error('❌ Error during watch processing:', error.message);
    } finally {
      isProcessing = false;
    }
  });
  
  watcher.on('error', (error) => {
    console.error('❌ Watcher error:', error.message);
  });
  
  // Also run periodic checks
  setInterval(async () => {
    if (isProcessing) return;
    
    isProcessing = true;
    try {
      const mediaList = await queryPhotosDatabase();
      await processFoundMedia(mediaList);
    } catch (error) {
      console.error('❌ Error during periodic check:', error.message);
    } finally {
      isProcessing = false;
    }
  }, CONFIG.watchInterval * 6); // Every 30 seconds
  
  // Initial scan
  setTimeout(async () => {
    console.log('🔍 Performing initial scan...');
    const mediaList = await queryPhotosDatabase();
    await processFoundMedia(mediaList);
  }, 1000);
}

// Main execution
(async () => {
  try {
    console.log('🔍 Checking dependencies...');
    const missing = checkDependencies();
    
    if (missing.length > 0) {
      await installMissingDeps(missing);
      
      // Re-check after installation
      const stillMissing = checkDependencies();
      if (stillMissing.length > 0) {
        console.error('\n❌ Some dependencies are still missing. Please install manually.');
        process.exit(1);
      }
    }
    
    console.log('\n📁 Setting up directories...');
    ensureDirectories();
    
    console.log('\n📚 Checking Photos Library...');
    if (!checkPhotosLibrary()) {
      process.exit(1);
    }
    
    // Ask user what they want to do
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const mode = await new Promise((resolve) => {
      rl.question('\n🎯 What would you like to do?\n1) Scan once and exit\n2) Start watching for changes\n\nEnter choice (1 or 2): ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
    
    if (mode === '1') {
      console.log('\n🔍 Performing one-time scan...');
      const mediaList = await queryPhotosDatabase();
      await processFoundMedia(mediaList);
      console.log('\n✅ Scan complete!');
    } else if (mode === '2') {
      startWatching();
    } else {
      console.log('❌ Invalid choice. Exiting.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Received termination signal, shutting down...');
  process.exit(0);
});
