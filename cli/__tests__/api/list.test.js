const { listFiles, filterRemoteFiles } = require('../../lib/api/list');
const client = require('../../lib/api/client');

// Mock dependencies
jest.mock('../../lib/api/client');

describe('list module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listFiles', () => {
    it('should fetch list of files from Neocities', async () => {
      client.makeAPICall.mockResolvedValue({
        result: 'success',
        files: [
          {
            path: 'index.html',
            is_directory: false,
            size: 1024,
            updated_at: '2025-01-01T00:00:00Z'
          },
          {
            path: 'style.css',
            is_directory: false,
            size: 512,
            updated_at: '2025-01-01T00:00:00Z'
          }
        ]
      });

      const result = await listFiles('API_KEY');

      expect(client.makeAPICall).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/list',
        apiKey: 'API_KEY'
      });
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('index.html');
      expect(result[1].path).toBe('style.css');
    });

    it('should handle API errors', async () => {
      client.makeAPICall.mockRejectedValue(new Error('API Error'));

      await expect(listFiles('API_KEY')).rejects.toThrow('API Error');
    });

    it('should return empty array if no files', async () => {
      client.makeAPICall.mockResolvedValue({
        result: 'success',
        files: []
      });

      const result = await listFiles('API_KEY');

      expect(result).toEqual([]);
    });

    it('should handle directory path parameter', async () => {
      client.makeAPICall.mockResolvedValue({
        result: 'success',
        files: [
          {
            path: 'blog/post.html',
            is_directory: false,
            size: 2048,
            updated_at: '2025-01-01T00:00:00Z'
          }
        ]
      });

      const result = await listFiles('API_KEY', { path: 'blog' });

      expect(client.makeAPICall).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/list?path=blog',
        apiKey: 'API_KEY'
      });
      expect(result[0].path).toBe('blog/post.html');
    });
  });

  describe('filterRemoteFiles', () => {
    const files = [
      { path: 'index.html', is_directory: false, size: 1024 },
      { path: 'style.css', is_directory: false, size: 512 },
      { path: 'script.js', is_directory: false, size: 256 },
      { path: 'images/', is_directory: true, size: 0 },
      { path: 'images/photo.jpg', is_directory: false, size: 5120 }
    ];

    it('should filter by file extension', () => {
      const result = filterRemoteFiles(files, { extensions: ['.html', '.css'] });

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('index.html');
      expect(result[1].path).toBe('style.css');
    });

    it('should filter by pattern', () => {
      const result = filterRemoteFiles(files, { pattern: /^images\// });

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('images/');
      expect(result[1].path).toBe('images/photo.jpg');
    });

    it('should filter out directories when filesOnly is true', () => {
      const result = filterRemoteFiles(files, { filesOnly: true });

      expect(result).toHaveLength(4);
      expect(result.every(f => !f.is_directory)).toBe(true);
    });

    it('should filter by size', () => {
      const result = filterRemoteFiles(files, { 
        minSize: 500,
        maxSize: 2000 
      });

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('index.html');
      expect(result[1].path).toBe('style.css');
    });

    it('should combine multiple filters', () => {
      const result = filterRemoteFiles(files, {
        extensions: ['.html', '.css', '.js'],
        minSize: 300,
        filesOnly: true
      });

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('index.html');
      expect(result[1].path).toBe('style.css');
    });

    it('should return all files when no filters provided', () => {
      const result = filterRemoteFiles(files);

      expect(result).toHaveLength(5);
    });

    it('should handle empty array', () => {
      const result = filterRemoteFiles([]);

      expect(result).toEqual([]);
    });
  });
});
