#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const os = require('os');

// Configuration
const CONFIG = {
  targetKeyword: 'xalpheric',
  photosOutputDir: path.join(__dirname, 'process_photos'),
  videosOutputDir: path.join(__dirname, 'process_video'),
  watchInterval: 10000, // 10 seconds between checks
  processedListFile: path.join(__dirname, '.processed-photos.json'),
  supportedImageExtensions: ['.jpg', '.jpeg', '.png', '.heic', '.tiff', '.gif'],
  supportedVideoExtensions: ['.mov', '.mp4', '.m4v', '.avi'],
  maxFileSize: 100 * 1024 * 1024, // 100MB limit
};

console.log('📸 Xalpheric Photos Watcher (AppleScript Method)');
console.log('=================================================');
console.log(`🏷️  Looking for keyword: "${CONFIG.targetKeyword}"`);
console.log(`📁 Photos output: ${CONFIG.photosOutputDir}`);
console.log(`🎥 Videos output: ${CONFIG.videosOutputDir}`);
console.log('');

// Load list of already processed photos
function loadProcessedList() {
  try {
    if (fs.existsSync(CONFIG.processedListFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.processedListFile, 'utf8'));
    }
  } catch (error) {
    console.log('⚠️  Could not load processed list, starting fresh');
  }
  return {};
}

