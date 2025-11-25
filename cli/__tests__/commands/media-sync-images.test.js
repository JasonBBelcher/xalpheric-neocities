const syncImages = require('../../commands/media/sync-images');
const fs = require('fs').promises;
const fsSync = require('fs');
const logger = require('../../lib/utils/logger');

// Mock only external dependencies
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    copyFile: jest.fn(),
    access: jest.fn()
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));
jest.mock('../../lib/utils/logger');

describe('syncImages', () => {
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
  });

  describe('Basic Functionality', () => {
    test('should sync images from markdown files', async () => {
      fs.readdir.mockResolvedValue(['post1.md', 'post2.md']);
      fs.readFile
        .mockResolvedValueOnce('Content without images')
        .mockResolvedValueOnce('![Alt](attachments/image.jpg)');
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.access.mockResolvedValue(); // Image exists
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      fsSync.existsSync
        .mockReturnValueOnce(true)  // dest dir exists
        .mockReturnValueOnce(false); // image doesn't exist in dest

      const result = await syncImages({
        source: 'test-source',
        dest: 'test-dest',
        verbose: false
      });

      expect(result.copied).toBe(1);
      expect(result.updated).toBe(1);
      expect(fs.copyFile).toHaveBeenCalled();
    });

    test('should handle no markdown files gracefully', async () => {
      fs.readdir.mockResolvedValue(['readme.txt', 'image.jpg']);

      const result = await syncImages({
        source: 'empty-source',
        dest: 'test-dest'
      });

      expect(result.copied).toBe(0);
      expect(result.updated).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No markdown files found')
      );
    });

    test('should create destination directory if it does not exist', async () => {
      fsSync.existsSync.mockReturnValue(false);
      fs.readdir.mockResolvedValue([]);

      await syncImages({
        source: 'test-source',
        dest: 'new-dest'
      });

      expect(fsSync.mkdirSync).toHaveBeenCalledWith('new-dest', {
        recursive: true
      });
    });
  });

  describe('Obsidian Wikilink Processing', () => {
    test('should convert Obsidian wikilinks to standard markdown', async () => {
      const markdown = 'Image: ![[my-image.jpg]]';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.access.mockResolvedValue(); // Image exists
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      fsSync.existsSync.mockReturnValue(false); // Image doesn't exist in dest

      await syncImages({
        source: 'test-source',
        dest: 'test-dest'
      });

      // Verify file was updated with standard markdown
      const writeCall = fs.writeFile.mock.calls[0];
      expect(writeCall[1]).toContain('![my image](../assets/blog-images/my-image.jpg)');
      expect(writeCall[1]).not.toContain('![[');
    });

    test('should handle wikilinks with subdirectories', async () => {
      const markdown = '![[folder/nested-image.png]]';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.access.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      fsSync.existsSync.mockReturnValue(false);

      await syncImages({
        source: 'test-source',
        dest: 'test-dest'
      });

      expect(fs.copyFile).toHaveBeenCalled();
      const copyCall = fs.copyFile.mock.calls[0];
      expect(copyCall[1]).toContain('nested-image.png'); // Just filename, no folder
    });

    test('should generate alt text from filename', async () => {
      const markdown = '![[my-cool-image.jpg]]';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.access.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      fsSync.existsSync.mockReturnValue(false);

      await syncImages({
        source: 'test-source',
        dest: 'test-dest'
      });

      const writeCall = fs.writeFile.mock.calls[0];
      expect(writeCall[1]).toContain('![my cool image]'); // Dashes replaced with spaces
    });
  });

  describe('Standard Markdown Image Processing', () => {
    test('should process standard markdown links from attachment directories', async () => {
      const markdown = '![My Image](attachments/photo.jpg)';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);
      fs.access.mockResolvedValue(); // Image exists
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      fsSync.existsSync.mockReturnValue(false);

      await syncImages({
        source: 'test-source',
        dest: 'test-dest'
      });

      expect(fs.copyFile).toHaveBeenCalled();
      const writeCall = fs.writeFile.mock.calls[0];
      expect(writeCall[1]).toContain('![My Image](../assets/blog-images/photo.jpg)');
    });

    test('should recognize common attachment directory names', async () => {
      const attachmentDirs = ['attachments', 'assets', 'images', 'media', '.attachments'];
      
      for (const dir of attachmentDirs) {
        jest.clearAllMocks();
        
        const markdown = `![](${dir}/test.jpg)`;
        
        fs.readdir.mockResolvedValue(['post.md']);
        fs.readFile.mockResolvedValue(markdown);
        fs.access.mockResolvedValue();
        fs.copyFile.mockResolvedValue();
        fs.writeFile.mockResolvedValue();
        fsSync.existsSync.mockReturnValue(false);

        await syncImages({
          source: 'test-source',
          dest: 'test-dest'
        });

        expect(fs.copyFile).toHaveBeenCalled();
      }
    });

    test('should handle relative paths with ./', async () => {
      const markdown = '![](./attachments/image.png)';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);
      fs.access.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      fsSync.existsSync.mockReturnValue(false);

      await syncImages({
        source: 'test-source',
        dest: 'test-dest'
      });

      expect(fs.copyFile).toHaveBeenCalled();
    });

    test('should preserve existing alt text', async () => {
      const markdown = '![Custom Alt Text](attachments/photo.jpg)';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);
      fs.access.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      fsSync.existsSync.mockReturnValue(false);

      await syncImages({
        source: 'test-source',
        dest: 'test-dest'
      });

      const writeCall = fs.writeFile.mock.calls[0];
      expect(writeCall[1]).toContain('![Custom Alt Text]');
    });
  });

  describe('File Copying Behavior', () => {
    test('should copy image to destination directory', async () => {
      const markdown = '![](attachments/photo.jpg)';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);
      fs.access.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      fsSync.existsSync.mockReturnValue(false);

      await syncImages({
        source: 'test-source',
        dest: 'my-blog-images'
      });

      const copyCall = fs.copyFile.mock.calls[0];
      expect(copyCall[1]).toContain('my-blog-images/photo.jpg');
    });

    test('should skip copying if image already exists (unless force)', async () => {
      const markdown = '![](attachments/existing.jpg)';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);
      
      fsSync.existsSync.mockReturnValue(true); // Image exists

      const result = await syncImages({
        source: 'test-source',
        dest: 'test-dest',
        force: false
      });

      expect(fs.copyFile).not.toHaveBeenCalled();
      expect(result.skipped).toBe(1);
    });

    test('should force copy when force option is true', async () => {
      const markdown = '![](attachments/existing.jpg)';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);
      fs.access.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      fsSync.existsSync.mockReturnValue(true); // Image exists but force=true

      const result = await syncImages({
        source: 'test-source',
        dest: 'test-dest',
        force: true
      });

      expect(fs.copyFile).toHaveBeenCalled();
      expect(result.copied).toBe(1);
    });

    test('should handle missing source images gracefully', async () => {
      const markdown = '![](attachments/missing.jpg)';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);
      fs.access.mockRejectedValue(new Error('ENOENT')); // Image doesn't exist
      fs.writeFile.mockResolvedValue();

      const result = await syncImages({
        source: 'test-source',
        dest: 'test-dest'
      });

      expect(fs.copyFile).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Image not found')
      );
      expect(result.copied).toBe(0);
    });
  });

  describe('Markdown File Updates', () => {
    test('should update markdown file with converted paths', async () => {
      const markdown = '![](attachments/image.jpg)';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);
      fs.access.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      fsSync.existsSync.mockReturnValue(false);

      await syncImages({
        source: 'source-dir',
        dest: 'dest-dir'
      });

      expect(fs.writeFile).toHaveBeenCalledWith(
        'source-dir/post.md',
        expect.stringContaining('../assets/blog-images/image.jpg'),
        'utf8'
      );
    });

    test('should not update file if no changes needed', async () => {
      const markdown = 'Content without any images';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);

      const result = await syncImages({
        source: 'test-source',
        dest: 'test-dest'
      });

      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(result.updated).toBe(0);
    });

    test('should skip images already pointing to blog-images', async () => {
      const markdown = '![](../assets/blog-images/already-synced.jpg)';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);

      await syncImages({
        source: 'test-source',
        dest: 'test-dest'
      });

      expect(fs.copyFile).not.toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    test('should skip external URLs', async () => {
      const markdown = '![](https://example.com/image.jpg)';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);

      await syncImages({
        source: 'test-source',
        dest: 'test-dest'
      });

      expect(fs.copyFile).not.toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Images in Single File', () => {
    test('should process multiple images in one markdown file', async () => {
      const markdown = `
# My Post

![[image1.jpg]]

Some text

![Alt](attachments/image2.png)

More text

![[image3.gif]]
      `;
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.access.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      fsSync.existsSync.mockReturnValue(false);

      const result = await syncImages({
        source: 'test-source',
        dest: 'test-dest'
      });

      expect(result.copied).toBe(3);
      expect(fs.copyFile).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    test('should handle copy errors gracefully', async () => {
      const markdown = '![](attachments/image.jpg)';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);
      fs.access.mockResolvedValue();
      fs.copyFile.mockRejectedValue(new Error('Copy failed'));
      
      fsSync.existsSync.mockReturnValue(false);

      const result = await syncImages({
        source: 'test-source',
        dest: 'test-dest'
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to copy')
      );
      expect(result.copied).toBe(0);
    });

    test('should throw on critical failures', async () => {
      fs.readdir.mockRejectedValue(new Error('Cannot read directory'));

      await expect(
        syncImages({
          source: 'bad-source',
          dest: 'test-dest'
        })
      ).rejects.toThrow('Cannot read directory');
    });
  });

  describe('Options and Configuration', () => {
    test('should use custom source directory', async () => {
      fs.readdir.mockResolvedValue([]);

      await syncImages({
        source: 'custom-source',
        dest: 'test-dest'
      });

      expect(fs.readdir).toHaveBeenCalledWith('custom-source');
    });

    test('should use custom destination directory', async () => {
      const markdown = '![](attachments/image.jpg)';
      
      fs.readdir.mockResolvedValue(['post.md']);
      fs.readFile.mockResolvedValue(markdown);
      fs.access.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      fsSync.existsSync.mockReturnValue(false);

      await syncImages({
        source: 'test-source',
        dest: 'custom-dest'
      });

      const copyCall = fs.copyFile.mock.calls[0];
      expect(copyCall[1]).toContain('custom-dest');
    });

    test('should enable verbose logging when requested', async () => {
      fs.readdir.mockResolvedValue([]);

      await syncImages({
        source: 'test-source',
        dest: 'test-dest',
        verbose: true
      });

      expect(logger.setVerbose).toHaveBeenCalledWith(true);
    });
  });

  describe('Return Value', () => {
    test('should return sync statistics', async () => {
      const markdown1 = '![](attachments/img1.jpg)';
      const markdown2 = 'No images here';
      const markdown3 = '![](attachments/img2.jpg)';
      
      fs.readdir.mockResolvedValue(['post1.md', 'post2.md', 'post3.md']);
      fs.readFile
        .mockResolvedValueOnce(markdown1)
        .mockResolvedValueOnce(markdown2)
        .mockResolvedValueOnce(markdown3);
      fs.access.mockResolvedValue();
      fs.copyFile.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      fsSync.existsSync.mockReturnValue(false);

      const result = await syncImages({
        source: 'test-source',
        dest: 'test-dest'
      });

      expect(result).toEqual({
        copied: 2,
        skipped: 0,
        updated: 2,
        source: 'test-source',
        dest: 'test-dest'
      });
    });
  });
});
