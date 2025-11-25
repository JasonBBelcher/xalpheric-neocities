const checkStorage = require('../../commands/check/storage');
const { calculateStats, formatBytes } = require('../../commands/check/storage');
const { listFiles } = require('../../lib/api/list');

// Mock modules
jest.mock('../../lib/api/list');

describe('Check Storage Command', () => {
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to suppress output in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('calculateStats', () => {
    it('should calculate stats for empty file list', () => {
      const stats = calculateStats([]);

      expect(stats.fileCount).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.totalMB).toBe(0);
      expect(stats.totalGB).toBe(0);
    });

    it('should calculate stats for files', () => {
      const files = [
        { path: 'file1.txt', size: 1024 * 1024, is_directory: false }, // 1 MB
        { path: 'file2.txt', size: 2 * 1024 * 1024, is_directory: false }, // 2 MB
        { path: 'dir/', size: 0, is_directory: true } // Directory (ignored)
      ];

      const stats = calculateStats(files);

      expect(stats.fileCount).toBe(2);
      expect(stats.totalMB).toBe(3);
      expect(stats.freeTierUsedPercent).toBeCloseTo(0.29, 1); // 3MB / 1024MB
    });

    it('should ignore directories', () => {
      const files = [
        { path: 'dir1/', size: 0, is_directory: true },
        { path: 'file.txt', size: 1024, is_directory: false }
      ];

      const stats = calculateStats(files);

      expect(stats.fileCount).toBe(1);
    });

    it('should calculate tier percentages correctly', () => {
      const files = [
        { path: 'large.mp4', size: 512 * 1024 * 1024, is_directory: false } // 512 MB
      ];

      const stats = calculateStats(files);

      expect(stats.freeTierUsedPercent).toBe(50); // 512MB / 1024MB
      expect(stats.supporterTierUsedPercent).toBe(1); // 512MB / 51200MB
    });

    it('should calculate remaining space', () => {
      const files = [
        { path: 'file.txt', size: 100 * 1024 * 1024, is_directory: false } // 100 MB
      ];

      const stats = calculateStats(files);

      expect(stats.freeTierRemaining).toBe(924); // 1024 - 100
      expect(stats.supporterTierRemaining).toBe(51100); // 51200 - 100
    });
  });

  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes', () => {
      expect(formatBytes(500)).toBe('500 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(2048)).toBe('2 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should respect decimal places', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB'); // 1.5 KB rounded
      expect(formatBytes(1536, 2)).toBe('1.5 KB');
    });
  });

  describe('checkStorage', () => {
    const mockFiles = [
      { path: 'file1.txt', size: 1024 * 1024, is_directory: false },
      { path: 'file2.mp3', size: 5 * 1024 * 1024, is_directory: false },
      { path: 'dir/', size: 0, is_directory: true }
    ];

    beforeEach(() => {
      listFiles.mockResolvedValue(mockFiles);
    });

    it('should fetch and display storage stats', async () => {
      const stats = await checkStorage(mockApiKey, {});

      expect(listFiles).toHaveBeenCalledWith(mockApiKey);
      expect(stats.fileCount).toBe(2);
      expect(stats.totalMB).toBe(6);
    });

    it('should return stats with file count', async () => {
      const stats = await checkStorage(mockApiKey, {});

      expect(stats.fileCount).toBe(2);
      expect(stats.totalMB).toBe(6);
    });

    it('should calculate tier limits correctly', async () => {
      const stats = await checkStorage(mockApiKey, {});

      expect(stats).toHaveProperty('freeTierUsedPercent');
      expect(stats).toHaveProperty('supporterTierUsedPercent');
      expect(stats).toHaveProperty('freeTierRemaining');
    });

    it('should detect when approaching free tier limit', async () => {
      listFiles.mockResolvedValue([
        { path: 'large.mp4', size: 900 * 1024 * 1024, is_directory: false } // 900 MB
      ]);

      const stats = await checkStorage(mockApiKey, {});

      expect(stats.freeTierUsedPercent).toBeGreaterThan(80);
    });

    it('should output JSON when requested', async () => {
      const stats = await checkStorage(mockApiKey, { json: true });

      expect(stats).toHaveProperty('fileCount');
      expect(stats).toHaveProperty('totalMB');
      expect(stats).toHaveProperty('freeTierUsedPercent');
    });

    it('should handle verbose mode', async () => {
      listFiles.mockResolvedValue([
        { path: 'large.mp4', size: 10 * 1024 * 1024, is_directory: false },
        { path: 'medium.jpg', size: 5 * 1024 * 1024, is_directory: false },
        { path: 'small.txt', size: 1024, is_directory: false }
      ]);

      const stats = await checkStorage(mockApiKey, { verbose: true });

      expect(stats.fileCount).toBe(3);
    });

    it('should handle API errors', async () => {
      listFiles.mockRejectedValue(new Error('API error'));

      await expect(
        checkStorage(mockApiKey, {})
      ).rejects.toThrow('API error');
    });

    it('should handle empty file list', async () => {
      listFiles.mockResolvedValue([]);

      const stats = await checkStorage(mockApiKey, {});

      expect(stats.fileCount).toBe(0);
      expect(stats.totalMB).toBe(0);
    });
  });

  describe('verbose output', () => {
    it('should handle verbose mode with multiple files', async () => {
      listFiles.mockResolvedValue([
        { path: 'small.txt', size: 1024, is_directory: false },
        { path: 'large.mp4', size: 10 * 1024 * 1024, is_directory: false },
        { path: 'medium.jpg', size: 5 * 1024 * 1024, is_directory: false }
      ]);

      const stats = await checkStorage(mockApiKey, { verbose: true });

      expect(stats.fileCount).toBe(3);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should handle verbose mode with many files', async () => {
      const manyFiles = Array.from({ length: 20 }, (_, i) => ({
        path: `file${i}.txt`,
        size: (20 - i) * 1024 * 1024,
        is_directory: false
      }));

      listFiles.mockResolvedValue(manyFiles);

      const stats = await checkStorage(mockApiKey, { verbose: true });

      expect(stats.fileCount).toBe(20);
    });
  });
});
