const { makeAPICall } = require('./client');
const logger = require('../utils/logger');

/**
 * Delete a single file from Neocities
 * @param {string} remotePath - Remote path of file to delete
 * @param {string} apiKey - Neocities API key
 * @returns {Promise<Object>} Delete response from API
 */
async function deleteFile(remotePath, apiKey) {
  try {
    const response = await makeAPICall(
      {
        method: 'POST',
        path: '/api/delete',
        apiKey
      },
      {
        filenames: [remotePath]
      }
    );

    return response;
  } catch (error) {
    throw new Error(`Failed to delete ${remotePath}: ${error.message}`);
  }
}

/**
 * Delete multiple files in batches
 * @param {string[]} files - Array of remote file paths to delete
 * @param {string} apiKey - Neocities API key
 * @param {Object} options - Delete options
 * @param {number} options.batchSize - Number of files per batch (default: 100, max: 100)
 * @param {Function} options.onProgress - Progress callback
 * @returns {Promise<Array>} Array of batch results
 */
async function deleteFiles(files, apiKey, options = {}) {
  const {
    batchSize = 100,
    onProgress
  } = options;

  if (files.length === 0) {
    return [];
  }

  const results = [];
  const batches = [];

  // Split files into batches
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }

  let completedBatches = 0;

  // Process batches sequentially
  for (const batch of batches) {
    try {
      const response = await makeAPICall(
        {
          method: 'POST',
          path: '/api/delete',
          apiKey
        },
        {
          filenames: batch
        }
      );

      results.push({
        files: batch,
        count: batch.length,
        success: true,
        result: response
      });

      logger.success(`✓ Deleted ${batch.length} files`);
    } catch (error) {
      results.push({
        files: batch,
        count: batch.length,
        success: false,
        error: error.message
      });

      logger.error(`✗ Failed to delete batch: ${error.message}`);
    }

    completedBatches++;

    if (onProgress) {
      onProgress({
        completed: completedBatches,
        total: batches.length,
        filesProcessed: Math.min(completedBatches * batchSize, files.length),
        totalFiles: files.length
      });
    }
  }

  return results;
}

module.exports = {
  deleteFile,
  deleteFiles
};
