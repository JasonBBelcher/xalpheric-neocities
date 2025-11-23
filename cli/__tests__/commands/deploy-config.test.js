const deployConfig = require('../../commands/deploy/config');
const { uploadFiles } = require('../../lib/api/upload');
const logger = require('../../lib/utils/logger');
const fs = require('fs');

// Mock dependencies
jest.mock('../../lib/api/upload');
jest.mock('../../lib/utils/logger');
jest.mock('fs');

describe('deploy config command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync = jest.fn();
  });

  describe('deployConfig', () => {
    it('should deploy config files successfully', async () => {
      fs.existsSync.mockReturnValue(true);
      
      uploadFiles.mockResolvedValue([
        { file: 'config/releases.json', success: true },
        { file: 'assets/koala-album-art-default.jpg', success: true }
      ]);

      const result = await deployConfig('API_KEY', {
        files: [
          { local: 'public/config/releases.json', remote: 'config/releases.json' },
          { local: 'public/assets/default.jpg', remote: 'assets/default.jpg' }
        ]
      });

      expect(uploadFiles).toHaveBeenCalled();
      expect(result.uploaded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should skip missing files', async () => {
      fs.existsSync
        .mockReturnValueOnce(true)  // First file exists
        .mockReturnValueOnce(false); // Second file missing
      
      uploadFiles.mockResolvedValue([
        { file: 'config/releases.json', success: true }
      ]);

      const result = await deployConfig('API_KEY', {
        files: [
          { local: 'public/config/releases.json', remote: 'config/releases.json' },
          { local: 'public/missing.json', remote: 'missing.json' }
        ]
      });

      expect(result.uploaded).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should use default config files if none specified', async () => {
      fs.existsSync.mockReturnValue(true);
      
      uploadFiles.mockResolvedValue([
        { file: 'config/releases.json', success: true },
        { file: 'assets/koala-album-art-default.jpg', success: true }
      ]);

      const result = await deployConfig('API_KEY');

      expect(uploadFiles).toHaveBeenCalled();
      const uploadedFiles = uploadFiles.mock.calls[0][0];
      expect(uploadedFiles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ remote: 'config/releases.json' }),
          expect.objectContaining({ remote: 'assets/koala-album-art-default.jpg' })
        ])
      );
    });

    it('should handle upload failures gracefully', async () => {
      fs.existsSync.mockReturnValue(true);
      
      uploadFiles.mockResolvedValue([
        { file: 'config/releases.json', success: true },
        { file: 'assets/default.jpg', success: false, error: 'Network error' }
      ]);

      const result = await deployConfig('API_KEY', {
        files: [
          { local: 'public/config/releases.json', remote: 'config/releases.json' },
          { local: 'public/assets/default.jpg', remote: 'assets/default.jpg' }
        ]
      });

      expect(result.uploaded).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should respect dryRun option', async () => {
      fs.existsSync.mockReturnValue(true);

      const result = await deployConfig('API_KEY', {
        files: [
          { local: 'public/config/releases.json', remote: 'config/releases.json' }
        ],
        dryRun: true
      });

      expect(uploadFiles).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
      expect(result.wouldUpload).toBe(1);
    });

    it('should handle all files missing', async () => {
      fs.existsSync.mockReturnValue(false);

      const result = await deployConfig('API_KEY', {
        files: [
          { local: 'public/missing1.json', remote: 'missing1.json' },
          { local: 'public/missing2.json', remote: 'missing2.json' }
        ]
      });

      expect(uploadFiles).not.toHaveBeenCalled();
      expect(result.uploaded).toBe(0);
      expect(result.skipped).toBe(2);
    });

    it('should validate file paths', async () => {
      fs.existsSync.mockReturnValue(true);
      
      uploadFiles.mockResolvedValue([
        { file: 'config/releases.json', success: true }
      ]);

      await deployConfig('API_KEY', {
        files: [
          { local: 'public/config/releases.json', remote: 'config/releases.json' }
        ]
      });

      expect(fs.existsSync).toHaveBeenCalledWith('public/config/releases.json');
    });

    it('should support custom descriptions for files', async () => {
      fs.existsSync.mockReturnValue(true);
      
      uploadFiles.mockResolvedValue([
        { file: 'config/releases.json', success: true }
      ]);

      const result = await deployConfig('API_KEY', {
        files: [
          { 
            local: 'public/config/releases.json', 
            remote: 'config/releases.json',
            description: 'Music releases config'
          }
        ],
        verbose: true
      });

      expect(result.uploaded).toBe(1);
    });

    it('should handle empty files array', async () => {
      const result = await deployConfig('API_KEY', {
        files: []
      });

      expect(uploadFiles).not.toHaveBeenCalled();
      expect(result.uploaded).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });
});
