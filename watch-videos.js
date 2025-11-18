#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const os = require('os');

// Configuration
const CONFIG = {
  targetKeywords: ['koala', 'midimob'],  // Tags for Koala sampler and MidiMob videos
  videosOutputDir: path.join(__dirname, 'process_video'),
  watchInterval: 10000, // 10 seconds between checks
  processedListFile: path.join(__dirname, '.processed-videos.json'),
  supportedVideoExtensions: ['.mov', '.mp4', '.m4v', '.avi'],
  maxFileSize: 500 * 1024 * 1024, // 500MB limit for videos
  recentDaysToSearch: 90, // Only search videos from last 90 days (3 months)
};

console.log('🎥 Xalpheric Video Watcher - Koala Sampler & MidiMob Sessions');
console.log('==============================================================');
console.log(`🏷️  Looking for keywords: "${CONFIG.targetKeywords.join('", "')}"`);
console.log(`📁 Videos output: ${CONFIG.videosOutputDir}`);
console.log('');

// Load list of already processed videos
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

// Save list of processed videos
function saveProcessedList(processedList) {
  try {
    fs.writeFileSync(CONFIG.processedListFile, JSON.stringify(processedList, null, 2));
  } catch (error) {
    console.error('❌ Failed to save processed list:', error.message);
  }
}

