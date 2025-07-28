const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');
const readline = require('readline');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Dependency checking for Node.js packages
function checkNodePackage(packageName) {
  try {
    require(packageName);
    return true;
  } catch {
    return false;
  }
}

async function promptInstallPackages(missing) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`\n🤔 Would you like me to install the missing Node.js packages? (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function checkNodeDependencies() {
  console.log('🔍 Checking Node.js dependencies...');
  
  const requiredPackages = ['form-data', 'dotenv'];
  const missing = [];
  
  for (const pkg of requiredPackages) {
    if (!checkNodePackage(pkg)) {
      missing.push(pkg);
      console.error(`❌ Missing package: ${pkg}`);
    } else {
      console.log(`✅ ${pkg} is available`);
    }
  }

  if (missing.length > 0) {
    console.log(`\n❌ Missing ${missing.length} required Node.js packages`);
    console.log('💡 Install with: npm install ' + missing.join(' '));
    
    const shouldInstall = await promptInstallPackages(missing);
    
    if (shouldInstall) {
      try {
        const { execSync } = require('child_process');
        console.log('\n📦 Installing packages...');
        execSync(`npm install ${missing.join(' ')}`, { stdio: 'inherit' });
        console.log('✅ Packages installed successfully!');
      } catch (error) {
        console.error('❌ Failed to install packages:', error.message);
        console.log('💡 Please run: npm install ' + missing.join(' '));
        process.exit(1);
      }
    } else {
      console.log('\n❌ Cannot proceed without required packages.');
      console.log('💡 Please run: npm install ' + missing.join(' '));
      process.exit(1);
    }
  }

  console.log('✅ All Node.js dependencies are available!\n');
}

const API_KEY = process.env.NEOCITIES_API_KEY;

// Check for help flag first
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🚀 Neocities Full Site Refresh

Usage: node deploy-full-refresh.js [options]

Options:
  --dry-run            Show what would happen without making changes
  --include-mp3s       Include MP3 files in the refresh (excluded by default)
  --include-assets     Include assets folder files in the refresh (excluded by default)
  --rate-limit <sec>   Rate limit between requests in seconds (default: 5)
  --help, -h           Show this help message

Examples:
  npm run deploy-full-refresh -- --dry-run
  npm run deploy-full-refresh -- --include-mp3s
  npm run deploy-full-refresh -- --include-assets
  npm run deploy-full-refresh -- --include-mp3s --include-assets
  npm run deploy-full-refresh -- --dry-run --include-assets
  npm run deploy-full-refresh -- --include-mp3s --include-assets --rate-limit 10

Environment Variables:
  NEOCITIES_API_KEY  Your Neocities API key (required for non-dry-run)

⚠️  WARNING: This script will DELETE most files on your Neocities site
   and replace them with the contents of your public/ folder.
   
🎵 MP3 files are PRESERVED by default - they will NOT be deleted unless
   you explicitly use the --include-mp3s flag. This protects your audio files
   while refreshing other content.

🖼️  ASSETS files are PRESERVED by default - they will NOT be deleted unless
   you explicitly use the --include-assets flag. This protects your images,
   icons, and other assets while refreshing other content.
   
   Always test with --dry-run first!
`);
  process.exit(0);
}

// Parse rate limit argument
function parseRateLimit() {
  const rateLimitIndex = process.argv.findIndex(arg => arg === '--rate-limit');
  if (rateLimitIndex !== -1 && rateLimitIndex + 1 < process.argv.length) {
    const rateLimitValue = parseInt(process.argv[rateLimitIndex + 1]);
    if (!isNaN(rateLimitValue) && rateLimitValue > 0) {
      return rateLimitValue * 1000; // Convert seconds to milliseconds
    } else {
      console.error('❌ Invalid rate limit value. Must be a positive number of seconds.');
      process.exit(1);
    }
  }
  return 5000; // Default 5 seconds
}

// Configuration
const CONFIG = {
  includeMp3s: process.argv.includes('--include-mp3s'),
  includeAssets: process.argv.includes('--include-assets'),
  dryRun: process.argv.includes('--dry-run'),
  maxConcurrentUploads: 2, // Conservative for rate limiting
  delayBetweenRequests: parseRateLimit(),
  maxFilesPerDelete: 10, // Batch delete in smaller chunks
};

// Validate required environment variables (skip in dry-run for testing)
if (!API_KEY && !CONFIG.dryRun) {
  console.error("❌ NEOCITIES_API_KEY environment variable is required");
  console.error("💡 Set it with: export NEOCITIES_API_KEY='your_api_key_here'");
  process.exit(1);
}

const PUBLIC_DIR = path.join(__dirname, '../../public');

