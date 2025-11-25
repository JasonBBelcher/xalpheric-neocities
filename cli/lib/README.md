# CLI Library API Documentation

This directory contains shared library modules used across all CLI commands.

**📊 Test Coverage**: 92 tests | 98% API coverage | 100% utils coverage | All tests passing ✓

## Structure

```
lib/
├── api/          # Neocities API interaction modules
│   ├── client.js     # Core HTTP client
│   ├── upload.js     # File upload with retry & concurrency
│   ├── list.js       # List remote files
│   └── delete.js     # Batch file deletion
├── utils/        # Utility functions
│   ├── logger.js     # Colored console output
│   ├── config.js     # Configuration & env vars
│   └── files.js      # Local file operations
└── builders/     # Content build pipelines (planned)
```

## API Modules

### `api/client.js`

Core HTTP client for Neocities API interactions.

#### Functions

**`makeAPICall(options, data = null)`**
- Makes HTTP requests to Neocities API
- Parameters:
  - `options` (Object): HTTPS request options
    - `method`: HTTP method (GET, POST, etc.)
    - `host`: Hostname (defaults to 'neocities.org')
    - `path`: API endpoint path
    - `headers`: Additional headers
  - `data` (Object|null): Optional FormData stream for uploads
- Returns: `Promise<Object>` - API response
- Automatically adds Authorization header from `NEOCITIES_API_KEY` env var

**`delay(ms)`**
- Utility for rate limiting between requests
- Parameters:
  - `ms` (number): Milliseconds to delay
- Returns: `Promise<void>`

#### Example Usage

```javascript
const { makeAPICall } = require('./lib/api/client');

// List files
const response = await makeAPICall({
  method: 'GET',
  path: '/api/list'
});

// Upload file
const FormData = require('form-data');
const form = new FormData();
form.append('index.html', fs.createReadStream('index.html'));

await makeAPICall({
  method: 'POST',
  path: '/api/upload'
}, form);
```

---

### `api/upload.js`

File upload module with retry logic and concurrency control.

#### Functions

**`uploadFile(localPath, remotePath, apiKey)`**
- Upload a single file to Neocities
- Parameters:
  - `localPath` (string): Local file path
  - `remotePath` (string): Remote path on Neocities
  - `apiKey` (string): API key
- Returns: `Promise<Object>` - Upload response

**`uploadWithRetry(localPath, remotePath, apiKey, options)`**
- Upload with automatic retry on failure
- Parameters:
  - `options.maxRetries` (number): Max retry attempts (default: 3)
  - `options.retryDelay` (number): Delay between retries in ms (default: 1000)
- Returns: `Promise<Object>` - Upload response

**`uploadFiles(files, apiKey, options)`**
- Upload multiple files with concurrency control
- Parameters:
  - `files` (Array): Array of `{local, remote}` objects
  - `options.concurrency` (number): Max concurrent uploads (default: 5)
  - `options.onProgress` (Function): Progress callback
  - `options.retry` (boolean): Enable retry (default: true)
- Returns: `Promise<Array>` - Array of results

#### Example Usage

```javascript
const { uploadFile, uploadFiles } = require('./lib/api/upload');

// Single file
await uploadFile('/local/index.html', 'index.html', 'API_KEY');

// Batch upload with progress
const files = [
  { local: '/local/index.html', remote: 'index.html' },
  { local: '/local/style.css', remote: 'style.css' }
];

const results = await uploadFiles(files, 'API_KEY', {
  concurrency: 3,
  onProgress: (status) => {
    console.log(`${status.completed}/${status.total} files`);
  }
});
```

---

### `api/list.js`

List and filter remote files on Neocities.

#### Functions

**`listFiles(apiKey, options)`**
- Fetch list of files from Neocities
- Parameters:
  - `options.path` (string): Directory path to list (optional)
- Returns: `Promise<Array>` - Array of file objects

**`filterRemoteFiles(files, options)`**
- Filter file list based on criteria
- Parameters:
  - `files` (Array): Array of file objects
  - `options.extensions` (Array): Filter by extensions (e.g., ['.html', '.css'])
  - `options.pattern` (RegExp): Filter by regex pattern
  - `options.filesOnly` (boolean): Exclude directories
  - `options.minSize`, `options.maxSize` (number): Filter by size
- Returns: `Array` - Filtered files

#### Example Usage

```javascript
const { listFiles, filterRemoteFiles } = require('./lib/api/list');

// List all files
const files = await listFiles('API_KEY');

// Filter HTML files only
const htmlFiles = filterRemoteFiles(files, {
  extensions: ['.html'],
  filesOnly: true
});
```

---

### `api/delete.js`

Delete files from Neocities in batches.

#### Functions

**`deleteFile(remotePath, apiKey)`**
- Delete a single file
- Parameters:
  - `remotePath` (string): Remote file path
  - `apiKey` (string): API key
- Returns: `Promise<Object>` - Delete response

**`deleteFiles(files, apiKey, options)`**
- Delete multiple files in batches
- Parameters:
  - `files` (Array): Array of remote file paths
  - `options.batchSize` (number): Files per batch (default: 100, max: 100)
  - `options.onProgress` (Function): Progress callback
- Returns: `Promise<Array>` - Array of batch results

#### Example Usage

