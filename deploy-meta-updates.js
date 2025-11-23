#!/usr/bin/env node

require('dotenv').config();

const https = require('https');
const fs = require('fs');
const FormData = require('form-data');

const NEOCITIES_API_KEY = process.env.NEOCITIES_API_KEY;

if (!NEOCITIES_API_KEY) {
  console.error('❌ NEOCITIES_API_KEY environment variable not set');
  process.exit(1);
}

// Files to upload
const filesToUpload = [
  {
    local: 'public/index.html',
    remote: 'index.html',
    description: 'Homepage with updated meta tags'
  },
  {
    local: 'public/collective.html',
    remote: 'collective.html',
    description: 'Collective page with updated meta tags'
  },
  {
    local: 'public/gallery.html',
    remote: 'gallery.html',
    description: 'Gallery page with updated meta tags'
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
          const response = JSON.parse(data);
          if (response.result === 'success') {
            console.log(`✅ Uploaded ${description}`);
            resolve(true);
          } else {
            console.error(`❌ Failed to upload ${description}: ${response.message}`);
            resolve(false);
          }
        } catch (error) {
          console.error(`❌ Failed to upload ${description}: ${error.message}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', error => {
      console.error(`❌ Failed to upload ${description}: ${error.message}`);
      resolve(false);
    });
    
    formData.pipe(req);
  });
}

// Main deployment function
async function deploy() {
  console.log('🚀 Deploying meta tag updates to Neocities...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of filesToUpload) {
    const success = await uploadFile(file.local, file.remote, file.description);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n📊 Deployment Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  
  if (failCount > 0) {
    process.exit(1);
  }
}

deploy();
