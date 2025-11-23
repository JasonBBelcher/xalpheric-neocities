const config = require('../../lib/utils/config');
const fs = require('fs');
const path = require('path');

jest.mock('fs');

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getApiKey', () => {
    it('should return API key from environment', () => {
      process.env.NEOCITIES_API_KEY = 'test-key-123';
      expect(config.getApiKey()).toBe('test-key-123');
    });

    it('should throw error if API key not found', () => {
      delete process.env.NEOCITIES_API_KEY;
      expect(() => config.getApiKey()).toThrow('NEOCITIES_API_KEY not found');
    });

    it('should allow silent mode (no throw)', () => {
      delete process.env.NEOCITIES_API_KEY;
      expect(config.getApiKey(false)).toBeNull();
    });
  });

  describe('validateApiKey', () => {
    it('should return true if API key exists', () => {
      process.env.NEOCITIES_API_KEY = 'test-key';
      expect(config.validateApiKey()).toBe(true);
    });

    it('should return false if API key missing', () => {
      delete process.env.NEOCITIES_API_KEY;
      expect(config.validateApiKey()).toBe(false);
    });
  });

  describe('loadEnvFile', () => {
    it('should load .env file if it exists', () => {
      const envContent = 'NEOCITIES_API_KEY=from-file\nOTHER_VAR=value';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(envContent);

      config.loadEnvFile();

      expect(process.env.NEOCITIES_API_KEY).toBe('from-file');
      expect(process.env.OTHER_VAR).toBe('value');
    });

    it('should not throw if .env file missing', () => {
      fs.existsSync.mockReturnValue(false);
      expect(() => config.loadEnvFile()).not.toThrow();
    });

    it('should skip lines with # comments', () => {
      const envContent = '# Comment line\nVALID_KEY=value\n# Another comment';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(envContent);

      config.loadEnvFile();

      expect(process.env.VALID_KEY).toBe('value');
    });

    it('should handle empty lines', () => {
      const envContent = 'KEY1=value1\n\nKEY2=value2\n';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(envContent);

      config.loadEnvFile();

      expect(process.env.KEY1).toBe('value1');
      expect(process.env.KEY2).toBe('value2');
    });
  });

  describe('loadJsonConfig', () => {
    it('should load and parse JSON config file', () => {
      const mockConfig = { releases: [{ title: 'Test' }] };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const result = config.loadJsonConfig('/path/to/config.json');

      expect(result).toEqual(mockConfig);
    });

    it('should throw error if file not found', () => {
      fs.existsSync.mockReturnValue(false);

      expect(() => config.loadJsonConfig('/missing.json')).toThrow('not found');
    });

    it('should throw error on invalid JSON', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{ invalid json }');

      expect(() => config.loadJsonConfig('/bad.json')).toThrow('Invalid JSON');
    });

    it('should return default value if file missing and default provided', () => {
      fs.existsSync.mockReturnValue(false);
      const defaultValue = { test: true };

      const result = config.loadJsonConfig('/missing.json', defaultValue);

      expect(result).toEqual(defaultValue);
    });
  });

  describe('getConfig', () => {
    it('should return configuration object', () => {
      process.env.NEOCITIES_API_KEY = 'test-key';
      process.env.CI = 'true';

      const cfg = config.getConfig();

      expect(cfg.apiKey).toBe('test-key');
      expect(cfg.isCI).toBe(true);
    });

    it('should detect non-CI environment', () => {
      delete process.env.CI;

      const cfg = config.getConfig();

      expect(cfg.isCI).toBe(false);
    });
  });
});
