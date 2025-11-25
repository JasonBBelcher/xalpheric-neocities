const deployMusings = require('../../commands/deploy/musings');
const { getLocalFiles, filterFiles } = require('../../lib/utils/files');
const { listFiles, filterRemoteFiles } = require('../../lib/api/list');
const { uploadFiles } = require('../../lib/api/upload');
const { deleteFiles } = require('../../lib/api/delete');
const logger = require('../../lib/utils/logger');

// Mock dependencies
jest.mock('../../lib/utils/files');
jest.mock('../../lib/api/list');
jest.mock('../../lib/api/upload');
jest.mock('../../lib/api/delete');
jest.mock('../../lib/utils/logger');

describe('deploy musings command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deployMusings', () => {
    it('should deploy new musings HTML files successfully', async () => {
      getLocalFiles.mockResolvedValue([
        '/project/public/musings/post1.html',
        '/project/public/musings/post2.html',
        '/project/public/musings/index.html'
      ]);
      filterFiles.mockImplementation((files) => files);
      
      listFiles.mockResolvedValue([]);
      filterRemoteFiles.mockReturnValue([]);
      
      uploadFiles.mockResolvedValue([
        { file: 'musings/post1.html', success: true },
        { file: 'musings/post2.html', success: true },
        { file: 'musings/index.html', success: true }
      ]);

      const result = await deployMusings('API_KEY', {
        musingsDir: '/project/public/musings'
      });

      expect(getLocalFiles).toHaveBeenCalledWith('/project/public/musings');
      expect(uploadFiles).toHaveBeenCalled();
      expect(result.uploaded).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should skip files that already exist remotely', async () => {
      getLocalFiles.mockResolvedValue([
        '/project/public/musings/post1.html',
        '/project/public/musings/post2.html'
      ]);
      filterFiles.mockImplementation((files) => files);
      
      listFiles.mockResolvedValue([
        { path: 'musings/post1.html', size: 2048, is_directory: false }
      ]);
      filterRemoteFiles.mockReturnValue([
        { path: 'musings/post1.html', size: 2048 }
      ]);
      
      uploadFiles.mockResolvedValue([
        { file: 'musings/post2.html', success: true }
      ]);

      const result = await deployMusings('API_KEY', {
        musingsDir: '/project/public/musings'
      });

      expect(result.uploaded).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should force upload all files when force option is true', async () => {
      getLocalFiles.mockResolvedValue([
        '/project/public/musings/post1.html'
      ]);
      filterFiles.mockImplementation((files) => files);
      
      listFiles.mockResolvedValue([
        { path: 'musings/post1.html', size: 2048, is_directory: false }
      ]);
      filterRemoteFiles.mockReturnValue([
        { path: 'musings/post1.html', size: 2048 }
      ]);
      
      uploadFiles.mockResolvedValue([
        { file: 'musings/post1.html', success: true }
      ]);

      const result = await deployMusings('API_KEY', {
        musingsDir: '/project/public/musings',
        force: true
      });

      expect(result.uploaded).toBe(1);
      expect(result.skipped).toBe(0);
    });

    it('should delete orphaned remote files when deleteOrphans is true', async () => {
      getLocalFiles.mockResolvedValue([
        '/project/public/musings/current-post.html'
      ]);
      filterFiles.mockImplementation((files) => files);
      
      listFiles.mockResolvedValue([
        { path: 'musings/current-post.html', size: 2048, is_directory: false },
        { path: 'musings/old-post.html', size: 1024, is_directory: false }
      ]);
      filterRemoteFiles.mockReturnValue([
        { path: 'musings/current-post.html', size: 2048 },
        { path: 'musings/old-post.html', size: 1024 }
      ]);
      
      uploadFiles.mockResolvedValue([]);

      deleteFiles.mockResolvedValue([
        { files: ['musings/old-post.html'], success: true, count: 1 }
      ]);

      const result = await deployMusings('API_KEY', {
        musingsDir: '/project/public/musings',
        deleteOrphans: true
      });

      expect(deleteFiles).toHaveBeenCalledWith(
        ['musings/old-post.html'],
        'API_KEY',
        expect.any(Object)
      );
      expect(result.deleted).toBe(1);
    });

    it('should handle upload failures gracefully', async () => {
      getLocalFiles.mockResolvedValue([
        '/project/public/musings/post1.html',
        '/project/public/musings/post2.html'
      ]);
      filterFiles.mockImplementation((files) => files);
      
      listFiles.mockResolvedValue([]);
      filterRemoteFiles.mockReturnValue([]);
      
      uploadFiles.mockResolvedValue([
        { file: 'musings/post1.html', success: true },
        { file: 'musings/post2.html', success: false, error: 'Network error' }
      ]);

      const result = await deployMusings('API_KEY', {
        musingsDir: '/project/public/musings'
      });

      expect(result.uploaded).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should respect dryRun option and not upload', async () => {
      getLocalFiles.mockResolvedValue([
        '/project/public/musings/post1.html',
        '/project/public/musings/post2.html'
      ]);
      filterFiles.mockImplementation((files) => files);
      
      listFiles.mockResolvedValue([]);
      filterRemoteFiles.mockReturnValue([]);

      const result = await deployMusings('API_KEY', {
        musingsDir: '/project/public/musings',
        dryRun: true
      });

      expect(uploadFiles).not.toHaveBeenCalled();
      expect(deleteFiles).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
      expect(result.wouldUpload).toBe(2);
    });

    it('should handle empty musings directory', async () => {
      getLocalFiles.mockResolvedValue([]);
      filterFiles.mockReturnValue([]);
      
      listFiles.mockResolvedValue([]);
      filterRemoteFiles.mockReturnValue([]);

      const result = await deployMusings('API_KEY', {
        musingsDir: '/project/public/musings'
      });

      expect(uploadFiles).not.toHaveBeenCalled();
      expect(result.uploaded).toBe(0);
    });

    it('should detect orphaned remote musings', async () => {
      getLocalFiles.mockResolvedValue([
        '/project/public/musings/current.html'
      ]);
      filterFiles.mockImplementation((files) => files);
      
      listFiles.mockResolvedValue([
        { path: 'musings/current.html', size: 2048, is_directory: false },
        { path: 'musings/deleted-locally.html', size: 1024, is_directory: false }
      ]);
      filterRemoteFiles.mockReturnValue([
        { path: 'musings/current.html', size: 2048 },
        { path: 'musings/deleted-locally.html', size: 1024 }
      ]);
      
      uploadFiles.mockResolvedValue([]);

      const result = await deployMusings('API_KEY', {
        musingsDir: '/project/public/musings'
      });

      expect(result.orphanedRemote).toBeDefined();
      expect(result.orphanedRemote.length).toBe(1);
      expect(result.orphanedRemote[0]).toContain('deleted-locally.html');
    });
  });
});
