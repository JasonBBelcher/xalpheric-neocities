const fs = require('fs').promises;
const path = require('path');

/**
 * Normalize file path to Unix style (forward slashes)
 * @param {string} filePath - Path to normalize
 * @returns {string} Normalized path
 */
function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

/**
 * Get relative path from base directory to file
 * @param {string} base - Base directory path
 * @param {string} file - File path
 * @returns {string} Relative path
 */
function getRelativePath(base, file) {
  const normalizedBase = normalizePath(base);
  const normalizedFile = normalizePath(file);
  const relative = path.relative(normalizedBase, normalizedFile);
  return normalizePath(relative);
}

/**
 * Check if file should be ignored (system files, hidden files, etc)
 * @param {string} fileName - Name of file or directory
 * @returns {boolean} True if file should be ignored
 */
function shouldIgnoreFile(fileName) {
  const ignorePatterns = [
    '.DS_Store',
    'Thumbs.db',
    'node_modules',
    '.git',
    '__MACOSX'
  ];

  // Check exact matches
  if (ignorePatterns.includes(fileName)) {
    return true;
  }

  // Check if starts with dot (hidden files)
  // But allow files with dots in the middle (e.g., main.bundle.js)
  if (fileName.startsWith('.')) {
    return true;
  }

  return false;
}

/**
 * Filter array of file paths based on criteria
 * @param {string[]} files - Array of file paths
 * @param {Object} options - Filter options
 * @param {string[]} options.extensions - Array of extensions to include (e.g., ['.html', '.css'])
 * @param {RegExp} options.pattern - Regex pattern to match file names
 * @returns {string[]} Filtered array of file paths
 */
function filterFiles(files, options = {}) {
  let filtered = files.filter(file => {
    const fileName = path.basename(file);
    const dirParts = file.split(path.sep);
    
    // Filter out ignored files/directories in path
    if (dirParts.some(part => shouldIgnoreFile(part))) {
      return false;
    }
    
    return true;
  });

  // Filter by extensions if provided
  if (options.extensions && options.extensions.length > 0) {
    filtered = filtered.filter(file => {
      const ext = path.extname(file);
      return options.extensions.includes(ext);
    });
  }

  // Filter by pattern if provided
  if (options.pattern) {
    filtered = filtered.filter(file => {
      const fileName = path.basename(file);
      return options.pattern.test(fileName);
    });
  }

  return filtered;
}

/**
 * Recursively get all files in a directory
 * @param {string} dir - Directory path to scan
 * @param {Object} options - Scan options
 * @param {number} options.maxDepth - Maximum directory depth to scan
 * @param {number} [_currentDepth=0] - Internal: current recursion depth
 * @returns {Promise<string[]>} Array of absolute file paths
 */
async function getLocalFiles(dir, options = {}, _currentDepth = 0) {
  const files = [];
  const { maxDepth } = options;

  // Check if we've reached max depth
  if (maxDepth !== undefined && _currentDepth >= maxDepth) {
    return files;
  }

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip ignored files/directories
      if (shouldIgnoreFile(entry.name)) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectory
        const subFiles = await getLocalFiles(fullPath, options, _currentDepth + 1);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }

    return files;
  } catch (error) {
    throw new Error(`Failed to read directory ${dir}: ${error.message}`);
  }
}

module.exports = {
  normalizePath,
  getRelativePath,
  shouldIgnoreFile,
  filterFiles,
  getLocalFiles
};
