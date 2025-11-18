const https = require('https');
const fs = require('fs');
const FormData = require('form-data');

const NEOCITIES_API_KEY = process.env.NEOCITIES_API_KEY;
const assetPath = 'public/assets/koala-album-art-default.jpg';
const remotePath = 'assets/koala-album-art-default.jpg';

const formData = new FormData();
formData.append(remotePath, fs.createReadStream(assetPath));

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
    const result = JSON.parse(data);
    if (result.result === 'success') {
      console.log('✅ Successfully uploaded koala-album-art-default.jpg');
    } else {
      console.log('❌ Upload failed:', result.message);
    }
  });
});

req.on('error', error => {
  console.log('❌ Error:', error.message);
});

formData.pipe(req);
