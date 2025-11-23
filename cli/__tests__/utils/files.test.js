const path = require('path');
const {
  getLocalFiles,
  filterFiles,
  normalizePath,
  getRelativePath,
  shouldIgnoreFile
} = require('../../lib/utils/files');

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    stat: jest.fn()
  }
}));

const fs = require('fs');

describe('files utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizePath', () => {
    it('should normalize Unix paths', () => {
      const result = normalizePath('/path/to/file.txt');
      expect(result).toBe('/path/to/file.txt');
    });

    it('should convert Windows paths to Unix style', () => {
      const result = normalizePath('C:\\Users\\path\\file.txt');
      expect(result).toMatch(/Users\/path\/file\.txt$/);
    });

    it('should handle paths with mixed separators', () => {
      const result = normalizePath('path\\to/mixed\\file.txt');
      expect(result).toBe('path/to/mixed/file.txt');
    });
  });

  describe('getRelativePath', () => {
    it('should return relative path from base to file', () => {
      const base = '/Users/project/site';
      const file = '/Users/project/site/content/blog.html';
      const result = getRelativePath(base, file);
      expect(result).toBe('content/blog.html');
    });

    it('should handle files in base directory', () => {
      const base = '/Users/project/site';
      const file = '/Users/project/site/index.html';
      const result = getRelativePath(base, file);
      expect(result).toBe('index.html');
    });

    it('should normalize Windows paths', () => {
      const base = 'C:\\Users\\project\\site';
      const file = 'C:\\Users\\project\\site\\content\\blog.html';
      const result = getRelativePath(base, file);
      expect(result).toBe('content/blog.html');
    });
  });

  describe('shouldIgnoreFile', () => {
    it('should ignore .DS_Store files', () => {
      expect(shouldIgnoreFile('.DS_Store')).toBe(true);
    });

    it('should ignore node_modules directory', () => {
      expect(shouldIgnoreFile('node_modules')).toBe(true);
    });

    it('should ignore .git directory', () => {
      expect(shouldIgnoreFile('.git')).toBe(true);
    });

    it('should ignore hidden files starting with dot', () => {
      expect(shouldIgnoreFile('.env')).toBe(true);
      expect(shouldIgnoreFile('.gitignore')).toBe(true);
    });

    it('should not ignore regular files', () => {
      expect(shouldIgnoreFile('index.html')).toBe(false);
      expect(shouldIgnoreFile('style.css')).toBe(false);
    });

    it('should not ignore files with dots in name', () => {
      expect(shouldIgnoreFile('main.bundle.js')).toBe(false);
    });

    it('should ignore __MACOSX directory', () => {
      expect(shouldIgnoreFile('__MACOSX')).toBe(true);
    });

    it('should ignore Thumbs.db', () => {
      expect(shouldIgnoreFile('Thumbs.db')).toBe(true);
    });
  });

  describe('filterFiles', () => {
    const files = [
      '/project/index.html',
      '/project/style.css',
      '/project/.DS_Store',
      '/project/node_modules/package.json',
      '/project/.git/config',
      '/project/script.js',
      '/project/images/photo.jpg'
    ];

    it('should filter out ignored files', () => {
      const result = filterFiles(files);
      expect(result).toHaveLength(4);
      expect(result).toContain('/project/index.html');
      expect(result).toContain('/project/style.css');
      expect(result).toContain('/project/script.js');
      expect(result).toContain('/project/images/photo.jpg');
    });

    it('should handle empty array', () => {
      const result = filterFiles([]);
      expect(result).toEqual([]);
    });

    it('should filter by extension when provided', () => {
      const result = filterFiles(files, { extensions: ['.html', '.css'] });
      expect(result).toHaveLength(2);
      expect(result).toContain('/project/index.html');
      expect(result).toContain('/project/style.css');
    });

    it('should filter by pattern when provided', () => {
      const result = filterFiles(files, { pattern: /\.js$/ });
      expect(result).toHaveLength(1);
      expect(result).toContain('/project/script.js');
    });

    it('should combine extension and pattern filters', () => {
      const result = filterFiles(files, { 
        extensions: ['.html', '.js'],
        pattern: /script/ 
      });
      expect(result).toHaveLength(1);
      expect(result).toContain('/project/script.js');
    });
  });

  describe('getLocalFiles', () => {
    it('should return array of files in directory', async () => {
      // Mock fs.promises.readdir with proper dirent objects
      fs.promises.readdir.mockResolvedValue([
        { name: 'index.html', isDirectory: () => false },
        { name: 'style.css', isDirectory: () => false }
      ]);

      const result = await getLocalFiles('/project');
      expect(result).toHaveLength(2);
      expect(result).toContain(path.join('/project', 'index.html'));
      expect(result).toContain(path.join('/project', 'style.css'));
    });

    it('should recursively scan subdirectories', async () => {
      fs.promises.readdir
        .mockResolvedValueOnce([
          { name: 'index.html', isDirectory: () => false },
          { name: 'css', isDirectory: () => true }
        ])
        .mockResolvedValueOnce([
          { name: 'style.css', isDirectory: () => false }
        ]);

      const result = await getLocalFiles('/project');
      expect(result).toContain(path.join('/project', 'index.html'));
      expect(result).toContain(path.join('/project', 'css', 'style.css'));
    });

    it('should filter ignored files automatically', async () => {
      fs.promises.readdir.mockResolvedValue([
        { name: 'index.html', isDirectory: () => false },
        { name: '.DS_Store', isDirectory: () => false },
        { name: 'node_modules', isDirectory: () => true }
      ]);

      const result = await getLocalFiles('/project');
      expect(result).toHaveLength(1);
      expect(result).toContain(path.join('/project', 'index.html'));
    });

    it('should handle empty directories', async () => {
      fs.promises.readdir.mockResolvedValue([]);

      const result = await getLocalFiles('/project');
      expect(result).toEqual([]);
    });

    it('should throw error if directory does not exist', async () => {
      fs.promises.readdir.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      await expect(getLocalFiles('/nonexistent')).rejects.toThrow();
    });

    it('should respect maxDepth option', async () => {
      fs.promises.readdir
        .mockResolvedValueOnce([
          { name: 'index.html', isDirectory: () => false },
          { name: 'level1', isDirectory: () => true }
        ]);

      const result = await getLocalFiles('/project', { maxDepth: 1 });
      expect(result).toContain(path.join('/project', 'index.html'));
      // Should not recurse into level1 since maxDepth is 1
      expect(fs.promises.readdir).toHaveBeenCalledTimes(1);
    });
  });
});
