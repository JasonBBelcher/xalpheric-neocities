# CLI Library API Documentation

This directory contains shared library modules used across all CLI commands.

## Structure

```
lib/
├── api/          # Neocities API interaction modules
├── utils/        # Utility functions
└── builders/     # Content build pipelines
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
