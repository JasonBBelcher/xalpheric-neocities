const deployMusic = require('../../commands/deploy/music');
const { loadJsonConfig } = require('../../lib/utils/config');
const { getLocalFiles, filterFiles } = require('../../lib/utils/files');
const { listFiles, filterRemoteFiles } = require('../../lib/api/list');
const { uploadFiles } = require('../../lib/api/upload');
const { deleteFiles } = require('../../lib/api/delete');
const logger = require('../../lib/utils/logger');

// Mock dependencies
jest.mock('../../lib/utils/config');
jest.mock('../../lib/utils/files');
jest.mock('../../lib/api/list');
jest.mock('../../lib/api/upload');
jest.mock('../../lib/api/delete');
jest.mock('../../lib/utils/logger');

describe('deploy music command', () => {
  const mockConfig = {
    releases: [
      { audio: 'public/music/track1.mp3', title: 'Track 1' },
      { audio: 'public/music/track2.mp3', title: 'Track 2' }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deployMusic', () => {
    it('should deploy new music files successfully', async () => {
      loadJsonConfig.mockReturnValue(mockConfig);
      getLocalFiles.mockResolvedValue([
        '/project/public/music/track1.mp3',
        '/project/public/music/track2.mp3'
      ]);
      filterFiles.mockImplementation((files) => files);
      
      listFiles.mockResolvedValue([]);
      filterRemoteFiles.mockReturnValue([]);
      
      uploadFiles.mockResolvedValue([
        { file: 'music/track1.mp3', success: true },
        { file: 'music/track2.mp3', success: true }
      ]);

      const result = await deployMusic('API_KEY', {
        musicDir: '/project/public/music',
        configFile: '/project/public/config/releases.json'
      });

      expect(loadJsonConfig).toHaveBeenCalledWith('/project/public/config/releases.json');
      expect(getLocalFiles).toHaveBeenCalledWith('/project/public/music');
      expect(uploadFiles).toHaveBeenCalled();
      expect(result.uploaded).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should skip files that already exist remotely', async () => {
      loadJsonConfig.mockReturnValue(mockConfig);
      getLocalFiles.mockResolvedValue([
        '/project/public/music/track1.mp3',
        '/project/public/music/track2.mp3'
      ]);
      filterFiles.mockImplementation((files) => files);
      
      listFiles.mockResolvedValue([
        { path: 'music/track1.mp3', size: 1024, is_directory: false }
      ]);
      filterRemoteFiles.mockReturnValue([
        { path: 'music/track1.mp3', size: 1024 }
      ]);
      
      uploadFiles.mockResolvedValue([
        { file: 'music/track2.mp3', success: true }
      ]);

      const result = await deployMusic('API_KEY', {
        musicDir: '/project/public/music',
        configFile: '/project/public/config/releases.json'
      });

      expect(uploadFiles).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ remote: 'music/track2.mp3' })
        ]),
        'API_KEY',
        expect.any(Object)
      );
      expect(result.uploaded).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should force upload all files when force option is true', async () => {
      loadJsonConfig.mockReturnValue(mockConfig);
      getLocalFiles.mockResolvedValue([
        '/project/public/music/track1.mp3',
        '/project/public/music/track2.mp3'
      ]);
      filterFiles.mockImplementation((files) => files);
      
      listFiles.mockResolvedValue([
        { path: 'music/track1.mp3', size: 1024, is_directory: false }
      ]);
      filterRemoteFiles.mockReturnValue([
        { path: 'music/track1.mp3', size: 1024 }
      ]);
      
      uploadFiles.mockResolvedValue([
        { file: 'music/track1.mp3', success: true },
        { file: 'music/track2.mp3', success: true }
      ]);

      const result = await deployMusic('API_KEY', {
        musicDir: '/project/public/music',
        configFile: '/project/public/config/releases.json',
        force: true
      });

      expect(uploadFiles).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ remote: 'music/track1.mp3' }),
          expect.objectContaining({ remote: 'music/track2.mp3' })
        ]),
        'API_KEY',
        expect.any(Object)
      );
      expect(result.uploaded).toBe(2);
    });

    it('should detect orphaned local files not in config', async () => {
      loadJsonConfig.mockReturnValue(mockConfig);
      getLocalFiles.mockResolvedValue([
        '/project/public/music/track1.mp3',
        '/project/public/music/track2.mp3',
        '/project/public/music/orphan.mp3'
      ]);
      filterFiles.mockImplementation((files) => files);
      
      listFiles.mockResolvedValue([]);
      filterRemoteFiles.mockReturnValue([]);
      
      uploadFiles.mockResolvedValue([
        { file: 'music/track1.mp3', success: true },
        { file: 'music/track2.mp3', success: true }
      ]);

      const result = await deployMusic('API_KEY', {
        musicDir: '/project/public/music',
        configFile: '/project/public/config/releases.json'
      });

      expect(result.orphanedLocal).toBeDefined();
      expect(result.orphanedLocal.length).toBe(1);
      expect(result.orphanedLocal[0]).toContain('orphan.mp3');
    });

    it('should detect orphaned remote files not in config', async () => {
      loadJsonConfig.mockReturnValue(mockConfig);
      getLocalFiles.mockResolvedValue([
        '/project/public/music/track1.mp3',
        '/project/public/music/track2.mp3'
      ]);
      filterFiles.mockImplementation((files) => files);
      
      listFiles.mockResolvedValue([
        { path: 'music/track1.mp3', size: 1024, is_directory: false },
        { path: 'music/old-track.mp3', size: 2048, is_directory: false }
      ]);
      filterRemoteFiles.mockReturnValue([
        { path: 'music/track1.mp3', size: 1024 },
        { path: 'music/old-track.mp3', size: 2048 }
      ]);
      
      uploadFiles.mockResolvedValue([
        { file: 'music/track2.mp3', success: true }
      ]);

      const result = await deployMusic('API_KEY', {
        musicDir: '/project/public/music',
        configFile: '/project/public/config/releases.json'
      });

      expect(result.orphanedRemote).toBeDefined();
      expect(result.orphanedRemote.length).toBe(1);
      expect(result.orphanedRemote[0]).toContain('old-track.mp3');
    });

    it('should delete orphaned remote files when deleteOrphans is true', async () => {
      loadJsonConfig.mockReturnValue(mockConfig);
      getLocalFiles.mockResolvedValue([
        '/project/public/music/track1.mp3',
        '/project/public/music/track2.mp3'
      ]);
      filterFiles.mockImplementation((files) => files);
      
      listFiles.mockResolvedValue([
        { path: 'music/old-track.mp3', size: 2048, is_directory: false }
      ]);
      filterRemoteFiles.mockReturnValue([
        { path: 'music/old-track.mp3', size: 2048 }
      ]);
      
      uploadFiles.mockResolvedValue([
        { file: 'music/track1.mp3', success: true },
        { file: 'music/track2.mp3', success: true }
      ]);

      deleteFiles.mockResolvedValue([
        { files: ['music/old-track.mp3'], success: true, count: 1 }
      ]);

      const result = await deployMusic('API_KEY', {
        musicDir: '/project/public/music',
        configFile: '/project/public/config/releases.json',
        deleteOrphans: true
      });

      expect(deleteFiles).toHaveBeenCalledWith(
        ['music/old-track.mp3'],
        'API_KEY',
        expect.any(Object)
      );
      expect(result.deleted).toBe(1);
    });

    it('should handle missing config file gracefully', async () => {
      loadJsonConfig.mockImplementation(() => {
        throw new Error('Config file not found');
      });

      await expect(
        deployMusic('API_KEY', {
          musicDir: '/project/public/music',
          configFile: '/project/public/config/missing.json'
        })
      ).rejects.toThrow('Config file not found');
    });

    it('should detect missing local files referenced in config', async () => {
      loadJsonConfig.mockReturnValue(mockConfig);
      getLocalFiles.mockResolvedValue([
        '/project/public/music/track1.mp3'
        // track2.mp3 is missing
      ]);
      filterFiles.mockImplementation((files) => files);

      await expect(
        deployMusic('API_KEY', {
          musicDir: '/project/public/music',
          configFile: '/project/public/config/releases.json'
        })
      ).rejects.toThrow(/missing.*track2\.mp3/i);
    });

    it('should handle upload failures gracefully', async () => {
      loadJsonConfig.mockReturnValue(mockConfig);
      getLocalFiles.mockResolvedValue([
        '/project/public/music/track1.mp3',
        '/project/public/music/track2.mp3'
      ]);
      filterFiles.mockImplementation((files) => files);
      
      listFiles.mockResolvedValue([]);
      filterRemoteFiles.mockReturnValue([]);
      
      uploadFiles.mockResolvedValue([
        { file: 'music/track1.mp3', success: true },
        { file: 'music/track2.mp3', success: false, error: 'Network error' }
      ]);

      const result = await deployMusic('API_KEY', {
        musicDir: '/project/public/music',
        configFile: '/project/public/config/releases.json'
      });

      expect(result.uploaded).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should respect dryRun option and not upload', async () => {
      loadJsonConfig.mockReturnValue(mockConfig);
      getLocalFiles.mockResolvedValue([
        '/project/public/music/track1.mp3',
        '/project/public/music/track2.mp3'
      ]);
      filterFiles.mockImplementation((files) => files);
      
      listFiles.mockResolvedValue([]);
      filterRemoteFiles.mockReturnValue([]);

      const result = await deployMusic('API_KEY', {
        musicDir: '/project/public/music',
        configFile: '/project/public/config/releases.json',
        dryRun: true
      });

      expect(uploadFiles).not.toHaveBeenCalled();
      expect(deleteFiles).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
      expect(result.wouldUpload).toBe(2);
    });
  });
});
