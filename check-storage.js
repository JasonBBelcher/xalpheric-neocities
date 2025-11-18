#!/usr/bin/env node

const https = require('https');

const NEOCITIES_API_KEY = process.env.NEOCITIES_API_KEY;

if (!NEOCITIES_API_KEY) {
  console.error('❌ NEOCITIES_API_KEY environment variable not set');
  process.exit(1);
}

const options = {
  hostname: 'neocities.org',
  path: '/api/list',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${NEOCITIES_API_KEY}`
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.result === 'success' && response.files) {
        let totalSize = 0;
        let fileCount = 0;

        function processFiles(files) {
          files.forEach(file => {
            if (!file.is_directory && file.size) {
              totalSize += file.size;
              fileCount++;
            }
          });
        }

        processFiles(response.files);

        const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
        const totalGB = (totalSize / (1024 * 1024 * 1024)).toFixed(3);
        const freeTierLimit = 1024; // MB
        const supporterTierLimit = 50 * 1024; // MB
        const remainingMB = (freeTierLimit - totalMB).toFixed(2);
        const usedPercent = ((totalSize / (1024*1024*1024)) * 100).toFixed(1);

        console.log('📊 Neocities Storage Usage:');
        console.log('─'.repeat(40));
        console.log(`   Total files: ${fileCount}`);
        console.log(`   Total size: ${totalMB} MB (${totalGB} GB)`);
        console.log('');
        console.log('   Tier Limits:');
        console.log(`   • Free tier: 1 GB`);
        console.log(`   • Supporter tier: 50 GB`);
        console.log('');
        console.log(`   Remaining (free tier): ${remainingMB} MB`);
        console.log(`   Used: ${usedPercent}% of 1GB`);
        console.log('─'.repeat(40));
      } else {
        console.error('❌ Error:', response);
      }
    } catch (err) {
      console.error('❌ Error parsing response:', err);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Request error:', err);
});

req.end();
