const fs = require('fs');
const path = require('path');

module.exports = function() {
  try {
    const filePath = path.join(__dirname, '../../public/config/releases.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);
    return data.releases || [];
  } catch (error) {
    console.error('Error loading releases data:', error);
    return [];
  }
};
