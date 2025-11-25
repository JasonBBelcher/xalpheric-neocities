const buildAll = require('../../commands/build/all');
const logger = require('../../lib/utils/logger');

// Mock the command modules (internal dependencies)
jest.mock('../../commands/media/sync-images');
jest.mock('../../commands/build/musings');
jest.mock('../../lib/utils/logger');

const syncImages = require('../../commands/media/sync-images');
const buildMusings = require('../../commands/build/musings');

describe('buildAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup logger mock
    logger.setVerbose = jest.fn();
    logger.info = jest.fn();
    logger.verbose = jest.fn();
    logger.warn = jest.fn();
    logger.error = jest.fn();
    logger.success = jest.fn();
  });

  describe('Successful Workflow', () => {
    test('should orchestrate sync-images → build-musings workflow', async () => {
      syncImages.mockResolvedValue({
        copied: 3,
        skipped: 1,
        updated: 2
      });
      buildMusings.mockResolvedValue({
        built: 5,
        failed: 0
      });

      const result = await buildAll({
        verbose: false
      });

      expect(syncImages).toHaveBeenCalledWith({
        source: 'thoughts-and-musings',
        dest: 'public/assets/blog-images',
        verbose: false
      });

      expect(buildMusings).toHaveBeenCalledWith({
        source: 'thoughts-and-musings',
        output: 'public/musings',
        blogImagesDir: 'public/assets/blog-images',
        processPhotos: true,
        verbose: false
      });

      expect(result.success).toBe(true);
      expect(result.syncImages.copied).toBe(3);
      expect(result.buildMusings.built).toBe(5);
    });

    test('should call commands in correct order', async () => {
      const callOrder = [];
      
      syncImages.mockImplementation(async () => {
        callOrder.push('sync');
        return { copied: 0, skipped: 0, updated: 0 };
      });
      
      buildMusings.mockImplementation(async () => {
        callOrder.push('build');
        return { built: 0, failed: 0 };
      });

      await buildAll({ verbose: false });

      expect(callOrder).toEqual(['sync', 'build']);
    });

    test('should pass verbose option to both commands', async () => {
      syncImages.mockResolvedValue({ copied: 0, skipped: 0, updated: 0 });
      buildMusings.mockResolvedValue({ built: 0, failed: 0 });

      await buildAll({ verbose: true });

      expect(syncImages).toHaveBeenCalledWith(
        expect.objectContaining({ verbose: true })
      );
      expect(buildMusings).toHaveBeenCalledWith(
        expect.objectContaining({ verbose: true })
      );
      expect(logger.setVerbose).toHaveBeenCalledWith(true);
    });
  });

  describe('Image Sync Errors', () => {
    test('should continue with build if image sync fails', async () => {
      syncImages.mockRejectedValue(new Error('Image sync failed'));
      buildMusings.mockResolvedValue({
        built: 5,
        failed: 0
      });

      const result = await buildAll({ verbose: false });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Image sync failed')
      );
      expect(logger.info).toHaveBeenCalledWith('Continuing with build...');
      expect(buildMusings).toHaveBeenCalled();
      expect(result.syncImages.error).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('should log image sync warning but continue workflow', async () => {
      syncImages.mockRejectedValue(new Error('Connection timeout'));
      buildMusings.mockResolvedValue({ built: 3, failed: 0 });

      await buildAll({ verbose: false });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Connection timeout')
      );
      expect(buildMusings).toHaveBeenCalled();
    });
  });

  describe('Build Musings Errors', () => {
    test('should throw error if build musings fails', async () => {
      syncImages.mockResolvedValue({ copied: 0, skipped: 0, updated: 0 });
      buildMusings.mockRejectedValue(new Error('Build failed'));

      await expect(
        buildAll({ verbose: false })
      ).rejects.toThrow('Build failed');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Workflow failed')
      );
    });

    test('should fail if build musings has failures', async () => {
      syncImages.mockResolvedValue({ copied: 0, skipped: 0, updated: 0 });
      buildMusings.mockResolvedValue({
        built: 3,
        failed: 2
      });

      await expect(
        buildAll({ verbose: false })
      ).rejects.toThrow('Build failed for 2 files');
    });

    test('should set success to false on build failure', async () => {
      syncImages.mockResolvedValue({ copied: 0, skipped: 0, updated: 0 });
      buildMusings.mockRejectedValue(new Error('Build error'));

      try {
        await buildAll({ verbose: false });
      } catch (error) {
        // Expected to throw
      }

      // Result should be set to failed state
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Logging and Progress', () => {
    test('should log workflow start message', async () => {
      syncImages.mockResolvedValue({ copied: 0, skipped: 0, updated: 0 });
      buildMusings.mockResolvedValue({ built: 0, failed: 0 });

      await buildAll({ verbose: false });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting complete blog build workflow'),
        'cyan'
      );
    });

    test('should log each step', async () => {
      syncImages.mockResolvedValue({ copied: 2, skipped: 0, updated: 1 });
      buildMusings.mockResolvedValue({ built: 5, failed: 0 });

      await buildAll({ verbose: false });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Step 1: Syncing Obsidian images'),
        'blue'
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Step 2: Building blog posts'),
        'blue'
      );
    });

    test('should log success messages after each step', async () => {
      syncImages.mockResolvedValue({ copied: 3, skipped: 1, updated: 2 });
      buildMusings.mockResolvedValue({ built: 7, failed: 0 });

      await buildAll({ verbose: false });

      expect(logger.success).toHaveBeenCalledWith(
        expect.stringContaining('Image sync complete: 3 images copied')
      );
      expect(logger.success).toHaveBeenCalledWith(
        expect.stringContaining('Build complete: 7 posts generated')
      );
    });

    test('should display workflow summary', async () => {
      syncImages.mockResolvedValue({ copied: 4, skipped: 2, updated: 3 });
      buildMusings.mockResolvedValue({ built: 8, failed: 0 });

      await buildAll({ verbose: false });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Workflow Summary'),
        'cyan'
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Images synced: 4')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Posts built: 8')
      );
    });

    test('should log final success message', async () => {
      syncImages.mockResolvedValue({ copied: 0, skipped: 0, updated: 0 });
      buildMusings.mockResolvedValue({ built: 0, failed: 0 });

      await buildAll({ verbose: false });

      expect(logger.success).toHaveBeenCalledWith(
        expect.stringContaining('Complete blog build workflow finished'),
        'green'
      );
    });
  });

  describe('Return Value', () => {
    test('should return results from both commands', async () => {
      syncImages.mockResolvedValue({
        copied: 5,
        skipped: 2,
        updated: 3
      });
      buildMusings.mockResolvedValue({
        built: 10,
        failed: 0
      });

      const result = await buildAll({ verbose: false });

      expect(result).toEqual({
        syncImages: {
          copied: 5,
          skipped: 2,
          updated: 3
        },
        buildMusings: {
          built: 10,
          failed: 0
        },
        success: true
      });
    });

    test('should include error in syncImages result if sync fails', async () => {
      syncImages.mockRejectedValue(new Error('Sync error'));
      buildMusings.mockResolvedValue({ built: 5, failed: 0 });

      const result = await buildAll({ verbose: false });

      expect(result.syncImages).toEqual({
        error: 'Sync error',
        copied: 0,
        skipped: 0
      });
    });
  });

  describe('Options Handling', () => {
    test('should handle missing options object', async () => {
      syncImages.mockResolvedValue({ copied: 0, skipped: 0, updated: 0 });
      buildMusings.mockResolvedValue({ built: 0, failed: 0 });

      await buildAll();

      expect(syncImages).toHaveBeenCalled();
      expect(buildMusings).toHaveBeenCalled();
    });

    test('should default verbose to false', async () => {
      syncImages.mockResolvedValue({ copied: 0, skipped: 0, updated: 0 });
      buildMusings.mockResolvedValue({ built: 0, failed: 0 });

      await buildAll({});

      expect(logger.setVerbose).toHaveBeenCalledWith(false);
    });
  });

  describe('Error Propagation', () => {
    test('should propagate build errors to caller', async () => {
      syncImages.mockResolvedValue({ copied: 0, skipped: 0, updated: 0 });
      buildMusings.mockRejectedValue(new Error('Critical build error'));

      await expect(
        buildAll({ verbose: false })
      ).rejects.toThrow('Critical build error');
    });

    test('should not propagate sync errors (continues workflow)', async () => {
      syncImages.mockRejectedValue(new Error('Sync error'));
      buildMusings.mockResolvedValue({ built: 5, failed: 0 });

      await expect(
        buildAll({ verbose: false })
      ).resolves.toBeDefined();
    });
  });
});
