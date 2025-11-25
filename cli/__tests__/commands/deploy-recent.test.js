const deployRecent = require('../../commands/deploy/recent');
const git = require('../../lib/utils/git');
const { uploadFiles } = require('../../lib/api/upload');
const logger = require('../../lib/utils/logger');
const fs = require('fs');

// Mock dependencies
jest.mock('../../lib/utils/git');
jest.mock('../../lib/api/upload');
jest.mock('../../lib/utils/logger');
jest.mock('fs');

describe('deploy recent command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync = jest.fn();
    fs.statSync = jest.fn();
  });

  describe('deployRecent', () => {
    it('should deploy files changed in last 24 hours by default', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue([
        'public/music/song.mp3',
        'public/musings/post.html'
      ]);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      uploadFiles.mockResolvedValue([
        { file: 'music/song.mp3', success: true },
        { file: 'musings/post.html', success: true }
      ]);

      const result = await deployRecent('API_KEY');

      expect(git.getChangedFiles).toHaveBeenCalledWith(
        expect.objectContaining({ since: '24 hours ago' })
      );
      expect(uploadFiles).toHaveBeenCalled();
      expect(result.uploaded).toBe(2);
    });

    it('should use custom time period with --since option', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue(['public/config/releases.json']);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 512 });
      
      uploadFiles.mockResolvedValue([
        { file: 'config/releases.json', success: true }
      ]);

      await deployRecent('API_KEY', { since: '3 days ago' });

      expect(git.getChangedFiles).toHaveBeenCalledWith(
        expect.objectContaining({ since: '3 days ago' })
      );
    });

    it('should deploy files changed since specific commit', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue(['public/drum-machine.html']);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 2048 });
      
      uploadFiles.mockResolvedValue([
        { file: 'drum-machine.html', success: true }
      ]);

      await deployRecent('API_KEY', { commit: 'abc123' });

      expect(git.getChangedFiles).toHaveBeenCalledWith(
        expect.objectContaining({ commit: 'abc123' })
      );
    });

    it('should throw error when not in git repository', async () => {
      git.isGitRepository.mockReturnValue(false);

      await expect(
        deployRecent('API_KEY')
      ).rejects.toThrow(/git repository/i);
    });

    it('should skip files that do not exist locally', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue([
        'public/exists.html',
        'public/missing.html'
      ]);
      fs.existsSync
        .mockReturnValueOnce(true)   // exists.html exists
        .mockReturnValueOnce(false); // missing.html doesn't exist
      fs.statSync.mockReturnValue({ size: 1024 });
      
      uploadFiles.mockResolvedValue([
        { file: 'exists.html', success: true }
      ]);

      const result = await deployRecent('API_KEY');

      expect(result.skipped).toBe(1);
      expect(result.uploaded).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('missing.html')
      );
    });

    it('should handle no changed files', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue([]);

      const result = await deployRecent('API_KEY');

      expect(uploadFiles).not.toHaveBeenCalled();
      expect(result.uploaded).toBe(0);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('No changed files')
      );
    });

    it('should respect dryRun option', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue([
        'public/music/song.mp3',
        'public/musings/post.html'
      ]);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });

      const result = await deployRecent('API_KEY', { dryRun: true });

      expect(uploadFiles).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
      expect(result.wouldUpload).toBe(2);
    });

    it('should filter files by pattern if specified', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue([
        'public/music/song.mp3',
        'public/musings/post.html',
        'cli/test.js',
        'package.json'
      ]);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      uploadFiles.mockResolvedValue([
        { file: 'music/song.mp3', success: true },
        { file: 'musings/post.html', success: true }
      ]);

      const result = await deployRecent('API_KEY', { pattern: 'public/**/*' });

      // Should only upload files matching pattern
      const uploadedFiles = uploadFiles.mock.calls[0][1];
      expect(uploadedFiles.every(f => f.local.startsWith('public/'))).toBe(true);
    });

    it('should handle upload failures gracefully', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue([
        'public/file1.html',
        'public/file2.html'
      ]);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      uploadFiles.mockResolvedValue([
        { file: 'file1.html', success: true },
        { file: 'file2.html', success: false, error: 'Network error' }
      ]);

      const result = await deployRecent('API_KEY');

      expect(result.uploaded).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should show verbose output when verbose flag is set', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue([
        'public/music/song.mp3'
      ]);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 2048 });
      
      uploadFiles.mockResolvedValue([
        { file: 'music/song.mp3', success: true }
      ]);

      await deployRecent('API_KEY', { verbose: true });

      expect(logger.setVerbose).toHaveBeenCalledWith(true);
      expect(logger.verbose).toHaveBeenCalled();
    });

    it('should map public/ paths to remote paths correctly', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue([
        'public/music/song.mp3',
        'public/assets/image.jpg',
        'public/index.html'
      ]);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      uploadFiles.mockResolvedValue([
        { file: 'music/song.mp3', success: true },
        { file: 'assets/image.jpg', success: true },
        { file: 'index.html', success: true }
      ]);

      await deployRecent('API_KEY');

      const uploadedFiles = uploadFiles.mock.calls[0][1];
      expect(uploadedFiles[0].remote).toBe('music/song.mp3');
      expect(uploadedFiles[1].remote).toBe('assets/image.jpg');
      expect(uploadedFiles[2].remote).toBe('index.html');
    });

    it('should calculate and report total size', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue([
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

      const result = await deployRecent('API_KEY');

      expect(result.totalSizeKB).toBeCloseTo(15, 1);
    });

    it('should handle HEAD~1 commit reference correctly', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue(['public/slippery-dish.html']);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 4096 });
      
      uploadFiles.mockResolvedValue([
        { file: 'slippery-dish.html', success: true }
      ]);

      // When user specifies --since HEAD~1, it should be treated as a commit
      await deployRecent('API_KEY', { since: 'HEAD~1' });

      // Should use commit option, not since option
      expect(git.getChangedFiles).toHaveBeenCalledWith(
        expect.objectContaining({ commit: 'HEAD~1' })
      );
    });

    it('should handle HEAD~N commit references', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue(['public/index.html']);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 2048 });
      
      uploadFiles.mockResolvedValue([
        { file: 'index.html', success: true }
      ]);

      await deployRecent('API_KEY', { since: 'HEAD~3' });

      expect(git.getChangedFiles).toHaveBeenCalledWith(
        expect.objectContaining({ commit: 'HEAD~3' })
      );
    });

    it('should handle commit SHA references', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue(['public/gallery.html']);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 3072 });
      
      uploadFiles.mockResolvedValue([
        { file: 'gallery.html', success: true }
      ]);

      await deployRecent('API_KEY', { since: 'a1b2c3d' });

      expect(git.getChangedFiles).toHaveBeenCalledWith(
        expect.objectContaining({ commit: 'a1b2c3d' })
      );
    });

    it('should distinguish between time periods and commit references', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue(['public/test.html']);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      uploadFiles.mockResolvedValue([
        { file: 'test.html', success: true }
      ]);

      // Time-based query should use 'since'
      await deployRecent('API_KEY', { since: '2 days ago' });
      expect(git.getChangedFiles).toHaveBeenCalledWith(
        expect.objectContaining({ since: '2 days ago' })
      );

      jest.clearAllMocks();
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue(['public/test.html']);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      uploadFiles.mockResolvedValue([
        { file: 'test.html', success: true }
      ]);

      // Commit reference should use 'commit'
      await deployRecent('API_KEY', { since: 'HEAD~1' });
      expect(git.getChangedFiles).toHaveBeenCalledWith(
        expect.objectContaining({ commit: 'HEAD~1' })
      );
    });
  });
});
