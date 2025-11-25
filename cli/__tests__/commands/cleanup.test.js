const readline = require('readline');
const cleanup = require('../../commands/cleanup');
const { DEFAULT_PATTERNS, identifyUnwantedFiles } = require('../../commands/cleanup');
const { listFiles } = require('../../lib/api/list');
const { deleteFiles } = require('../../lib/api/delete');

// Mock modules
jest.mock('readline');
jest.mock('../../lib/api/list');
jest.mock('../../lib/api/delete');

describe('Cleanup Command', () => {
  let mockInterface;
  let mockQuestion;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to suppress output in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Mock readline interface
    mockQuestion = jest.fn();
    mockInterface = {
      question: mockQuestion,
      close: jest.fn()
    };
    readline.createInterface.mockReturnValue(mockInterface);

    // Mock default responses
    deleteFiles.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('DEFAULT_PATTERNS', () => {
    it('should have DS_Store pattern', () => {
      const pattern = DEFAULT_PATTERNS.find(p => p.category === 'system');
      expect(pattern).toBeDefined();
      expect(pattern.test('path/.DS_Store')).toBe(true);
      expect(pattern.test('path/file.txt')).toBe(false);
    });

    it('should have OGG pattern', () => {
      const pattern = DEFAULT_PATTERNS.find(p => p.category === 'media');
      expect(pattern).toBeDefined();
      expect(pattern.test('audio.ogg')).toBe(true);
      expect(pattern.test('audio.mp3')).toBe(false);
    });

    it('should have backup pattern', () => {
      const pattern = DEFAULT_PATTERNS.find(p => p.category === 'backup');
      expect(pattern).toBeDefined();
      expect(pattern.test('js/drum-machine-backup/file.js')).toBe(true);
      expect(pattern.test('js/drum-machine/file.js')).toBe(false);
    });
  });

  describe('identifyUnwantedFiles', () => {
    const mockFiles = [
      { path: 'assets/.DS_Store', size: 6148, is_directory: false },
      { path: 'music/song.ogg', size: 1024000, is_directory: false },
      { path: 'js/drum-machine-backup/old.js', size: 5000, is_directory: false },
      { path: 'index.html', size: 2048, is_directory: false }
    ];

    it('should identify DS_Store files', () => {
      const unwanted = identifyUnwantedFiles(mockFiles, DEFAULT_PATTERNS);

      expect(unwanted.byCategory.system).toHaveLength(1);
      expect(unwanted.byCategory.system[0].path).toBe('assets/.DS_Store');
    });

    it('should identify OGG files', () => {
      const unwanted = identifyUnwantedFiles(mockFiles, DEFAULT_PATTERNS);

      expect(unwanted.byCategory.media).toHaveLength(1);
      expect(unwanted.byCategory.media[0].path).toBe('music/song.ogg');
    });

    it('should identify backup files', () => {
      const unwanted = identifyUnwantedFiles(mockFiles, DEFAULT_PATTERNS);

      expect(unwanted.byCategory.backup).toHaveLength(1);
      expect(unwanted.byCategory.backup[0].path).toContain('drum-machine-backup');
    });

    it('should return all unwanted files', () => {
      const unwanted = identifyUnwantedFiles(mockFiles, DEFAULT_PATTERNS);

      expect(unwanted.all).toHaveLength(3);
    });

    it('should not flag clean files', () => {
      const cleanFiles = [
        { path: 'index.html', size: 2048, is_directory: false },
        { path: 'style.css', size: 1024, is_directory: false }
      ];

      const unwanted = identifyUnwantedFiles(cleanFiles, DEFAULT_PATTERNS);

      expect(unwanted.all).toHaveLength(0);
    });
  });

  describe('cleanup function', () => {
    const mockFiles = [
      { path: 'assets/.DS_Store', size: 6148, is_directory: false },
      { path: 'music/song.ogg', size: 1024000, is_directory: false },
      { path: 'index.html', size: 2048, is_directory: false }
    ];

    beforeEach(() => {
      listFiles.mockResolvedValue(mockFiles);
    });

    describe('file identification', () => {
      it('should fetch and analyze files', async () => {
        mockQuestion.mockImplementation((q, callback) => callback('n'));

        await cleanup(mockApiKey, { force: false });

        expect(listFiles).toHaveBeenCalledWith(mockApiKey);
      });

      it('should identify unwanted files by category', async () => {
        mockQuestion.mockImplementation((q, callback) => callback('n'));

        const result = await cleanup(mockApiKey, { force: false });

        expect(result.filesFound).toBe(2); // .DS_Store and .ogg
      });
    });

    describe('dry run mode', () => {
      it('should not delete files in dry run', async () => {
        const result = await cleanup(mockApiKey, { dryRun: true });

        expect(result.dryRun).toBe(true);
        expect(result.filesDeleted).toBe(0);
        expect(deleteFiles).not.toHaveBeenCalled();
      });

      it('should report what would be deleted', async () => {
        const result = await cleanup(mockApiKey, { dryRun: true });

        expect(result.dryRun).toBe(true);
        expect(result.filesFound).toBeGreaterThan(0);
      });
    });

    describe('confirmation prompts', () => {
      it('should prompt for confirmation when not forced', async () => {
        mockQuestion.mockImplementation((q, callback) => callback('y'));

        await cleanup(mockApiKey, { force: false });

        expect(mockQuestion).toHaveBeenCalled();
      });

      it('should skip confirmation with force flag', async () => {
        await cleanup(mockApiKey, { force: true });

        expect(mockQuestion).not.toHaveBeenCalled();
        expect(deleteFiles).toHaveBeenCalled();
      });

      it('should cancel when user declines', async () => {
        mockQuestion.mockImplementation((q, callback) => callback('n'));

        const result = await cleanup(mockApiKey, { force: false });

        expect(result.cancelled).toBe(true);
        expect(deleteFiles).not.toHaveBeenCalled();
      });
    });

    describe('file deletion', () => {
      it('should delete files when confirmed', async () => {
        mockQuestion.mockImplementation((q, callback) => callback('y'));

        const result = await cleanup(mockApiKey, { force: false });

        expect(deleteFiles).toHaveBeenCalledWith(
          mockApiKey,
          expect.arrayContaining(['assets/.DS_Store', 'music/song.ogg'])
        );
        expect(result.filesDeleted).toBe(2);
      });

      it('should delete files with force flag', async () => {
        await cleanup(mockApiKey, { force: true });

        expect(deleteFiles).toHaveBeenCalled();
      });
    });

    describe('category filtering', () => {
      it('should include only specified categories', async () => {
        const result = await cleanup(mockApiKey, {
          dryRun: true,
          include: ['system']
        });

        // Should only find .DS_Store file
        expect(result.filesFound).toBe(1);
      });

      it('should exclude specified categories', async () => {
        const result = await cleanup(mockApiKey, {
          dryRun: true,
          exclude: ['media']
        });

        // Should find .DS_Store but not .ogg
        expect(result.filesFound).toBe(1);
      });

      it('should handle multiple include categories', async () => {
        const result = await cleanup(mockApiKey, {
          dryRun: true,
          include: ['system', 'media']
        });

        expect(result.filesFound).toBe(2);
      });
    });

    describe('clean site', () => {
      it('should handle clean site with no unwanted files', async () => {
        listFiles.mockResolvedValue([
          { path: 'index.html', size: 2048, is_directory: false },
          { path: 'style.css', size: 1024, is_directory: false }
        ]);

        const result = await cleanup(mockApiKey, {});

        expect(result.filesFound).toBe(0);
        expect(result.success).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should handle API list errors', async () => {
        listFiles.mockRejectedValue(new Error('API error'));

        await expect(
          cleanup(mockApiKey, {})
        ).rejects.toThrow('API error');
      });

      it('should handle delete errors', async () => {
        mockQuestion.mockImplementation((q, callback) => callback('y'));
        deleteFiles.mockRejectedValue(new Error('Delete failed'));

        await expect(
          cleanup(mockApiKey, { force: false })
        ).rejects.toThrow('Delete failed');
      });
    });

    describe('verbose mode', () => {
      it('should handle verbose mode', async () => {
        const result = await cleanup(mockApiKey, { dryRun: true, verbose: true });

        expect(result.filesFound).toBeGreaterThan(0);
        expect(result.dryRun).toBe(true);
      });
    });

    describe('return value structure', () => {
      it('should return correct structure on success', async () => {
        const result = await cleanup(mockApiKey, { force: true });

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('filesFound');
        expect(result).toHaveProperty('filesDeleted');
        expect(result).toHaveProperty('dryRun');
      });

      it('should return cancelled status', async () => {
        mockQuestion.mockImplementation((q, callback) => callback('n'));

        const result = await cleanup(mockApiKey, { force: false });

        expect(result.cancelled).toBe(true);
        expect(result.success).toBe(false);
      });
    });
  });
});
