const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');
require('dotenv').config();

const API_KEY = process.env.NEOCITIES_API_KEY;
const oggFiles = [
  'music/xaphoid - asariandance.ogg',
  'music/xaphoid - dreaming-of-the-new-world.ogg',
  'music/xaphoid - neutron-sinnner-final-mixmaster.ogg',
  'music/zaphoid - colossus (hardstyle).ogg',
  'music/zaphoid - gentle notion.ogg',
  'music/zaphoid - lunar sessions.ogg'
];

async function uploadFile(remotePath) {
  const localPath = path.join(__dirname, 'public', remotePath);
  
  if (!fs.existsSync(localPath)) {
    console.log(`❌ File not found: ${localPath}`);
    return false;
  }

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

  return new Promise((resolve) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.result === 'success') {
            console.log(`✅ Uploaded: ${remotePath}`);
            resolve(true);
          } else {
            console.log(`❌ Failed: ${remotePath} - ${json.message}`);
            resolve(false);
          }
        } catch (e) {
          console.log(`❌ Failed: ${remotePath}`);
          resolve(false);
        }
      });
    });
    req.on('error', (err) => {
      console.log(`❌ Error uploading ${remotePath}: ${err.message}`);
      resolve(false);
    });
    form.pipe(req);
  });
}

(async () => {
  console.log('🎵 Re-uploading .ogg files to Neocities...\n');
  
  for (const file of oggFiles) {
    await uploadFile(file);
    // Small delay between uploads for rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ All .ogg files restored!');
})();