```javascript
const { deleteFiles } = require('./lib/api/delete');

const filesToDelete = ['old-page.html', 'unused.css'];

const results = await deleteFiles(filesToDelete, 'API_KEY', {
  batchSize: 50,
  onProgress: (status) => {
    console.log(`Deleted ${status.filesProcessed}/${status.totalFiles}`);
  }
});
```

---

## Utility Modules

### `utils/logger.js`

Colored console logging with emoji support and verbose mode.

#### Functions

**`setVerbose(verbose)`**
- Enable/disable verbose logging mode
- Parameters:
  - `verbose` (boolean): Enable verbose mode

**`info(message, emoji = '')`**
- Log info message
- Parameters:
  - `message` (string): Message to log
  - `emoji` (string): Optional emoji prefix

**`success(message, emoji = '✅')`**
- Log success message in green

**`error(message, emoji = '❌')`**
- Log error message in red

**`warn(message, emoji = '⚠️')`**
- Log warning message in yellow

**`verbose(message, emoji = '')`**
- Log only if verbose mode enabled

**`cyan(message)`, `blue(message)`, `magenta(message)`**
- Log in specific colors

#### Example Usage

```javascript
const logger = require('./lib/utils/logger');

logger.setVerbose(true);
logger.info('Starting deployment', '🚀');
logger.success('Upload complete!');
logger.error('Failed to upload file');
logger.verbose('Detailed debug information');
```

---

### `utils/config.js`

Configuration and environment variable management.

#### Functions

**`getApiKey(throwOnMissing = true)`**
- Get Neocities API key from environment
- Parameters:
  - `throwOnMissing` (boolean): Throw error if key not found
- Returns: `string|null` - API key or null
- Throws: `Error` if key missing and `throwOnMissing` is true

**`validateApiKey()`**
- Check if API key is set
- Returns: `boolean` - True if API key exists

**`loadEnvFile(envPath = '.env')`**
- Load and parse .env file
- Parameters:
  - `envPath` (string): Path to .env file
- Sets environment variables from file

**`loadJsonConfig(configPath, defaultValue = undefined)`**
- Load and parse JSON configuration file
- Parameters:
  - `configPath` (string): Path to JSON file
  - `defaultValue` (any): Default value if file not found
- Returns: `Object` - Parsed JSON
- Throws: `Error` if file not found (and no default) or invalid JSON

**`getConfig()`**
- Get complete configuration object
- Returns: `Object` with:
  - `apiKey`: Neocities API key
  - `isCI`: Boolean indicating CI environment
  - `publicDir`: Path to public directory
  - `cwd`: Current working directory

#### Example Usage

```javascript
const config = require('./lib/utils/config');

// Load .env file
config.loadEnvFile();

// Get API key
const apiKey = config.getApiKey();

// Load JSON config
const releases = config.loadJsonConfig('public/config/releases.json');

// Get full config
const cfg = config.getConfig();
console.log(cfg.isCI); // true/false
```

---

### `utils/files.js`

Local file system operations with filtering and recursive scanning.

#### Functions

**`normalizePath(filePath)`**
- Normalize path to Unix-style (forward slashes)
- Parameters:
  - `filePath` (string): Path to normalize
- Returns: `string` - Normalized path

**`getRelativePath(base, file)`**
- Get relative path from base directory to file
- Parameters:
  - `base` (string): Base directory path
  - `file` (string): File path
- Returns: `string` - Relative path

**`shouldIgnoreFile(fileName)`**
- Check if file should be ignored (.DS_Store, .git, node_modules, etc.)
- Parameters:
  - `fileName` (string): File or directory name
- Returns: `boolean` - True if should ignore

**`filterFiles(files, options)`**
- Filter array of file paths
- Parameters:
  - `files` (Array): Array of file paths
  - `options.extensions` (Array): Extensions to include (e.g., ['.html', '.css'])
  - `options.pattern` (RegExp): Regex pattern to match
- Returns: `Array` - Filtered file paths

**`getLocalFiles(dir, options)`**
- Recursively get all files in directory
- Parameters:
  - `dir` (string): Directory path to scan
  - `options.maxDepth` (number): Maximum recursion depth
- Returns: `Promise<Array>` - Array of absolute file paths
- Automatically filters out ignored files

#### Example Usage

```javascript
const { getLocalFiles, filterFiles, getRelativePath } = require('./lib/utils/files');

// Get all files in directory
const files = await getLocalFiles('public');

// Filter to HTML/CSS only
const webFiles = filterFiles(files, {
  extensions: ['.html', '.css']
});

// Get relative paths
const relativePaths = files.map(f => getRelativePath('public', f));
```

---

## Testing

All library modules have comprehensive test coverage (>80%).

Run tests:
```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

## Best Practices

1. **Always use logger** for console output instead of `console.log`
2. **Load .env file** at CLI entry point with `config.loadEnvFile()`
3. **Handle errors gracefully** - all functions should return/throw predictable errors
4. **Mock external dependencies** in tests (https, fs, etc.)
5. **Keep functions pure** - avoid side effects where possible

## Adding New Modules

When adding new library modules:

1. Create the module file in appropriate subdirectory
2. Create corresponding test file in `cli/__tests__/`
3. Write tests FIRST (TDD approach)
4. Implement to pass tests
5. Aim for >80% coverage
6. Document API in this README
7. Export all public functions via `module.exports`

---

**Status**: Phase 1 Complete ✅
**Next**: Phase 2 - Core Deployment Commands
