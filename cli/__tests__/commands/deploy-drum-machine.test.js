const deployDrumMachine = require('../../commands/deploy/drum-machine');
const { getLocalFiles, filterFiles } = require('../../lib/utils/files');
const { uploadFiles } = require('../../lib/api/upload');
const logger = require('../../lib/utils/logger');
const fs = require('fs');
const path = require('path');

// Mock dependencies
jest.mock('../../lib/utils/files');
jest.mock('../../lib/api/upload');
jest.mock('../../lib/utils/logger');
jest.mock('fs');
jest.mock('path');

describe('deploy drum-machine command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync = jest.fn();
    fs.statSync = jest.fn();
    path.join = jest.fn((...args) => args.join('/'));
    path.relative = jest.fn((from, to) => to.replace(from + '/', ''));
    path.basename = jest.fn(p => p.split('/').pop());
    path.extname = jest.fn(p => {
      const parts = p.split('.');
      return parts.length > 1 ? '.' + parts.pop() : '';
    });
  });

  describe('deployDrumMachine', () => {
    it('should deploy drum machine files successfully', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      getLocalFiles.mockResolvedValue([
        '/drum-machine/dist/bundle.js',
        '/drum-machine/dist/bundle.css'
      ]);
      filterFiles.mockImplementation(files => files);
      
      uploadFiles.mockResolvedValue([
        { file: 'drum-machine.html', success: true },
        { file: 'css/drum-machine.css', success: true },
        { file: 'js/drum-machine/bundle.js', success: true },
        { file: 'js/drum-machine/bundle.css', success: true }
      ]);

      const result = await deployDrumMachine('API_KEY', {
        distDir: '/drum-machine/dist',
        htmlFile: 'public/drum-machine.html',
        cssFile: 'public/css/drum-machine.css'
      });

      expect(uploadFiles).toHaveBeenCalled();
      expect(result.uploaded).toBe(4);
      expect(result.failed).toBe(0);
    });

    it('should skip source maps by default', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      getLocalFiles.mockResolvedValue([
        '/drum-machine/dist/bundle.js',
        '/drum-machine/dist/bundle.js.map',
        '/drum-machine/dist/bundle.css'
      ]);
      filterFiles.mockImplementation(files => files.filter(f => !f.endsWith('.map')));
      
      uploadFiles.mockResolvedValue([
        { file: 'drum-machine.html', success: true },
        { file: 'css/drum-machine.css', success: true },
        { file: 'js/drum-machine/bundle.js', success: true },
        { file: 'js/drum-machine/bundle.css', success: true }
      ]);

      const result = await deployDrumMachine('API_KEY', {
        distDir: '/drum-machine/dist',
        htmlFile: 'public/drum-machine.html',
        cssFile: 'public/css/drum-machine.css'
      });

      const uploadedFiles = uploadFiles.mock.calls[0][0]; // First arg is the files array
      expect(uploadedFiles.every(f => !f.remote.endsWith('.map'))).toBe(true);
      expect(result.uploaded).toBe(4);
    });

    it('should include source maps when includeMaps is true', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      getLocalFiles.mockResolvedValue([
        '/drum-machine/dist/bundle.js',
        '/drum-machine/dist/bundle.js.map'
      ]);
      filterFiles.mockImplementation(files => files);
      
      uploadFiles.mockResolvedValue([
        { file: 'drum-machine.html', success: true },
        { file: 'css/drum-machine.css', success: true },
        { file: 'js/drum-machine/bundle.js', success: true },
        { file: 'js/drum-machine/bundle.js.map', success: true }
      ]);

      const result = await deployDrumMachine('API_KEY', {
        distDir: '/drum-machine/dist',
        htmlFile: 'public/drum-machine.html',
        cssFile: 'public/css/drum-machine.css',
        includeMaps: true
      });

      const uploadedFiles = uploadFiles.mock.calls[0][0]; // First arg is the files array
      expect(uploadedFiles.some(f => f.remote.endsWith('.map'))).toBe(true);
      expect(result.uploaded).toBe(4);
    });

    it('should fail if dist directory does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      await expect(
        deployDrumMachine('API_KEY', {
          distDir: '/nonexistent/dist',
          htmlFile: 'public/drum-machine.html',
          cssFile: 'public/css/drum-machine.css'
        })
      ).rejects.toThrow(/dist directory not found/i);
    });

    it('should fail if HTML file does not exist', async () => {
      fs.existsSync
        .mockReturnValueOnce(true)  // dist dir exists
        .mockReturnValueOnce(false); // HTML file missing

      await expect(
        deployDrumMachine('API_KEY', {
          distDir: '/drum-machine/dist',
          htmlFile: 'public/missing.html',
          cssFile: 'public/css/drum-machine.css'
        })
      ).rejects.toThrow(/HTML file not found/i);
    });

    it('should handle upload failures gracefully', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      getLocalFiles.mockResolvedValue([
        '/drum-machine/dist/bundle.js'
      ]);
      filterFiles.mockImplementation(files => files);
      
      uploadFiles.mockResolvedValue([
        { file: 'drum-machine.html', success: true },
        { file: 'css/drum-machine.css', success: false, error: 'Network error' },
        { file: 'js/drum-machine/bundle.js', success: true }
      ]);

      const result = await deployDrumMachine('API_KEY', {
        distDir: '/drum-machine/dist',
        htmlFile: 'public/drum-machine.html',
        cssFile: 'public/css/drum-machine.css'
      });

      expect(result.uploaded).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should respect dryRun option', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      getLocalFiles.mockResolvedValue([
        '/drum-machine/dist/bundle.js'
      ]);
      filterFiles.mockImplementation(files => files);

      const result = await deployDrumMachine('API_KEY', {
        distDir: '/drum-machine/dist',
        htmlFile: 'public/drum-machine.html',
        cssFile: 'public/css/drum-machine.css',
        dryRun: true
      });

      expect(uploadFiles).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
      expect(result.wouldUpload).toBeGreaterThan(0);
    });

    it('should calculate total size correctly', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 10240 }); // 10 KB
      
      getLocalFiles.mockResolvedValue([
        '/drum-machine/dist/bundle.js',
        '/drum-machine/dist/bundle.css'
      ]);
      filterFiles.mockImplementation(files => files);
      
      uploadFiles.mockResolvedValue([
        { file: 'drum-machine.html', success: true },
        { file: 'css/drum-machine.css', success: true },
        { file: 'js/drum-machine/bundle.js', success: true },
        { file: 'js/drum-machine/bundle.css', success: true }
      ]);

      const result = await deployDrumMachine('API_KEY', {
        distDir: '/drum-machine/dist',
        htmlFile: 'public/drum-machine.html',
        cssFile: 'public/css/drum-machine.css'
      });

      expect(result.totalSizeKB).toBeDefined();
      expect(result.totalSizeKB).toBeGreaterThan(0);
    });

    it('should handle empty dist directory', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      getLocalFiles.mockResolvedValue([]);
      filterFiles.mockReturnValue([]);
      
      uploadFiles.mockResolvedValue([
        { file: 'drum-machine.html', success: true },
        { file: 'css/drum-machine.css', success: true }
      ]);

      const result = await deployDrumMachine('API_KEY', {
        distDir: '/drum-machine/dist',
        htmlFile: 'public/drum-machine.html',
        cssFile: 'public/css/drum-machine.css'
      });

      expect(result.uploaded).toBe(2); // Only HTML and CSS
    });

    it('should use default paths if none specified', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      getLocalFiles.mockResolvedValue([
        '../drum-machine/dist/bundle.js'
      ]);
      filterFiles.mockImplementation(files => files);
      
      uploadFiles.mockResolvedValue([
        { file: 'drum-machine.html', success: true },
        { file: 'css/drum-machine.css', success: true },
        { file: 'js/drum-machine/bundle.js', success: true }
      ]);

      const result = await deployDrumMachine('API_KEY');

      expect(uploadFiles).toHaveBeenCalled();
      expect(result.uploaded).toBeGreaterThan(0);
    });
  });
});
