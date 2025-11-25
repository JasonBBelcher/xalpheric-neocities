const https = require('https');

/**
 * Make an API call to Neocities
 * @param {Object} options - HTTPS request options
 * @param {Object|null} data - Optional FormData stream for uploads
 * @returns {Promise<Object>} API response
 */
async function makeAPICall(options, data = null) {
  return new Promise((resolve) => {
    // Add API key to headers if available
    const apiKey = process.env.NEOCITIES_API_KEY;
    const headers = options.headers || {};
    
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const requestOptions = {
      method: options.method || 'GET',
      host: options.host || 'neocities.org',
      path: options.path,
      headers
    };

    const req = https.request(requestOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          resolve(json);
        } catch (error) {
          resolve({ 
            result: 'error', 
            message: `Invalid JSON from server: ${error.message}` 
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ 
        result: 'error', 
        message: error.message 
      });
    });

    // If data is provided (FormData stream), pipe it
    if (data && typeof data.pipe === 'function') {
      data.pipe(req);
    } else {
      req.end();
    }
  });
}

/**
 * Utility function to add delay between requests (rate limiting)
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  makeAPICall,
  delay
};
