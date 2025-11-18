#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const NEOCITIES_API_KEY = process.env.NEOCITIES_API_KEY;

if (!NEOCITIES_API_KEY) {
  console.error('❌ NEOCITIES_API_KEY environment variable not set');
  process.exit(1);
}

// Files to upload
const filesToUpload = [
  {
    local: 'public/config/releases.json',
    remote: 'config/releases.json',
    description: 'Releases configuration'
  },
  {
    local: 'public/assets/koala-album-art-default.jpg',
    remote: 'assets/koala-album-art-default.jpg',
    description: 'Koala album art'
  }
];

// Upload a single file
async function uploadFile(localPath, remotePath, description) {
  return new Promise((resolve) => {
    if (!fs.existsSync(localPath)) {
      console.log(`⚠️  Skipping ${description} - file not found: ${localPath}`);
      resolve(false);
      return;
    }

    const formData = new FormData();
    formData.append(remotePath, fs.createReadStream(localPath));
    
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
            console.log(`❌ Failed to upload ${description}: ${result.message || 'Unknown error'}`);
            resolve(false);
            return;
          }
          
          console.log(`✅ Uploaded ${description}`);
          resolve(true);
        } catch (error) {
          console.log(`❌ Error parsing response for ${description}: ${error.message}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', error => {
      console.log(`❌ Error uploading ${description}: ${error.message}`);
      resolve(false);
    });
    
    formData.pipe(req);
  });
}

// Main deployment function
async function deployConfig() {
  console.log('📋 Deploying configuration and assets...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of filesToUpload) {
    console.log(`📤 Uploading ${file.description}...`);
    const success = await uploadFile(file.local, file.remote, file.description);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Rate limiting - wait 1 second between uploads
    if (filesToUpload.indexOf(file) < filesToUpload.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n📊 Deployment Summary:');
  console.log(`✅ Successful uploads: ${successCount}`);
  if (failCount > 0) {
    console.log(`❌ Failed uploads: ${failCount}`);
  }
  console.log('\n🎉 Configuration deployment completed!');
}

// Run the deployment
if (require.main === module) {
  deployConfig().catch(error => {
    console.error(`❌ Deployment failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { deployConfig };