console.log("🚀 Neocities Full Site Refresh");
console.log(`📁 Source: ${PUBLIC_DIR}`);
console.log(`🎵 Include MP3s: ${CONFIG.includeMp3s ? 'YES' : 'NO (default)'}`);
console.log(`�️  Include Assets: ${CONFIG.includeAssets ? 'YES' : 'NO (default)'}`);
console.log(`�🔍 Dry Run: ${CONFIG.dryRun ? 'YES' : 'NO'}`);
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

    req.on('error', (error) => {
      console.error(`❌ Network error:`, error.message);
      resolve({ result: "error", message: error.message });
    });

    if (data) {
      data.pipe(req);
    } else {
      req.end();
    }
  });
}

// Get list of all files on Neocities
async function listRemoteFiles() {
  console.log("📋 Getting list of files on Neocities...");
  
  const options = {
    method: 'GET',
    host: 'neocities.org',
    path: '/api/list',
    headers: {
      Authorization: `Bearer ${API_KEY}`
    }
  };

  const response = await makeAPICall(options);
  
  if (response.result !== 'success') {
    console.error("❌ Failed to get file list:", response);
    throw new Error("Failed to get remote file list");
  }

  // Filter out directories and get just file paths
  const files = response.files
    .filter(file => !file.is_directory)
    .map(file => file.path);

  console.log(`✅ Found ${files.length} files on Neocities`);
  return files;
}

// Delete files from Neocities (in batches)
async function deleteRemoteFiles(filePaths) {
  if (filePaths.length === 0) {
    console.log("ℹ️  No files to delete");
    return;
  }

  // Filter out files we can't delete
  const deletableFiles = filePaths.filter(file => {
    if (file === 'index.html') {
      console.log("🛡️  Skipping index.html (cannot be deleted via API)");
      return false;
    }
    
    // Skip MP3 files if not explicitly including them
    if (!CONFIG.includeMp3s && file.toLowerCase().endsWith('.mp3')) {
      console.log(`🎵 Preserving MP3 file: ${file} (use --include-mp3s to replace)`);
      return false;
    }
    
    // Skip assets files if not explicitly including them
    if (!CONFIG.includeAssets && file.startsWith('assets/')) {
      console.log(`🖼️  Preserving assets file: ${file} (use --include-assets to replace)`);
      return false;
    }
    
    return true;
  });

  if (CONFIG.dryRun) {
    console.log("🔍 DRY RUN - Would delete these files:");
    deletableFiles.forEach(file => console.log(`  - ${file}`));
    return;
  }

  console.log(`🗑️  Deleting ${deletableFiles.length} files in batches...`);

  // Process in smaller batches for rate limiting
  for (let i = 0; i < deletableFiles.length; i += CONFIG.maxFilesPerDelete) {
    const batch = deletableFiles.slice(i, i + CONFIG.maxFilesPerDelete);
    
    console.log(`🗑️  Deleting batch ${Math.floor(i / CONFIG.maxFilesPerDelete) + 1}: ${batch.length} files`);
    
    const form = new FormData();
    batch.forEach(file => {
      form.append('filenames[]', file);
    });

    const options = {
      method: 'POST',
      host: 'neocities.org',
      path: '/api/delete',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...form.getHeaders()
      }
    };

    const response = await makeAPICall(options, form);
    
    if (response.result !== 'success') {
      console.error(`❌ Failed to delete batch:`, response);
      throw new Error("Failed to delete files");
    }

    console.log(`✅ Deleted batch successfully`);
    
    // Rate limiting delay
    if (i + CONFIG.maxFilesPerDelete < deletableFiles.length) {
      console.log(`⏳ Waiting ${CONFIG.delayBetweenRequests}ms for rate limiting...`);
      await delay(CONFIG.delayBetweenRequests);
    }
  }
}

// Get list of local files to upload
function getLocalFiles(dir, baseDir = dir) {
  let files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files = files.concat(getLocalFiles(fullPath, baseDir));
    } else {
      const relativePath = path.relative(baseDir, fullPath);
      const normalizedPath = relativePath.replace(/\\/g, '/'); // Normalize for web
      
      // Filter MP3s unless explicitly included
      if (!CONFIG.includeMp3s && path.extname(fullPath).toLowerCase() === '.mp3') {
        console.log(`🎵 Skipping MP3: ${normalizedPath}`);
        continue;
      }

      // Filter assets unless explicitly included
      if (!CONFIG.includeAssets && normalizedPath.startsWith('assets/')) {
        console.log(`🖼️  Skipping assets file: ${normalizedPath}`);
        continue;
      }

      files.push({
        localPath: fullPath,
        remotePath: normalizedPath
      });
    }
  }

  return files;
}