// Save list of processed photos
function saveProcessedList(processedList) {
  try {
    fs.writeFileSync(CONFIG.processedListFile, JSON.stringify(processedList, null, 2));
  } catch (error) {
    console.error('❌ Failed to save processed list:', error.message);
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

// Check if Photos app is available
function checkPhotosApp() {
  try {
    const result = execSync(`osascript -e 'tell application "Photos" to get version'`, { 
      encoding: 'utf8',
      timeout: 5000
    });
    console.log(`✅ Photos app available (version: ${result.trim()})`);
    return true;
  } catch (error) {
    console.error('❌ Photos app not available or accessible');
    console.error('💡 Make sure Photos app is installed and you have granted necessary permissions');
    return false;
  }
}

// Get file extension category
function getFileCategory(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (CONFIG.supportedImageExtensions.includes(ext)) return 'photo';
  if (CONFIG.supportedVideoExtensions.includes(ext)) return 'video';
  return 'unknown';
}

// Export photo from Photos app
async function exportPhotoFromPhotos(photoId, filename, isVideo = false) {
  const category = isVideo ? 'video' : 'photo';
  const targetDir = isVideo ? CONFIG.videosOutputDir : CONFIG.photosOutputDir;
  const tempExportDir = path.join(os.tmpdir(), 'xalpheric-export');
  
  // Create temp directory
  if (!fs.existsSync(tempExportDir)) {
    fs.mkdirSync(tempExportDir, { recursive: true });
  }
  
  try {
    // Create temporary AppleScript file
    const tempScriptPath = path.join(os.tmpdir(), 'xalpheric-export.scpt');
    const appleScript = `tell application "Photos"
	set targetPhoto to media item id "${photoId}"
	export {targetPhoto} to POSIX file "${tempExportDir}"
end tell`;
    
    // Write script to temporary file
    fs.writeFileSync(tempScriptPath, appleScript);
    
    execSync(`osascript "${tempScriptPath}"`, { 
      encoding: 'utf8',
      timeout: 30000 // 30 second timeout for export
    });
    
    // Find the exported file
    const exportedFiles = fs.readdirSync(tempExportDir);
    const exportedFile = exportedFiles.find(file => 
      file.toLowerCase().includes(filename.toLowerCase().split('.')[0])
    );
    
    if (!exportedFile) {
      console.log(`⚠️  Could not find exported file for: ${filename}`);
      return false;
    }
    
    const sourcePath = path.join(tempExportDir, exportedFile);
    const targetPath = path.join(targetDir, exportedFile);
    
    // Check if file already exists
    if (fs.existsSync(targetPath)) {
      console.log(`⚠️  File already exists: ${exportedFile}`);
      fs.unlinkSync(sourcePath); // Clean up temp file
      return false;
    }
    
    // Check file size
    const stats = fs.statSync(sourcePath);
    if (stats.size > CONFIG.maxFileSize) {
      console.log(`⚠️  File too large (${Math.round(stats.size / 1024 / 1024)}MB): ${exportedFile}`);
      fs.unlinkSync(sourcePath); // Clean up temp file
      return false;
    }
    
    // Move file to target directory
    fs.renameSync(sourcePath, targetPath);
    console.log(`${isVideo ? '🎥' : '📸'} Exported: ${exportedFile} (${Math.round(stats.size / 1024)}KB)`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to export ${filename}:`, error.message);
    return false;
  } finally {
    // Clean up temp directory
    try {
      if (fs.existsSync(tempExportDir)) {
        fs.rmSync(tempExportDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    // Clean up script file
    try {
      const tempScriptPath = path.join(os.tmpdir(), 'xalpheric-export.scpt');
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

// Query Photos app for media with specific keyword
async function queryPhotosForKeyword() {
  console.log(`🔍 Searching Photos app for keyword "${CONFIG.targetKeyword}"...`);
  
  // For large libraries, try album method first since it's faster
  console.log('⚡ Trying album method first (faster for large libraries)...');
  try {
    const albumPhotos = await queryPhotosSimple();
    if (albumPhotos.length > 0) {
      console.log(`✅ Found ${albumPhotos.length} photos in "${CONFIG.targetKeyword}" album`);
      return albumPhotos;
    }
    console.log(`ℹ️  No "${CONFIG.targetKeyword}" album found, trying keyword search...`);
  } catch (error) {
    console.log('⚠️  Album method failed, trying keyword search...');
  }
  
  // Fallback to keyword search
  // Create temporary AppleScript file
  const tempScriptPath = path.join(os.tmpdir(), 'xalpheric-photos-query.scpt');
  const appleScript = `tell application "Photos"
	set foundPhotos to {}
	set allPhotos to every media item
	
	repeat with currentPhoto in allPhotos
		try
			set photoKeywords to keywords of currentPhoto
			set photoFilename to filename of currentPhoto
			set photoId to id of currentPhoto
			set photoDate to date of currentPhoto
			set photoName to name of currentPhoto
			
			repeat with currentKeyword in photoKeywords
				if currentKeyword contains "${CONFIG.targetKeyword}" then
					set photoInfo to photoId & "|" & photoFilename & "|" & photoName & "|unknown|" & (photoDate as string)
					set end of foundPhotos to photoInfo
					exit repeat
				end if
			end repeat
		on error errMsg
			-- Skip photos that can't be read
		end try
	end repeat
	
	return foundPhotos
end tell`;

  try {
    // Write script to temporary file
    fs.writeFileSync(tempScriptPath, appleScript);
    
    const result = execSync(`osascript "${tempScriptPath}"`, { 
      encoding: 'utf8',
      timeout: 60000, // 60 second timeout for large libraries
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    // Clean up temporary file
    if (fs.existsSync(tempScriptPath)) {
      fs.unlinkSync(tempScriptPath);
    }
    
    if (!result.trim()) {
      return [];
    }
    
    // Parse the results
    const photos = result.trim().split(', ').map(item => {
      const [id, filename, name, mediaType, dateStr] = item.split('|');
      const fileExt = filename ? path.extname(filename.trim()).toLowerCase() : '';
      return {
        id: id?.trim(),
        filename: filename?.trim(),
        name: name?.trim(),
        mediaType: mediaType?.trim(),
        date: dateStr?.trim(),
        isVideo: CONFIG.supportedVideoExtensions.includes(fileExt)
      };
    }).filter(photo => photo.id && photo.filename);
    
    return photos;
    
  } catch (error) {
    // Clean up temporary file in case of error
    if (fs.existsSync(tempScriptPath)) {
      fs.unlinkSync(tempScriptPath);
    }
    
    console.error('❌ Failed to query Photos app:', error.message);
    
    // If the script is too long, try a simpler approach
    if (error.message.includes('timeout') || error.message.includes('too long')) {
      console.log('⚠️  Large library detected, trying alternative method...');
      return await queryPhotosSimple();
    }
    
    return [];
  }
}

// Simplified query for large libraries
async function queryPhotosSimple() {
  // Create temporary AppleScript file
  const tempScriptPath = path.join(os.tmpdir(), 'xalpheric-photos-simple.scpt');
  const appleScript = `tell application "Photos"
	set albumName to "${CONFIG.targetKeyword}"
	try
		set targetAlbum to album albumName
		set albumPhotos to every media item in targetAlbum
		set foundPhotos to {}
		
		repeat with currentPhoto in albumPhotos
			try
				set photoId to id of currentPhoto
				set photoFilename to filename of currentPhoto
				set photoName to name of currentPhoto
				set photoDate to date of currentPhoto
				
				set photoInfo to photoId & "|" & photoFilename & "|" & photoName & "|unknown|" & (photoDate as string)
				set end of foundPhotos to photoInfo
			on error
				-- Skip problematic photos
			end try
		end repeat
		
		return foundPhotos
	on error
		return {}
	end try
end tell`;

  try {
    // Write script to temporary file
    fs.writeFileSync(tempScriptPath, appleScript);
    
    const result = execSync(`osascript "${tempScriptPath}"`, { 
      encoding: 'utf8',
      timeout: 30000
    });
    
    // Clean up temporary file
    if (fs.existsSync(tempScriptPath)) {
      fs.unlinkSync(tempScriptPath);
    }
    
    if (!result.trim()) {
      return [];
    }
    
    const photos = result.trim().split(', ').map(item => {
      const [id, filename, name, mediaType, dateStr] = item.split('|');
      const fileExt = filename ? path.extname(filename.trim()).toLowerCase() : '';
      return {
        id: id?.trim(),
        filename: filename?.trim(),
        name: name?.trim(),
        mediaType: mediaType?.trim(),
        date: dateStr?.trim(),
        isVideo: CONFIG.supportedVideoExtensions.includes(fileExt)
      };
    }).filter(photo => photo.id && photo.filename);
    
    return photos;
    
  } catch (error) {
    // Clean up temporary file in case of error
    if (fs.existsSync(tempScriptPath)) {
      fs.unlinkSync(tempScriptPath);
    }
    
    console.error('❌ Simplified query also failed:', error.message);
    return [];
  }
}

// Process found media files
async function processFoundMedia(mediaList, processedList) {
  if (mediaList.length === 0) {
    console.log(`ℹ️  No media found with keyword "${CONFIG.targetKeyword}"`);
    return processedList;
  }
  
  console.log(`\n🎯 Found ${mediaList.length} media items with "${CONFIG.targetKeyword}":`);
  
  let newCount = 0;
  let copiedCount = 0;
  
  for (const media of mediaList) {
    try {
      // Skip if already processed
      if (processedList[media.id]) {
        continue;
      }
      
      newCount++;
      
      const category = getFileCategory(media.filename);
      if (category === 'unknown') {
        console.log(`⚠️  Unsupported file type: ${media.filename}`);
        processedList[media.id] = { filename: media.filename, status: 'unsupported', date: new Date().toISOString() };
        continue;
      }
      
      console.log(`📋 Processing: ${media.filename} (${media.isVideo ? 'video' : 'photo'})`);
      
      const success = await exportPhotoFromPhotos(media.id, media.filename, media.isVideo);
      
      processedList[media.id] = {
        filename: media.filename,
        status: success ? 'copied' : 'failed',
        date: new Date().toISOString(),
        category: category
      };
      
      if (success) copiedCount++;
      
    } catch (error) {
      console.error(`❌ Error processing ${media.filename}:`, error.message);
      processedList[media.id] = { filename: media.filename, status: 'error', date: new Date().toISOString() };
    }
  }
  
  if (newCount > 0) {
    console.log(`\n📊 Processing complete: ${copiedCount}/${newCount} new files copied`);
  } else {
    console.log(`ℹ️  No new media files to process`);
  }
  
  return processedList;
}

// Start watching mode
async function startWatching() {
  console.log('\n👀 Starting watch mode...');
  console.log('Press Ctrl+C to stop watching\n');
  
  let processedList = loadProcessedList();
  
  const runCheck = async () => {
    try {
      console.log(`🔄 Checking for new media... (${new Date().toLocaleTimeString()})`);
      const mediaList = await queryPhotosForKeyword();
      processedList = await processFoundMedia(mediaList, processedList);
      saveProcessedList(processedList);
    } catch (error) {
      console.error('❌ Error during check:', error.message);
    }
  };
  
  // Initial check
  await runCheck();
  
  // Set up periodic checks
  setInterval(runCheck, CONFIG.watchInterval);
}

// One-time scan mode
async function performScan() {
  console.log('\n🔍 Performing one-time scan...');
  
  let processedList = loadProcessedList();
  const mediaList = await queryPhotosForKeyword();
  processedList = await processFoundMedia(mediaList, processedList);
  saveProcessedList(processedList);
  
  console.log('\n✅ Scan complete!');
}

// Main execution
(async () => {
  try {
    console.log('📱 Checking Photos app availability...');
    if (!checkPhotosApp()) {
      console.log('\n💡 Troubleshooting steps:');
      console.log('   1. Make sure Photos app is installed');
      console.log('   2. Open Photos app at least once to initialize library');
      console.log('   3. Grant necessary permissions when prompted');
      console.log('   4. Try running the script again');
      process.exit(1);
    }
    
    console.log('\n📁 Setting up directories...');
    ensureDirectories();
    
    // Ask user what they want to do
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const mode = await new Promise((resolve) => {
      rl.question('\n🎯 What would you like to do?\n1) Scan once and exit\n2) Start watching for changes\n3) Show processing instructions\n\nEnter choice (1, 2, or 3): ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
    
    if (mode === '1') {
      await performScan();
    } else if (mode === '2') {
      await startWatching();
    } else if (mode === '3') {
      console.log('\n📋 How to tag photos for automatic processing:');
      console.log('');
      console.log('Method 1 - Keywords (Recommended):');
      console.log(`   1. Select photos/videos in Photos app`);
      console.log(`   2. Open Info panel (Cmd+I)`);
      console.log(`   3. Add "${CONFIG.targetKeyword}" as a keyword`);
      console.log('');
      console.log('Method 2 - Album:');
      console.log(`   1. Create an album named "${CONFIG.targetKeyword}"`);
      console.log(`   2. Add photos/videos to this album`);
      console.log('');
      console.log('The script will automatically find and copy tagged media to:');
      console.log(`   📸 Photos: ${CONFIG.photosOutputDir}`);
      console.log(`   🎥 Videos: ${CONFIG.videosOutputDir}`);
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
