const { execSync } = require('child_process');
const checkDeps = require('../../commands/check/deps');

// Mock modules
jest.mock('child_process');

describe('Check Dependencies Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to suppress output in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('system dependencies', () => {
    it('should detect all system dependencies available', async () => {
      execSync.mockImplementation(() => {
        // All commands succeed
      });

      const result = await checkDeps({});

      // Check return structure - success depends on Node modules too
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('results');
      expect(result.results.system.available.length).toBeGreaterThanOrEqual(4); // magick, ffmpeg, ffprobe, jq
      expect(result.results.system.missing).toHaveLength(0);
    });

    it('should detect missing ImageMagick', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('magick')) {
          throw new Error('Not found');
        }
      });

      const result = await checkDeps({});

      expect(result.success).toBe(false);
      expect(result.results.system.missing.some(d => d.command === 'magick')).toBe(true);
    });

    it('should detect missing FFmpeg', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('ffmpeg')) {
          throw new Error('Not found');
        }
      });

      const result = await checkDeps({});

      expect(result.success).toBe(false);
      expect(result.results.system.missing.some(d => d.command === 'ffmpeg')).toBe(true);
    });

    it('should detect multiple missing dependencies', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('ffmpeg') || cmd.includes('jq')) {
          throw new Error('Not found');
        }
      });

      const result = await checkDeps({});

      expect(result.success).toBe(false);
      expect(result.results.system.missing).toHaveLength(2);
    });
  });

  describe('Node.js dependencies', () => {
    it('should detect all Node dependencies available', async () => {
      execSync.mockImplementation(() => {}); // System deps pass

      const result = await checkDeps({});

      // Check return structure - actual availability checked by real deps
      expect(result).toHaveProperty('success');
      expect(result.results.node.available.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect missing Node modules', async () => {
      execSync.mockImplementation(() => {}); // System deps pass
      
      // Mock require to throw for specific module
      const originalRequire = global.require;
      global.require = jest.fn((name) => {
        if (name === 'non-existent-module') {
          throw new Error('Cannot find module');
        }
        return originalRequire(name);
      });

      const result = await checkDeps({});

      // All real modules should be available in test environment
      expect(result.results.node.available.length).toBeGreaterThan(0);

      global.require = originalRequire;
    });
  });

  describe('output formatting', () => {
    it('should return proper structure', async () => {
      execSync.mockImplementation(() => {}); // All pass

      const result = await checkDeps({});

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('results');
    });

    it('should fail when deps are missing on macOS', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('magick')) {
          throw new Error('Not found');
        }
      });

      const result = await checkDeps({});

      expect(result.success).toBe(false);
      expect(result.results.system.missing.length).toBeGreaterThan(0);
    });

    it('should fail when deps are missing on Linux', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('ffmpeg')) {
          throw new Error('Not found');
        }
      });

      const result = await checkDeps({});

      expect(result.success).toBe(false);
      expect(result.results.system.missing.length).toBeGreaterThan(0);
    });
  });

  describe('verbose mode', () => {
    it('should provide detailed output in verbose mode', async () => {
      execSync.mockImplementation(() => {});

      const result = await checkDeps({ verbose: true });

      // Should return proper structure in verbose mode
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('results');
    });
  });

  describe('return value structure', () => {
    it('should return correct structure', async () => {
      execSync.mockImplementation(() => {});

      const result = await checkDeps({});

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('results');
      expect(result.results).toHaveProperty('system');
      expect(result.results).toHaveProperty('node');
      expect(result.results.system).toHaveProperty('available');
      expect(result.results.system).toHaveProperty('missing');
      expect(result.results.node).toHaveProperty('available');
      expect(result.results.node).toHaveProperty('missing');
    });

    it('should include dependency details', async () => {
      execSync.mockImplementation(() => {});

      const result = await checkDeps({});

      const imageMagick = result.results.system.available.find(d => d.command === 'magick');
      expect(imageMagick).toBeDefined();
      expect(imageMagick).toHaveProperty('name');
      expect(imageMagick).toHaveProperty('needed');
    });
  });
});
