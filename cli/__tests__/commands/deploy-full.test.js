const deployFull = require('../../commands/deploy/full');
const { getLocalFiles } = require('../../lib/utils/files');
const { uploadFiles } = require('../../lib/api/upload');
const logger = require('../../lib/utils/logger');
const fs = require('fs');
const readline = require('readline');

// Mock dependencies
jest.mock('../../lib/utils/files');
jest.mock('../../lib/api/upload');
jest.mock('../../lib/utils/logger');
jest.mock('fs');
jest.mock('readline');

describe('deploy full command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync = jest.fn();
    fs.statSync = jest.fn();
  });

  describe('deployFull', () => {
    it('should deploy all files from public directory', async () => {
      getLocalFiles.mockResolvedValue([
        'public/index.html',
        'public/music/song.mp3',
        'public/musings/post.html'
      ]);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      uploadFiles.mockResolvedValue([
        { file: 'index.html', success: true },
        { file: 'music/song.mp3', success: true },
        { file: 'musings/post.html', success: true }
      ]);

      const result = await deployFull('API_KEY', { force: true });

      expect(uploadFiles).toHaveBeenCalled();
      expect(result.uploaded).toBe(3);
    });

    it('should require confirmation when not using --force', async () => {
      const mockInterface = {
        question: jest.fn((question, callback) => {
          callback('y');
        }),
        close: jest.fn()
      };
      readline.createInterface.mockReturnValue(mockInterface);

      getLocalFiles.mockResolvedValue(['public/index.html']);
      fs.statSync.mockReturnValue({ size: 1024 });
      uploadFiles.mockResolvedValue([{ file: 'index.html', success: true }]);

      const result = await deployFull('API_KEY');

      expect(mockInterface.question).toHaveBeenCalledWith(
        expect.stringContaining('Deploy'),
        expect.any(Function)
      );
      expect(result.uploaded).toBe(1);
    });

    it('should cancel deployment if user answers no', async () => {
      const mockInterface = {
        question: jest.fn((question, callback) => {
          callback('n');
        }),
        close: jest.fn()
      };
      readline.createInterface.mockReturnValue(mockInterface);

      getLocalFiles.mockResolvedValue(['public/index.html']);
      fs.statSync.mockReturnValue({ size: 1024 });

      const result = await deployFull('API_KEY');

      expect(uploadFiles).not.toHaveBeenCalled();
      expect(result.cancelled).toBe(true);
    });

    it('should skip confirmation with --force flag', async () => {
      getLocalFiles.mockResolvedValue(['public/index.html']);
      fs.statSync.mockReturnValue({ size: 1024 });
      uploadFiles.mockResolvedValue([{ file: 'index.html', success: true }]);

      await deployFull('API_KEY', { force: true });

      expect(readline.createInterface).not.toHaveBeenCalled();
    });

    it('should handle empty public directory', async () => {
      getLocalFiles.mockResolvedValue([]);

      const result = await deployFull('API_KEY', { force: true });

      expect(uploadFiles).not.toHaveBeenCalled();
      expect(result.uploaded).toBe(0);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('No files')
      );
    });

    it('should respect dryRun option', async () => {
      getLocalFiles.mockResolvedValue([
        'public/index.html',
        'public/style.css'
      ]);
      fs.statSync.mockReturnValue({ size: 1024 });

      const result = await deployFull('API_KEY', { dryRun: true, force: true });

      expect(uploadFiles).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
      expect(result.wouldUpload).toBe(2);
    });

    it('should handle upload failures gracefully', async () => {
      getLocalFiles.mockResolvedValue([
        'public/file1.html',
        'public/file2.html'
      ]);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      uploadFiles.mockResolvedValue([
        { file: 'file1.html', success: true },
        { file: 'file2.html', success: false, error: 'Network error' }
      ]);

      const result = await deployFull('API_KEY', { force: true });

      expect(result.uploaded).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should calculate total size correctly', async () => {
      getLocalFiles.mockResolvedValue([
        'public/file1.html',
        'public/file2.css'
      ]);
      fs.existsSync.mockReturnValue(true);
      fs.statSync
        .mockReturnValueOnce({ size: 10240 })  // 10 KB
        .mockReturnValueOnce({ size: 5120 });  // 5 KB
      
      uploadFiles.mockResolvedValue([
        { file: 'file1.html', success: true },
        { file: 'file2.css', success: true }
      ]);

      const result = await deployFull('API_KEY', { force: true });

      expect(result.totalSizeKB).toBeCloseTo(15, 1);
    });

    it('should use custom publicDir if specified', async () => {
      getLocalFiles.mockResolvedValue(['custom/index.html']);
      fs.statSync.mockReturnValue({ size: 1024 });
      uploadFiles.mockResolvedValue([{ file: 'index.html', success: true }]);

      await deployFull('API_KEY', { publicDir: 'custom', force: true });

      expect(getLocalFiles).toHaveBeenCalledWith('custom');
    });

    it('should show verbose output when verbose flag is set', async () => {
      getLocalFiles.mockResolvedValue(['public/index.html']);
      fs.statSync.mockReturnValue({ size: 2048 });
      uploadFiles.mockResolvedValue([{ file: 'index.html', success: true }]);

      await deployFull('API_KEY', { verbose: true, force: true });

      expect(logger.setVerbose).toHaveBeenCalledWith(true);
      expect(logger.verbose).toHaveBeenCalled();
    });
  });
});
