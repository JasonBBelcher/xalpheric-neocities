const { execSync } = require('child_process');
const processPhotos = require('../photos');
const { checkDependencies, DEPENDENCIES } = require('../../../lib/media/dependencies');

// Mock modules
jest.mock('child_process');
jest.mock('../../../lib/media/dependencies');

describe('Process Photos Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default: dependencies satisfied
    checkDependencies.mockResolvedValue(undefined);
    
    // Default: execSync succeeds
    execSync.mockReturnValue(Buffer.from(''));
    
    // Mock DEPENDENCIES
    DEPENDENCIES.imagemagick = {
      commands: ['magick'],
      description: 'ImageMagick',
      brew: 'imagemagick',
      apt: 'imagemagick'
    };
  });

  describe('parameter validation', () => {
    it('should throw error when size is missing', async () => {
      await expect(
        processPhotos({ format: 'jpg' })
      ).rejects.toThrow('Size parameter is required');
    });

    it('should throw error when format is missing', async () => {
      await expect(
        processPhotos({ size: '512x512' })
      ).rejects.toThrow('Format parameter is required');
    });

    it('should accept valid size and format', async () => {
      const result = await processPhotos({
        size: '512x512',
        format: 'jpg'
      });

      expect(result.success).toBe(true);
      expect(result.size).toBe('512x512');
      expect(result.format).toBe('jpg');
    });

    it('should use empty string for missing naming pattern', async () => {
      const result = await processPhotos({
        size: '512x512',
        format: 'png'
      });

      expect(result.naming).toBe('');
    });

    it('should accept naming pattern', async () => {
      const result = await processPhotos({
        size: '512x512',
        format: 'jpg',
        naming: 'photo{increment}'
      });

      expect(result.naming).toBe('photo{increment}');
    });
  });

  describe('dependency checking', () => {
    it('should check for ImageMagick', async () => {
      await processPhotos({
        size: '512x512',
        format: 'jpg'
      });

      expect(checkDependencies).toHaveBeenCalledWith(
        [DEPENDENCIES.imagemagick],
        expect.objectContaining({
          autoInstall: true,
          required: true
        })
      );
    });

    it('should fail when dependencies are not satisfied', async () => {
      checkDependencies.mockRejectedValue(new Error('ImageMagick not found'));

      await expect(
        processPhotos({
          size: '512x512',
          format: 'jpg'
        })
      ).rejects.toThrow('ImageMagick not found');
    });

    it('should pass logger to dependency checker when verbose', async () => {
      await processPhotos({
        size: '512x512',
        format: 'jpg',
        verbose: true
      });

      expect(checkDependencies).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          logger: expect.objectContaining({
            info: expect.any(Function),
            error: expect.any(Function)
          })
        })
      );
    });
  });

  describe('script execution', () => {
    it('should execute processing script with correct parameters', async () => {
      await processPhotos({
        size: '512x512',
        format: 'jpg',
        naming: 'photo{increment}'
      });

      expect(execSync).toHaveBeenCalledWith(
        './run_me.sh 512x512 jpg "photo{increment}"',
        expect.objectContaining({
          cwd: expect.stringContaining('process_photos')
        })
      );
    });

    it('should handle empty naming pattern', async () => {
      await processPhotos({
        size: '1024x1024',
        format: 'png'
      });

      expect(execSync).toHaveBeenCalledWith(
        './run_me.sh 1024x1024 png',
        expect.any(Object)
      );
    });

    it('should use custom script path when provided', async () => {
      await processPhotos({
        size: '512x512',
        format: 'jpg',
        scriptPath: 'custom/path/to/script.sh'
      });

      expect(execSync).toHaveBeenCalledWith(
        './script.sh 512x512 jpg',
        expect.objectContaining({
          cwd: expect.stringContaining('custom/path/to')
        })
      );
    });

    it('should inherit stdio when verbose is true', async () => {
      await processPhotos({
        size: '512x512',
        format: 'jpg',
        verbose: true
      });

      expect(execSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          stdio: 'inherit'
        })
      );
    });

    it('should pipe stdio when verbose is false', async () => {
      await processPhotos({
        size: '512x512',
        format: 'jpg',
        verbose: false
      });

      expect(execSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          stdio: 'pipe'
        })
      );
    });

    it('should throw error when script execution fails', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Script failed');
      });

      await expect(
        processPhotos({
          size: '512x512',
          format: 'jpg'
        })
      ).rejects.toThrow('Script failed');
    });
  });

  describe('return values', () => {
    it('should return success status', async () => {
      const result = await processPhotos({
        size: '512x512',
        format: 'jpg'
      });

      expect(result).toMatchObject({
        success: true
      });
    });

    it('should return processing parameters', async () => {
      const result = await processPhotos({
        size: '1024x768',
        format: 'png',
        naming: 'studio{increment}'
      });

      expect(result).toMatchObject({
        success: true,
        size: '1024x768',
        format: 'png',
        naming: 'studio{increment}'
      });
    });
  });

  describe('common size formats', () => {
    const testCases = [
      { size: '512x512', format: 'jpg' },
      { size: '1024x1024', format: 'png' },
      { size: '1920x1080', format: 'jpg' },
      { size: '2048x2048', format: 'webp' },
      { size: '800x600', format: 'jpg' }
    ];

    testCases.forEach(({ size, format }) => {
      it(`should process ${size} ${format} images`, async () => {
        const result = await processPhotos({ size, format });

        expect(result.success).toBe(true);
        expect(result.size).toBe(size);
        expect(result.format).toBe(format);
        expect(execSync).toHaveBeenCalledWith(
          expect.stringContaining(size),
          expect.any(Object)
        );
      });
    });
  });

  describe('naming patterns', () => {
    const patterns = [
      'photo{increment}',
      'studio{increment}',
      'image_{date}',
      '{timestamp}_photo',
      'custom-name'
    ];

    patterns.forEach((pattern) => {
      it(`should accept naming pattern: ${pattern}`, async () => {
        const result = await processPhotos({
          size: '512x512',
          format: 'jpg',
          naming: pattern
        });

        expect(result.naming).toBe(pattern);
        expect(execSync).toHaveBeenCalledWith(
          expect.stringContaining(pattern),
          expect.any(Object)
        );
      });
    });
  });

  describe('error handling', () => {
    it('should provide helpful error message on failure', async () => {
      execSync.mockImplementation(() => {
        throw new Error('ImageMagick command failed');
      });

      await expect(
        processPhotos({
          size: '512x512',
          format: 'jpg'
        })
      ).rejects.toThrow('ImageMagick command failed');
    });

    it('should handle missing script file', async () => {
      execSync.mockImplementation(() => {
        const error = new Error('ENOENT: no such file or directory');
        error.code = 'ENOENT';
        throw error;
      });

      await expect(
        processPhotos({
          size: '512x512',
          format: 'jpg'
        })
      ).rejects.toThrow('no such file or directory');
    });
  });
});
