const { deleteFile, deleteFiles } = require('../../lib/api/delete');
const client = require('../../lib/api/client');
const logger = require('../../lib/utils/logger');

// Mock dependencies
jest.mock('../../lib/api/client');
jest.mock('../../lib/utils/logger');

describe('delete module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteFile', () => {
    it('should delete a single file', async () => {
      client.makeAPICall.mockResolvedValue({
        result: 'success',
        message: 'File deleted'
      });

      const result = await deleteFile('old-page.html', 'API_KEY');

      expect(client.makeAPICall).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/api/delete',
          apiKey: 'API_KEY'
        }),
        expect.objectContaining({
          filenames: ['old-page.html']
        })
      );
      expect(result.result).toBe('success');
    });

    it('should handle API errors', async () => {
      client.makeAPICall.mockRejectedValue(new Error('API Error'));

      await expect(
        deleteFile('file.html', 'API_KEY')
      ).rejects.toThrow('API Error');
    });

    it('should handle non-existent files gracefully', async () => {
      client.makeAPICall.mockResolvedValue({
        result: 'error',
        message: 'File not found'
      });

      const result = await deleteFile('nonexistent.html', 'API_KEY');

      expect(result.result).toBe('error');
    });
  });

  describe('deleteFiles', () => {
    it('should delete multiple files in batches', async () => {
      client.makeAPICall.mockResolvedValue({
        result: 'success'
      });

      const files = ['file1.html', 'file2.html', 'file3.html'];
      const results = await deleteFiles(files, 'API_KEY', { batchSize: 2 });

      // Should be called twice (2 files, then 1 file)
      expect(client.makeAPICall).toHaveBeenCalledTimes(2);
      
      // First batch
      expect(client.makeAPICall).toHaveBeenNthCalledWith(
        1,
        expect.any(Object),
        expect.objectContaining({
          filenames: ['file1.html', 'file2.html']
        })
      );
      
      // Second batch
      expect(client.makeAPICall).toHaveBeenNthCalledWith(
        2,
        expect.any(Object),
        expect.objectContaining({
          filenames: ['file3.html']
        })
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle empty file list', async () => {
      const results = await deleteFiles([], 'API_KEY');

      expect(results).toEqual([]);
      expect(client.makeAPICall).not.toHaveBeenCalled();
    });

    it('should handle mixed success and failures', async () => {
      client.makeAPICall
        .mockResolvedValueOnce({ result: 'success' })
        .mockRejectedValueOnce(new Error('Batch failed'));

      const files = ['file1.html', 'file2.html', 'file3.html', 'file4.html'];
      const results = await deleteFiles(files, 'API_KEY', { batchSize: 2 });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeDefined();
    });

    it('should respect batch size limit', async () => {
      client.makeAPICall.mockResolvedValue({ result: 'success' });

      const files = Array.from({ length: 25 }, (_, i) => `file${i}.html`);
      await deleteFiles(files, 'API_KEY', { batchSize: 10 });

      // Should be called 3 times (10 + 10 + 5)
      expect(client.makeAPICall).toHaveBeenCalledTimes(3);
      
      // Check batch sizes
      expect(client.makeAPICall).toHaveBeenNthCalledWith(
        1,
        expect.any(Object),
        expect.objectContaining({
          filenames: expect.arrayContaining([
            'file0.html', 'file1.html', 'file9.html'
          ])
        })
      );
    });

    it('should use default batch size of 100', async () => {
      client.makeAPICall.mockResolvedValue({ result: 'success' });

      const files = Array.from({ length: 150 }, (_, i) => `file${i}.html`);
      await deleteFiles(files, 'API_KEY');

      // Should be called 2 times (100 + 50)
      expect(client.makeAPICall).toHaveBeenCalledTimes(2);
    });

    it('should report progress during deletion', async () => {
      client.makeAPICall.mockResolvedValue({ result: 'success' });

      const files = ['file1.html', 'file2.html', 'file3.html'];
      const onProgress = jest.fn();
      
      await deleteFiles(files, 'API_KEY', { 
        batchSize: 2,
        onProgress 
      });

      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        completed: expect.any(Number),
        total: expect.any(Number)
      }));
    });

    it('should handle single file deletion', async () => {
      client.makeAPICall.mockResolvedValue({ result: 'success' });

      const files = ['single-file.html'];
      const results = await deleteFiles(files, 'API_KEY');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(client.makeAPICall).toHaveBeenCalledTimes(1);
    });
  });
});
