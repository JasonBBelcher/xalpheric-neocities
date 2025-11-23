const https = require('https');
const FormData = require('form-data');
require('dotenv').config();

const API_KEY = process.env.NEOCITIES_API_KEY;

function makeAPICall(options, data = null) {
  return new Promise((resolve) => {
    const req = https.request(options, res => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch {
          resolve({ result: "error", message: "Invalid JSON" });
        }
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

async function listFiles() {
  console.log("📋 Getting list of files on Neocities...\n");
  
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
    throw new Error("Failed to get file list");
  }

  return response.files.filter(f => !f.is_directory).map(f => f.path);
}

async function deleteFiles(filePaths) {
  if (filePaths.length === 0) {
    console.log("✅ No files to delete!\n");
    return;
  }

  console.log(`🗑️  Deleting ${filePaths.length} files...\n`);

  const form = new FormData();
  filePaths.forEach(file => {
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
    console.error(`❌ Failed to delete files:`, response);
    throw new Error("Failed to delete files");
  }

  console.log(`✅ Deleted ${filePaths.length} files successfully!\n`);
}

(async () => {
  try {
    const allFiles = await listFiles();
    
    // Identify unwanted files
    const unwantedFiles = allFiles.filter(file => {
      // .DS_Store files
      if (file.includes('.DS_Store')) {
        console.log(`🚫 macOS artifact: ${file}`);
        return true;
      }
      
      // .ogg files
      if (file.endsWith('.ogg')) {
        console.log(`🚫 OGG file: ${file}`);
        return true;
      }
      
      // drum-machine-backup directories
      if (file.includes('js/drum-machine-backup')) {
        console.log(`🚫 Backup file: ${file}`);
        return true;
      }
      
      return false;
    });
    
    console.log(`\n📊 Found ${unwantedFiles.length} unwanted files to delete\n`);
    
    if (unwantedFiles.length === 0) {
      console.log("✅ No cleanup needed!");
      process.exit(0);
    }
    
    // Confirm deletion
    console.log("⚠️  These files will be deleted. Press Enter to continue or Ctrl+C to cancel...");
    
    const readline = require('readline');
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
    
    await deleteFiles(unwantedFiles);
    
    console.log("🎉 Cleanup complete!");
    process.exit(0);
    
  } catch (error) {
    console.error("💥 Cleanup failed:", error.message);
    process.exit(1);
  }
})();