// Upload file with retry logic
async function uploadFile(localPath, remotePath, retryCount = 0) {
  const maxRetries = 3;
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

// Upload all local files
async function uploadLocalFiles(files) {
  if (CONFIG.dryRun) {
    console.log("🔍 DRY RUN - Would upload these files:");
    files.forEach(file => console.log(`  - ${file.remotePath}`));
    return;
  }

  console.log(`📤 Uploading ${files.length} files...`);
  
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

  console.log("\n📊 Upload Summary:");
  console.log(`✅ Successful uploads: ${successCount}`);
  console.log(`❌ Failed uploads: ${failureCount}`);
  console.log(`📋 Total files: ${files.length}`);
}

// Main execution
(async () => {
  try {
    // Check Node.js dependencies first
    await checkNodeDependencies();

    // Validation
    if (!fs.existsSync(PUBLIC_DIR)) {
      console.error(`❌ Public directory not found: ${PUBLIC_DIR}`);
      process.exit(1);
    }

    // Build musings first to ensure latest content
    if (!CONFIG.dryRun) {
      console.log("📝 Building musings first...");
      try {
        const { execSync } = require('child_process');
        execSync('node build-musings.js', { 
          stdio: 'inherit',
          cwd: path.join(__dirname, '../..')
        });
        console.log("✅ Musings built successfully!");
      } catch (error) {
        console.error("❌ Failed to build musings:", error.message);
        process.exit(1);
      }
    } else {
      console.log("🔍 DRY RUN - Skipping musings build");
    }

    const localFiles = getLocalFiles(PUBLIC_DIR);
    
    if (localFiles.length === 0) {
      console.error("❌ No files found in public directory");
      process.exit(1);
    }

    console.log(`📁 Found ${localFiles.length} local files to upload`);
    console.log(`⏱️  Rate limit: ${CONFIG.delayBetweenRequests / 1000} seconds between requests`);
    
    if (CONFIG.includeMp3s) {
      console.log("🎵 Including MP3 files in refresh");
    } else {
      console.log("🎵 Excluding MP3 files (use --include-mp3s to include)");
    }
    
    if (CONFIG.includeAssets) {
      console.log("🖼️  Including assets files in refresh");
    } else {
      console.log("🖼️  Excluding assets files (use --include-assets to include)");
    }

    // Safety check
    if (localFiles.length < 5) {
      console.warn("⚠️  Warning: Only found a few files. Is your public directory complete?");
    }

    // Get confirmation for destructive operation
    if (!CONFIG.dryRun) {
      console.log("\n⚠️  WARNING: This will DELETE most files on your Neocities site and replace with local files!");
      console.log("🎵 MP3 files will be " + (CONFIG.includeMp3s ? "INCLUDED (replaced)" : "PRESERVED (not deleted)"));
      console.log("🖼️  Assets files will be " + (CONFIG.includeAssets ? "INCLUDED (replaced)" : "PRESERVED (not deleted)"));
      console.log("\nPress Ctrl+C to cancel, or press Enter to continue...");
      
      // Wait for user input with proper cleanup
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      await new Promise(resolve => {
        rl.question('', () => {
          rl.close();
          resolve();
        });
      });
    }

    // Step 1: List remote files
    let remoteFiles = [];
    if (CONFIG.dryRun) {
      console.log("🔍 DRY RUN - Skipping remote file listing");
      remoteFiles = ['example1.html', 'example2.css', 'assets/example.jpg']; // Mock data for demo
    } else {
      remoteFiles = await listRemoteFiles();
      await delay(CONFIG.delayBetweenRequests);
    }

    // Step 2: Delete remote files
    await deleteRemoteFiles(remoteFiles);
    
    if (remoteFiles.length > 0 && !CONFIG.dryRun) {
      await delay(CONFIG.delayBetweenRequests);
    }

    // Step 3: Upload local files
    await uploadLocalFiles(localFiles);

    if (CONFIG.dryRun) {
      console.log("\n🔍 DRY RUN COMPLETE - No changes were made");
      console.log("💡 Run without --dry-run to perform the actual refresh");
    } else {
      console.log("\n🎉 Full site refresh complete!");
      if (!CONFIG.includeMp3s) {
        console.log("🎵 MP3 files were preserved - use --include-mp3s if you need to update them");
      }
      if (!CONFIG.includeAssets) {
        console.log("🖼️  Assets files were preserved - use --include-assets if you need to update them");
      }
    }

    process.exit(0);

  } catch (error) {
    console.error("💥 Full refresh failed:", error.message);
    process.exit(1);
  }
})();
