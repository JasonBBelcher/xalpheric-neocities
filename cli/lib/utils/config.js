/**
 * Configuration utility
 * Handles environment variables, .env files, and JSON config loading
 */

const fs = require('fs');
const path = require('path');

/**
 * Get Neocities API key from environment
 * @param {boolean} throwOnMissing - Whether to throw if key not found
 * @returns {string|null} API key or null
 * @throws {Error} If API key not found and throwOnMissing is true
 */
function getApiKey(throwOnMissing = true) {
  const apiKey = process.env.NEOCITIES_API_KEY;
  
  if (!apiKey && throwOnMissing) {
    throw new Error('NEOCITIES_API_KEY not found in environment variables');
  }
  
  return apiKey || null;
}

/**
 * Validate that API key exists
 * @returns {boolean} True if API key is set
 */
function validateApiKey() {
  return !!process.env.NEOCITIES_API_KEY;
}

/**
 * Load .env file and set environment variables
 * @param {string} envPath - Path to .env file (defaults to project root)
 */
function loadEnvFile(envPath = path.join(process.cwd(), '.env')) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) {
        continue;
      }

      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    }
  } catch (error) {
    // Silently ignore errors - .env is optional
  }
}

/**
 * Load and parse JSON configuration file
 * @param {string} configPath - Path to JSON config file
 * @param {*} defaultValue - Default value if file not found
 * @returns {Object} Parsed JSON object
 * @throws {Error} If file not found and no default provided, or JSON is invalid
 */
function loadJsonConfig(configPath, defaultValue = undefined) {
  if (!fs.existsSync(configPath)) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Config file not found: ${configPath}`);
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in config file: ${configPath}`);
  }
}

/**
 * Get complete configuration object
 * @returns {Object} Configuration object
 */
function getConfig() {
  return {
    apiKey: getApiKey(false),
    isCI: process.env.CI === 'true',
    publicDir: path.join(process.cwd(), 'public'),
    cwd: process.cwd()
  };
}

module.exports = {
  getApiKey,
  validateApiKey,
  loadEnvFile,
  loadJsonConfig,
  getConfig
};