// Ensure output directory exists
function ensureDirectories() {
  if (!fs.existsSync(CONFIG.videosOutputDir)) {
    fs.mkdirSync(CONFIG.videosOutputDir, { recursive: true });
    console.log(`📁 Created directory: ${CONFIG.videosOutputDir}`);
  }
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

// Export video from Photos app
async function exportVideoFromPhotos(videoId, filename) {
  const tempExportDir = path.join(os.tmpdir(), 'xalpheric-video-export');
  
  // Create temp directory
  if (!fs.existsSync(tempExportDir)) {
    fs.mkdirSync(tempExportDir, { recursive: true });
  }
  
  try {
    // Create temporary AppleScript file
    const tempScriptPath = path.join(os.tmpdir(), 'xalpheric-video-export.scpt');
    const appleScript = `tell application "Photos"
	set targetVideo to media item id "${videoId}"
	export {targetVideo} to POSIX file "${tempExportDir}"
end tell`;
    
    // Write script to temporary file
    fs.writeFileSync(tempScriptPath, appleScript);
    
    console.log(`   ⏳ Exporting video (this may take a moment)...`);
    
    execSync(`osascript "${tempScriptPath}"`, { 
      encoding: 'utf8',
      timeout: 300000 // 5 minute timeout for video export
    });
    
    // Find the exported file
    const exportedFiles = fs.readdirSync(tempExportDir);
    const exportedFile = exportedFiles.find(file => {
      const ext = path.extname(file).toLowerCase();
      return CONFIG.supportedVideoExtensions.includes(ext);
    });
    
    if (!exportedFile) {
      console.log(`⚠️  Could not find exported video for: ${filename}`);
      return false;
    }
    
    const sourcePath = path.join(tempExportDir, exportedFile);
    const targetPath = path.join(CONFIG.videosOutputDir, exportedFile);
    
    // Check if file already exists
    if (fs.existsSync(targetPath)) {
      console.log(`⚠️  File already exists: ${exportedFile}`);
      fs.unlinkSync(sourcePath); // Clean up temp file
      return false;
    }
    
    // Check file size
    const stats = fs.statSync(sourcePath);
    const sizeMB = Math.round(stats.size / 1024 / 1024);
    
    if (stats.size > CONFIG.maxFileSize) {
      console.log(`⚠️  File too large (${sizeMB}MB, max ${CONFIG.maxFileSize / 1024 / 1024}MB): ${exportedFile}`);
      fs.unlinkSync(sourcePath); // Clean up temp file
      return false;
    }
    
    // Move file to target directory
    fs.renameSync(sourcePath, targetPath);
    console.log(`🎥 ✅ Exported: ${exportedFile} (${sizeMB}MB)`);
    
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
      const tempScriptPath = path.join(os.tmpdir(), 'xalpheric-video-export.scpt');
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

// Query Photos app for videos with specific keyword
async function queryPhotosForVideos() {
  console.log(`🔍 Searching Photos app for videos with keywords "${CONFIG.targetKeywords.join('", "')}"...`);
  
  // Try album method first (faster)
  console.log('⚡ Trying album method first...');
  try {
    const albumVideos = await queryPhotosSimple();
    if (albumVideos.length > 0) {
      console.log(`✅ Found ${albumVideos.length} videos in albums`);
      return albumVideos;
    }
    console.log(`ℹ️  No matching albums found, trying keyword search...`);
  } catch (error) {
    console.log('⚠️  Album method failed, trying keyword search...');
  }
  
  // Fallback to keyword search - only search recent videos
  console.log(`🔍 Searching recent videos (last ${CONFIG.recentDaysToSearch} days) for keywords...`);
  
  const allFoundVideos = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.recentDaysToSearch);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0].replace(/-/g, '/');
  
  // Search for each keyword separately to avoid timeout issues
  for (const keyword of CONFIG.targetKeywords) {
    const tempScriptPath = path.join(os.tmpdir(), `xalpheric-videos-keyword-${keyword}.scpt`);
    
    const appleScript = `tell application "Photos"
	set foundVideos to {}
	
	-- Calculate cutoff date (${CONFIG.recentDaysToSearch} days ago)
	set cutoffDate to (current date) - (${CONFIG.recentDaysToSearch} * days)
	
	-- Get all media items
	set allItems to every media item
	
	repeat with currentItem in allItems
		try
			-- First check date (fastest filter)
			set itemDate to date of currentItem
			
			if itemDate ≥ cutoffDate then
				-- Then check if it has keywords
				set itemKeywords to keywords of currentItem
				
				if itemKeywords is not {} then
					repeat with currentKeyword in itemKeywords
						if currentKeyword contains "${keyword}" then
							try
								set itemFilename to filename of currentItem
								
								-- Check if it's a video by file extension
								if itemFilename ends with ".MOV" or itemFilename ends with ".mov" or itemFilename ends with ".MP4" or itemFilename ends with ".mp4" or itemFilename ends with ".M4V" or itemFilename ends with ".m4v" then
									set itemId to id of currentItem
									set itemName to name of currentItem
									set videoInfo to itemId & "|" & itemFilename & "|" & itemName & "|" & (itemDate as string)
									set end of foundVideos to videoInfo
								end if
							end try
							exit repeat
						end if
					end repeat
				end if
			end if
		end try
	end repeat
	
	return foundVideos
end tell`;

    try {
      console.log(`   📋 Searching for "${keyword}" keyword...`);
      fs.writeFileSync(tempScriptPath, appleScript);
      
      const result = execSync(`osascript "${tempScriptPath}"`, { 
        encoding: 'utf8',
        timeout: 300000, // 5 minute timeout for large libraries
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      // Clean up temporary file
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
      
      if (result.trim()) {
        // Parse the results
        const videos = result.trim().split(', ').map(item => {
          const [id, filename, name, dateStr] = item.split('|');
          return {
            id: id?.trim(),
            filename: filename?.trim(),
            name: name?.trim(),
            date: dateStr?.trim()
          };
        }).filter(video => video.id && video.filename);
        
        console.log(`   ✅ Found ${videos.length} video(s) with "${keyword}"`);
        allFoundVideos.push(...videos);
      } else {
        console.log(`   ℹ️  No videos found with "${keyword}"`);
      }
      
    } catch (error) {
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
      
      if (error.message.includes('timeout')) {
        console.error(`   ⚠️  Search for "${keyword}" timed out (library too large)`);
        console.log(`   💡 Tip: Create an album named "${keyword}" and add videos to it for faster detection`);
      } else {
        console.error(`   ❌ Failed to search for "${keyword}":`, error.message);
      }
    }
  }
  
  return allFoundVideos;
}

// Simplified query for large libraries (album-based)
async function queryPhotosSimple() {
  const allVideos = [];
  
  // Try each keyword/album
  for (const keyword of CONFIG.targetKeywords) {
    const tempScriptPath = path.join(os.tmpdir(), `xalpheric-videos-simple-${keyword}.scpt`);
    const appleScript = `tell application "Photos"
	set albumName to "${keyword}"
	try
		set targetAlbum to album albumName
		set albumVideos to every media item in targetAlbum
		set foundVideos to {}
		
		repeat with currentVideo in albumVideos
			try
				set videoId to id of currentVideo
				set videoFilename to filename of currentVideo
				set videoName to name of currentVideo
				set videoDate to date of currentVideo
				
				set videoInfo to videoId & "|" & videoFilename & "|" & videoName & "|" & (videoDate as string)
				set end of foundVideos to videoInfo
			on error
				-- Skip problematic videos
			end try
		end repeat
		
		return foundVideos
	on error
		return {}
	end try
end tell`;

    try {
      fs.writeFileSync(tempScriptPath, appleScript);
      
      const result = execSync(`osascript "${tempScriptPath}"`, { 
        encoding: 'utf8',
        timeout: 30000
      });
      
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
      
      if (result.trim()) {
        const videos = result.trim().split(', ').map(item => {
          const [id, filename, name, dateStr] = item.split('|');
          return {
            id: id?.trim(),
            filename: filename?.trim(),
            name: name?.trim(),
            date: dateStr?.trim()
          };
        }).filter(video => video.id && video.filename);
        
        allVideos.push(...videos);
      }
      
    } catch (error) {
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
      
      console.error(`❌ Failed to query album "${keyword}":`, error.message);
    }
  }
  
  return allVideos;
}

// Process found videos
async function processFoundVideos(videoList, processedList) {
  if (videoList.length === 0) {
    console.log(`ℹ️  No videos found with keywords "${CONFIG.targetKeywords.join('", "')}"`);
    return processedList;
  }
  
  console.log(`\n🎯 Found ${videoList.length} videos with matching keywords:`);
  
  let newCount = 0;
  let copiedCount = 0;
  
  for (const video of videoList) {
    try {
      // Skip if already processed
      if (processedList[video.id]) {
        continue;
      }
      
      newCount++;
      console.log(`\n📋 Processing: ${video.filename}`);
      console.log(`   Name: ${video.name || 'N/A'}`);
      console.log(`   Date: ${video.date || 'N/A'}`);
      
      const success = await exportVideoFromPhotos(video.id, video.filename);
      
      processedList[video.id] = {
        filename: video.filename,
        name: video.name,
        status: success ? 'copied' : 'failed',
        date: new Date().toISOString()
      };
      
      if (success) copiedCount++;
      
    } catch (error) {
      console.error(`❌ Error processing ${video.filename}:`, error.message);
      processedList[video.id] = { 
        filename: video.filename, 
        status: 'error', 
        date: new Date().toISOString() 
      };
    }
  }
  
  if (newCount > 0) {
    console.log(`\n📊 Processing complete: ${copiedCount}/${newCount} new videos copied`);
  } else {
    console.log(`ℹ️  No new videos to process`);
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
      console.log(`🔄 Checking for new videos... (${new Date().toLocaleTimeString()})`);
      const videoList = await queryPhotosForVideos();
      processedList = await processFoundVideos(videoList, processedList);
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
  const videoList = await queryPhotosForVideos();
  processedList = await processFoundVideos(videoList, processedList);
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
      rl.question('\n🎯 What would you like to do?\n1) Scan once and exit\n2) Start watching for changes\n3) Show usage instructions\n\nEnter choice (1, 2, or 3): ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
    
    if (mode === '1') {
      await performScan();
    } else if (mode === '2') {
      await startWatching();
    } else if (mode === '3') {
      console.log('\n📋 How to tag videos for automatic processing:');
      console.log('');
      console.log('Method 1 - Keywords (Recommended):');
      console.log(`   1. Select iPhone screen recording videos in Photos app`);
      console.log(`   2. Open Info panel (Cmd+I)`);
      console.log(`   3. Add one of these keywords: "${CONFIG.targetKeywords.join('", "')}"`);
      console.log('');
      console.log('Method 2 - Albums:');
      console.log(`   1. Create an album named "${CONFIG.targetKeywords[0]}" or "${CONFIG.targetKeywords[1]}"`);
      console.log(`   2. Add your Koala sampler or MidiMob screen recordings to these albums`);
      console.log('');
      console.log('The script will automatically:');
      console.log(`   🎥 Find recent videos (last ${CONFIG.recentDaysToSearch} days) tagged with matching keywords`);
      console.log(`   📁 Copy them to: ${CONFIG.videosOutputDir}`);
      console.log('   ⏳ Handle large video files (up to 500MB)');
      console.log('');
      console.log('Then you can process them with:');
      console.log('   node process-video.js --preset web-mp4 your-video.MOV');
      console.log('   node process-video.js --preset extract-audio your-video.MOV');
      console.log('   node process-video.js --preset web-ready your-video.MOV');
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
