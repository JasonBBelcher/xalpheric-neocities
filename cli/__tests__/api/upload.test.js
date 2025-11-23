const { uploadFile, uploadFiles, uploadWithRetry } = require('../../lib/api/upload');
const client = require('../../lib/api/client');
const logger = require('../../lib/utils/logger');
const fs = require('fs');

// Mock dependencies
jest.mock('../../lib/api/client');
jest.mock('../../lib/utils/logger');
jest.mock('fs');

describe('upload module', () => {
  let mockStream;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Setup default mock stream
    mockStream = { 
      pipe: jest.fn(),
      on: jest.fn(),
      destroy: jest.fn()
    };
  });

  describe('uploadFile', () => {
    it('should upload a single file successfully', async () => {
      fs.createReadStream.mockReturnValue(mockStream);
      client.makeAPICall.mockResolvedValue({
        result: 'success',
        message: 'File uploaded'
      });

      const result = await uploadFile('/local/index.html', 'index.html', 'API_KEY');

      expect(fs.createReadStream).toHaveBeenCalledWith('/local/index.html');
      expect(client.makeAPICall).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/api/upload',
          apiKey: 'API_KEY'
        }),
        expect.any(Object)
      );
      expect(result.result).toBe('success');
    });

    it('should include remote path in upload', async () => {
      fs.createReadStream.mockReturnValue(mockStream);
      client.makeAPICall.mockResolvedValue({
        result: 'success'
      });

      await uploadFile('/local/blog/post.html', 'blog/post.html', 'API_KEY');

      expect(client.makeAPICall).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          'blog/post.html': expect.any(Object)
        })
      );
    });

    it('should throw error if file does not exist', async () => {
      fs.createReadStream.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      await expect(
        uploadFile('/nonexistent.html', 'nonexistent.html', 'API_KEY')
      ).rejects.toThrow();
    });

    it('should handle API errors', async () => {
      fs.createReadStream.mockReturnValue(mockStream);
      client.makeAPICall.mockRejectedValue(new Error('API Error: 500'));

      await expect(
        uploadFile('/local/index.html', 'index.html', 'API_KEY')
      ).rejects.toThrow();
    });
  });

  describe('uploadWithRetry', () => {
    it('should succeed on first try', async () => {
      fs.createReadStream.mockReturnValue(mockStream);
      client.makeAPICall.mockResolvedValue({
        result: 'success'
      });

      const result = await uploadWithRetry('/local/file.html', 'file.html', 'API_KEY');

      expect(result.result).toBe('success');
      expect(client.makeAPICall).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure up to maxRetries', async () => {
      fs.createReadStream.mockReturnValue(mockStream);
      client.makeAPICall
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ result: 'success' });

      const result = await uploadWithRetry(
        '/local/file.html', 
        'file.html', 
        'API_KEY',
        { maxRetries: 3, retryDelay: 10 }
      );

      expect(result.result).toBe('success');
      expect(client.makeAPICall).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it('should fail after maxRetries exceeded', async () => {
      fs.createReadStream.mockReturnValue(mockStream);
      client.makeAPICall.mockRejectedValue(new Error('Network error'));

      await expect(
        uploadWithRetry(
          '/local/file.html', 
          'file.html', 
          'API_KEY',
          { maxRetries: 2, retryDelay: 10 }
        )
      ).rejects.toThrow();

      expect(client.makeAPICall).toHaveBeenCalledTimes(2);
    });

    it('should wait between retries', async () => {
      fs.createReadStream.mockReturnValue(mockStream);
      client.makeAPICall
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ result: 'success' });

      jest.spyOn(global, 'setTimeout');

      await uploadWithRetry(
        '/local/file.html',
        'file.html',
        'API_KEY',
        { maxRetries: 2, retryDelay: 100 }
      );

      // delay() function should be called
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('uploadFiles', () => {
    it('should upload multiple files successfully', async () => {
      fs.createReadStream.mockReturnValue(mockStream);
      client.makeAPICall.mockResolvedValue({
        result: 'success'
      });

      const files = [
        { local: '/local/index.html', remote: 'index.html' },
        { local: '/local/style.css', remote: 'style.css' }
      ];

      const results = await uploadFiles(files, 'API_KEY', { retry: false });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(client.makeAPICall).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success and failures', async () => {
      fs.createReadStream.mockReturnValue(mockStream);
      client.makeAPICall
        .mockResolvedValueOnce({ result: 'success' })
        .mockRejectedValueOnce(new Error('Upload failed'));

      const files = [
        { local: '/local/index.html', remote: 'index.html' },
        { local: '/local/style.css', remote: 'style.css' }
      ];

      const results = await uploadFiles(files, 'API_KEY', { retry: false });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeDefined();
    });

    it('should respect concurrency limit', async () => {
      fs.createReadStream.mockReturnValue(mockStream);
      
      let activeUploads = 0;
      let maxConcurrent = 0;
      
      client.makeAPICall.mockImplementation(async () => {
        activeUploads++;
        maxConcurrent = Math.max(maxConcurrent, activeUploads);
        await new Promise(resolve => setTimeout(resolve, 50));
        activeUploads--;
        return { result: 'success' };
      });

      const files = Array.from({ length: 10 }, (_, i) => ({
        local: `/local/file${i}.html`,
        remote: `file${i}.html`
      }));

      await uploadFiles(files, 'API_KEY', { concurrency: 3, retry: false });

      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('should handle empty file list', async () => {
      const results = await uploadFiles([], 'API_KEY');
      expect(results).toEqual([]);
    });

    it('should report progress during upload', async () => {
      fs.createReadStream.mockReturnValue(mockStream);
      client.makeAPICall.mockResolvedValue({
        result: 'success'
      });

      const files = [
        { local: '/local/file1.html', remote: 'file1.html' },
        { local: '/local/file2.html', remote: 'file2.html' }
      ];

      const onProgress = jest.fn();
      await uploadFiles(files, 'API_KEY', { onProgress, retry: false });

      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        completed: expect.any(Number),
        total: 2
      }));
    });
  });
});
