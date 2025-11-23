const { makeAPICall } = require('./client');
const path = require('path');

/**
 * List files on Neocities site
 * @param {string} apiKey - Neocities API key
 * @param {Object} options - List options
 * @param {string} options.path - Directory path to list (optional)
 * @returns {Promise<Array>} Array of file objects
 */
async function listFiles(apiKey, options = {}) {
  try {
    const pathParam = options.path ? `?path=${encodeURIComponent(options.path)}` : '';
    
    const response = await makeAPICall({
      method: 'GET',
      path: `/api/list${pathParam}`,
      apiKey
    });

    return response.files || [];
  } catch (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

/**
 * Filter remote files based on criteria
 * @param {Array} files - Array of file objects from Neocities
 * @param {Object} options - Filter options
 * @param {string[]} options.extensions - Array of extensions to include (e.g., ['.html', '.css'])
 * @param {RegExp} options.pattern - Regex pattern to match file paths
 * @param {boolean} options.filesOnly - Exclude directories (default: false)
 * @param {number} options.minSize - Minimum file size in bytes
 * @param {number} options.maxSize - Maximum file size in bytes
 * @returns {Array} Filtered array of file objects
 */
function filterRemoteFiles(files, options = {}) {
  const {
    extensions,
    pattern,
    filesOnly = false,
    minSize,
    maxSize
  } = options;

  let filtered = files;

  // Filter out directories if filesOnly is true
  if (filesOnly) {
    filtered = filtered.filter(file => !file.is_directory);
  }

  // Filter by extensions
  if (extensions && extensions.length > 0) {
    filtered = filtered.filter(file => {
      const ext = path.extname(file.path);
      return extensions.includes(ext);
    });
  }

  // Filter by pattern
  if (pattern) {
    filtered = filtered.filter(file => pattern.test(file.path));
  }

  // Filter by size
  if (minSize !== undefined) {
    filtered = filtered.filter(file => file.size >= minSize);
  }

  if (maxSize !== undefined) {
    filtered = filtered.filter(file => file.size <= maxSize);
  }

  return filtered;
}

module.exports = {
  listFiles,
  filterRemoteFiles
};
