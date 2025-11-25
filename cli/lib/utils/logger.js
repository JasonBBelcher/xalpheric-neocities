/**
 * Logger utility with colored output
 * Provides consistent logging across CLI commands
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

let isVerbose = false;

/**
 * Enable or disable verbose logging
 * @param {boolean} verbose - Whether to enable verbose mode
 */
function setVerbose(verbose) {
  isVerbose = verbose;
}

/**
 * Log a message with optional color and emoji
 * @param {string} message - Message to log
 * @param {string} color - Color name from colors object
 * @param {string} emoji - Optional emoji prefix
 */
function log(message, color = 'reset', emoji = '') {
  const prefix = emoji ? `${emoji} ` : '';
  const colorCode = colors[color] || colors.reset;
  console.log(`${colorCode}${prefix}${message}${colors.reset}`);
}

/**
 * Log an info message
 * @param {string} message - Message to log
 * @param {string} emoji - Optional emoji prefix
 */
function info(message, emoji = '') {
  log(message, 'reset', emoji);
}

/**
 * Log a success message (green)
 * @param {string} message - Message to log
 * @param {string} emoji - Optional emoji prefix (defaults to ✅)
 */
function success(message, emoji = '✅') {
  log(message, 'green', emoji);
}

/**
 * Log an error message (red)
 * @param {string} message - Message to log
 * @param {string} emoji - Optional emoji prefix (defaults to ❌)
 */
function error(message, emoji = '❌') {
  console.error(`${colors.red}${emoji} ${message}${colors.reset}`);
}

/**
 * Log a warning message (yellow)
 * @param {string} message - Message to log
 * @param {string} emoji - Optional emoji prefix (defaults to ⚠️)
 */
function warn(message, emoji = '⚠️') {
  log(message, 'yellow', emoji);
}

/**
 * Log a verbose message (only if verbose mode enabled)
 * @param {string} message - Message to log
 * @param {string} emoji - Optional emoji prefix
 */
function verbose(message, emoji = '') {
  if (isVerbose) {
    log(message, 'cyan', emoji);
  }
}

/**
 * Log cyan colored message
 * @param {string} message - Message to log
 */
function cyan(message) {
  log(message, 'cyan');
}

/**
 * Log blue colored message
 * @param {string} message - Message to log
 */
function blue(message) {
  log(message, 'blue');
}

/**
 * Log magenta colored message
 * @param {string} message - Message to log
 */
function magenta(message) {
  log(message, 'magenta');
}

module.exports = {
  setVerbose,
  info,
  success,
  error,
  warn,
  verbose,
  cyan,
  blue,
  magenta,
  log
};
