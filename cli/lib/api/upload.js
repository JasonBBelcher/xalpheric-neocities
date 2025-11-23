const fs = require('fs');
const { makeAPICall, delay } = require('./client');
const logger = require('../utils/logger');

/**
 * Upload a single file to Neocities
 * @param {string} localPath - Local file path
 * @param {string} remotePath - Remote path on Neocities
 * @param {string} apiKey - Neocities API key
 * @returns {Promise<Object>} Upload response from API
 */
async function uploadFile(localPath, remotePath, apiKey) {
  try {
    const fileStream = fs.createReadStream(localPath);
    
    const formData = {
      [remotePath]: fileStream
    };

    const response = await makeAPICall(
      {
        method: 'POST',
        path: '/api/upload',
        apiKey
      },
      formData
    );

    return response;
  } catch (error) {
    throw new Error(`Failed to upload ${remotePath}: ${error.message}`);
  }
}

/**
 * Upload a file with retry logic
 * @param {string} localPath - Local file path
 * @param {string} remotePath - Remote path on Neocities
 * @param {string} apiKey - Neocities API key
 * @param {Object} options - Upload options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @returns {Promise<Object>} Upload response from API
 */
async function uploadWithRetry(localPath, remotePath, apiKey, options = {}) {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadFile(localPath, remotePath, apiKey);
      if (attempt > 1) {
        logger.success(`✓ Upload succeeded on attempt ${attempt}: ${remotePath}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        logger.warn(`⚠ Upload attempt ${attempt} failed for ${remotePath}, retrying...`);
        await delay(retryDelay);
      }
    }
  }
  
  throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Upload multiple files with concurrency control
 * @param {Array<{local: string, remote: string}>} files - Array of file pairs
 * @param {string} apiKey - Neocities API key
 * @param {Object} options - Upload options
 * @param {number} options.concurrency - Max concurrent uploads (default: 5)
 * @param {Function} options.onProgress - Progress callback
 * @param {boolean} options.retry - Enable retry logic (default: true)
 * @param {number} options.maxRetries - Max retries per file (default: 3)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @returns {Promise<Array<Object>>} Array of upload results
 */
async function uploadFiles(files, apiKey, options = {}) {
  const {
    concurrency = 5,
    onProgress,
    retry = true,
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  if (files.length === 0) {
    return [];
  }

  const results = [];
  let completed = 0;
  let activeUploads = 0;
  const queue = [...files];

  const uploadFn = retry ? uploadWithRetry : uploadFile;

  return new Promise((resolve) => {
    const processNext = async () => {
      if (queue.length === 0) {
        // Wait for all active uploads to complete
        if (activeUploads === 0) {
          resolve(results);
        }
        return;
      }

      const file = queue.shift();
      activeUploads++;

      try {
        const uploadOptions = retry ? { maxRetries, retryDelay } : undefined;
        const result = await uploadFn(file.local, file.remote, apiKey, uploadOptions);
        
        results.push({
          file: file.remote,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          file: file.remote,
          success: false,
          error: error.message
        });
        logger.error(`✗ Failed to upload ${file.remote}: ${error.message}`);
      } finally {
        completed++;
        activeUploads--;

        if (onProgress) {
          onProgress({
            completed,
            total: files.length,
            file: file.remote
          });
        }

        // Process next file
        processNext();
      }
    };

    // Start initial batch of uploads
    const initialBatch = Math.min(concurrency, files.length);
    for (let i = 0; i < initialBatch; i++) {
      processNext();
    }
  });
}

module.exports = {
  uploadFile,
  uploadWithRetry,
  uploadFiles
};
