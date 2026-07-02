const buildMusings = require('../../commands/build/musings');
const fs = require('fs').promises;
const fsSync = require('fs');
const { execSync } = require('child_process');
const logger = require('../../lib/utils/logger');

// Mock external dependencies only (not internal functions)
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    copyFile: jest.fn()
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn()
}));
jest.mock('child_process');
jest.mock('../../lib/utils/logger');

describe('buildMusings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup logger mock
    logger.setVerbose = jest.fn();
    logger.info = jest.fn();
    logger.verbose = jest.fn();
    logger.warn = jest.fn();
    logger.error = jest.fn();
    logger.success = jest.fn();

    // Default mocks
    fsSync.existsSync.mockReturnValue(true);
    fsSync.mkdirSync.mockReturnValue(undefined);
    execSync.mockReturnValue('');
  });

  describe('Basic Functionality', () => {
    test('should build markdown files to HTML', async () => {
      // Setup
      const mockFiles = ['test-post.md', 'another-post.md'];
      const mockMarkdown = '# Test Post\n\nThis is a test post.';
      const mockStats = { mtime: new Date() };

      fs.readdir.mockResolvedValue(mockFiles);
      fs.stat.mockResolvedValue(mockStats);
      fs.readFile.mockResolvedValue(mockMarkdown);
      fs.writeFile.mockResolvedValue();

      // Execute
      const result = await buildMusings({
        source: 'test-source',
        output: 'test-output',
        processPhotos: false,
        verbose: false
      });

      // Verify
      expect(result.built).toBe(2);
      expect(result.failed).toBe(0);
      expect(fs.readdir).toHaveBeenCalledWith('test-source');
      // 2 posts written; no index.html is generated anymore (Eleventy handles the listing)
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
    });

    test('should handle no markdown files gracefully', async () => {
      fs.readdir.mockResolvedValue(['readme.txt', 'image.jpg']);

      const result = await buildMusings({
        source: 'empty-source',
        output: 'test-output',
        processPhotos: false
      });

      expect(result.built).toBe(0);
      expect(result.failed).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No markdown files found')
      );
    });

    test('should sort posts by modification time (newest first)', async () => {
      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-12-01');

      fs.readdir.mockResolvedValue(['old.md', 'new.md']);
      fs.stat
        .mockResolvedValueOnce({ mtime: oldDate })
        .mockResolvedValueOnce({ mtime: newDate });
      fs.readFile.mockResolvedValue('# Content');
      fs.writeFile.mockResolvedValue();

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        processPhotos: false
      });

      // Verify writeFile was called with newest file first
      const writeCalls = fs.writeFile.mock.calls;
      const firstPost = writeCalls[0][0]; // First HTML file written
      expect(firstPost).toContain('new.html');
    });
  });

  describe('Markdown Processing', () => {
    test('should convert markdown to HTML with proper structure', async () => {
      const mockMarkdown = '# Heading\n\nParagraph with **bold** text.';
      
      fs.readdir.mockResolvedValue(['test.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue(mockMarkdown);
      fs.writeFile.mockResolvedValue();

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        processPhotos: false
      });

      const htmlContent = fs.writeFile.mock.calls[0][1];
      expect(htmlContent).toContain('<h1>Heading</h1>');
      expect(htmlContent).toContain('<strong>bold</strong>');
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<title>Xalpheric - test</title>');
    });

    test('should sanitize filenames for web use', async () => {
      const mockMarkdown = '# Content';
      
      fs.readdir.mockResolvedValue(['My Blog Post!.md', 'Test & Demo.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue(mockMarkdown);
      fs.writeFile.mockResolvedValue();

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        processPhotos: false
      });

      const writeCalls = fs.writeFile.mock.calls;
      expect(writeCalls[0][0]).toContain('My-Blog-Post.html');
      expect(writeCalls[1][0]).toContain('Test-Demo.html');
    });

    test('should process YouTube embeds with {{youtube:ID}} syntax', async () => {
      const mockMarkdown = 'Check this out:\n\n{{youtube:dQw4w9WgXcQ}}';
      
      fs.readdir.mockResolvedValue(['video-post.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue(mockMarkdown);
      fs.writeFile.mockResolvedValue();

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        processPhotos: false
      });

      const htmlContent = fs.writeFile.mock.calls[0][1];
      expect(htmlContent).toContain('blog-video-container');
      expect(htmlContent).toContain('youtube.com/embed/dQw4w9WgXcQ');
      expect(htmlContent).toContain('iframe');
    });

    test('should convert YouTube URLs to embeds', async () => {
      const mockMarkdown = 'Video: https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      fs.readdir.mockResolvedValue(['video.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue(mockMarkdown);
      fs.writeFile.mockResolvedValue();

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        processPhotos: false
      });

      const htmlContent = fs.writeFile.mock.calls[0][1];
      expect(htmlContent).toContain('youtube.com/embed/dQw4w9WgXcQ');
    });
  });

  describe('Image Processing', () => {
    test('should convert Obsidian wikilinks to standard markdown', async () => {
      const mockMarkdown = 'Image: ![[my-image.jpg]]';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue(mockMarkdown);
      fs.writeFile.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      fsSync.existsSync.mockReturnValue(true);

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        blogImagesDir: 'test-images',
        processPhotos: false
      });

      const htmlContent = fs.writeFile.mock.calls[0][1];
      expect(htmlContent).toContain('blog-images/my-image.jpg');
      expect(htmlContent).toContain('blog-image-container');
    });

    test('should copy images to blog images directory', async () => {
      const mockMarkdown = 'Image: ![Alt text](../assets/test.jpg)';
      const sourcePath = 'test-source/post.md';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue(mockMarkdown);
      fs.writeFile.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      
      // Mock existsSync calls in order:
      // 1. Output dir check
      // 2. Blog images dir check  
      // 3. Check if dest image exists (false - need to copy)
      // 4. Check for alternative extensions (multiple calls)
      // 5. Check if source exists (true - can copy)
      fsSync.existsSync
        .mockReturnValueOnce(true)  // output dir exists
        .mockReturnValueOnce(true)  // blog images dir exists
        .mockReturnValueOnce(false) // dest image doesn't exist
        .mockReturnValueOnce(false) // no .jpg alternative
        .mockReturnValueOnce(false) // no .jpeg alternative
        .mockReturnValueOnce(false) // no .png alternative
        .mockReturnValueOnce(false) // no .gif alternative
        .mockReturnValueOnce(false) // no .webp alternative
        .mockReturnValueOnce(true); // source image exists

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        blogImagesDir: 'blog-images',
        processPhotos: false
      });

      expect(fs.copyFile).toHaveBeenCalled();
      const copyCall = fs.copyFile.mock.calls[0];
      expect(copyCall[1]).toContain('blog-images/test.jpg');
    });

    test('should skip copying if image already exists', async () => {
      const mockMarkdown = '![Alt](image.jpg)';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue(mockMarkdown);
      fs.writeFile.mockResolvedValue();
      
      // Image already exists in destination
      fsSync.existsSync.mockReturnValue(true);

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        blogImagesDir: 'blog-images',
        processPhotos: false
      });

      expect(fs.copyFile).not.toHaveBeenCalled();
    });

    test('should handle missing source images gracefully', async () => {
      const mockMarkdown = '![Alt](missing.jpg)';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue(mockMarkdown);
      fs.writeFile.mockResolvedValue();
      
      // Mock existsSync calls in order:
      // 1. Output dir check
      // 2. Blog images dir check
      // 3. Resolve path: check relativeToSource (line 258 in musings.js)
      // 4. copyImageToBlogImages: check if dest exists
      // 5-9. Check for alternative extensions
      // 10. Check if source exists (false - MISSING!)
      fsSync.existsSync
        .mockReturnValueOnce(true)  // output dir exists
        .mockReturnValueOnce(true)  // blog images dir exists
        .mockReturnValueOnce(false) // relativeToSource doesn't exist (line 258)
        .mockReturnValueOnce(false) // dest image doesn't exist
        .mockReturnValueOnce(false) // no .jpg alternative
        .mockReturnValueOnce(false) // no .jpeg alternative
        .mockReturnValueOnce(false) // no .png alternative
        .mockReturnValueOnce(false) // no .gif alternative
        .mockReturnValueOnce(false) // no .webp alternative
        .mockReturnValueOnce(false); // source image doesn't exist - MISSING!

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        blogImagesDir: 'blog-images',
        processPhotos: false
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Image not found')
      );
      expect(fs.copyFile).not.toHaveBeenCalled();
    });
  });

  describe('Photo Processing', () => {
    test('should run photo processing script when enabled', async () => {
      fs.readdir.mockResolvedValue(['post.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue('# Content');
      fs.writeFile.mockResolvedValue();
      execSync.mockReturnValue('Photos processed');

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        processPhotos: true,
        verbose: true
      });

      expect(execSync).toHaveBeenCalledWith(
        './process-photos-enhanced.sh blog 512 jpg',
        expect.any(Object)
      );
    });

    test('should skip photo processing when disabled', async () => {
      fs.readdir.mockResolvedValue(['post.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue('# Content');
      fs.writeFile.mockResolvedValue();

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        processPhotos: false
      });

      expect(execSync).not.toHaveBeenCalled();
    });

    test('should continue if photo processing fails', async () => {
      fs.readdir.mockResolvedValue(['post.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue('# Content');
      fs.writeFile.mockResolvedValue();
      execSync.mockImplementation(() => {
        throw new Error('Photo processing failed');
      });

      const result = await buildMusings({
        source: 'test-source',
        output: 'test-output',
        processPhotos: true
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Photo processing failed')
      );
      expect(result.built).toBe(1); // Should still build
    });
  });

  describe('Error Handling', () => {
    test('should handle individual file build failures', async () => {
      fs.readdir.mockResolvedValue(['good.md', 'bad.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile
        .mockResolvedValueOnce('# Good content')
        .mockRejectedValueOnce(new Error('File read error'));
      fs.writeFile.mockResolvedValue();

      const result = await buildMusings({
        source: 'test-source',
        output: 'test-output',
        processPhotos: false
      });

      expect(result.built).toBe(1);
      expect(result.failed).toBe(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to build bad.md')
      );
    });

    test('should create output directory if it does not exist', async () => {
      fsSync.existsSync.mockReturnValue(false);
      fs.readdir.mockResolvedValue(['post.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue('# Content');
      fs.writeFile.mockResolvedValue();

      await buildMusings({
        source: 'test-source',
        output: 'new-output',
        processPhotos: false
      });

      expect(fsSync.mkdirSync).toHaveBeenCalledWith('new-output', {
        recursive: true
      });
    });

    test('should create blog images directory if it does not exist', async () => {
      fsSync.existsSync
        .mockReturnValueOnce(true)  // output dir exists
        .mockReturnValueOnce(false); // blog images dir doesn't exist
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue('# Content');
      fs.writeFile.mockResolvedValue();

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        blogImagesDir: 'new-images-dir',
        processPhotos: false
      });

      expect(fsSync.mkdirSync).toHaveBeenCalledWith('new-images-dir', {
        recursive: true
      });
    });

    test('should throw error on critical failures', async () => {
      fs.readdir.mockRejectedValue(new Error('Cannot read directory'));

      await expect(
        buildMusings({
          source: 'bad-source',
          output: 'test-output',
          processPhotos: false
        })
      ).rejects.toThrow('Cannot read directory');
    });
  });

  describe('Index Generation', () => {
    // The legacy index.html is no longer written by the CLI — Eleventy now
    // renders the /musings.html listing. This suite verifies the CLI no longer
    // writes a duplicate listing and cleans up any stale index.html on disk.
    test('should not write an index.html listing', async () => {
      fs.readdir.mockResolvedValue(['first.md', 'second.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue('# Content');
      fs.writeFile.mockResolvedValue();

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        processPhotos: false
      });

      const indexCall = fs.writeFile.mock.calls.find(call =>
        call[0].includes('index.html')
      );
      expect(indexCall).toBeUndefined();
    });

    test('should remove a stale index.html left from before the cleanup', async () => {
      fs.readdir.mockResolvedValue(['post.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue('# Content');
      fs.writeFile.mockResolvedValue();
      // Pretend the stale index.html exists; unlinkSync should be called.
      fsSync.existsSync.mockReturnValue(true);

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        processPhotos: false,
        verbose: true
      });

      expect(fsSync.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('index.html')
      );
    });

    test('should not call unlinkSync when no stale index.html exists', async () => {
      fs.readdir.mockResolvedValue(['post.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue('# Content');
      fs.writeFile.mockResolvedValue();
      // Output dir exists, blog images dir exists, but stale index.html does not.
      fsSync.existsSync
        .mockReturnValueOnce(true)   // output dir exists
        .mockReturnValueOnce(true)   // blog images dir exists
        .mockReturnValue(false);     // everything else (including index.html) is false

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        processPhotos: false
      });

      expect(fsSync.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('Options and Configuration', () => {
    test('should use custom source directory', async () => {
      fs.readdir.mockResolvedValue([]);

      await buildMusings({
        source: 'custom-source',
        output: 'test-output',
        processPhotos: false
      });

      expect(fs.readdir).toHaveBeenCalledWith('custom-source');
    });

    test('should use custom output directory', async () => {
      fs.readdir.mockResolvedValue(['post.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue('# Content');
      fs.writeFile.mockResolvedValue();

      await buildMusings({
        source: 'test-source',
        output: 'custom-output',
        processPhotos: false
      });

      const writeCalls = fs.writeFile.mock.calls;
      expect(writeCalls[0][0]).toContain('custom-output');
    });

    test('should enable verbose logging when requested', async () => {
      fs.readdir.mockResolvedValue(['post.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue('# Content');
      fs.writeFile.mockResolvedValue();

      await buildMusings({
        source: 'test-source',
        output: 'test-output',
        processPhotos: false,
        verbose: true
      });

      expect(logger.setVerbose).toHaveBeenCalledWith(true);
      expect(logger.verbose).toHaveBeenCalled();
    });
  });

  describe('Return Value', () => {
    test('should return build statistics', async () => {
      fs.readdir.mockResolvedValue(['one.md', 'two.md', 'three.md']);
      fs.stat.mockResolvedValue({ mtime: new Date() });
      fs.readFile.mockResolvedValue('# Content');
      fs.writeFile.mockResolvedValue();

      const result = await buildMusings({
        source: 'test-source',
        output: 'test-output',
        processPhotos: false
      });

      expect(result).toEqual({
        built: 3,
        failed: 0,
        source: 'test-source',
        output: 'test-output'
      });
    });
  });
});
