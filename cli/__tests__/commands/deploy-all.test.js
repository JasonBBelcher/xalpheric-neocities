const deployAll = require('../../commands/deploy/all');
const deployConfig = require('../../commands/deploy/config');
const deployMusic = require('../../commands/deploy/music');
const deployMusings = require('../../commands/deploy/musings');
const deployDrumMachine = require('../../commands/deploy/drum-machine');
const logger = require('../../lib/utils/logger');

// Mock dependencies
jest.mock('../../commands/deploy/config');
jest.mock('../../commands/deploy/music');
jest.mock('../../commands/deploy/musings');
jest.mock('../../commands/deploy/drum-machine');
jest.mock('../../lib/utils/logger');

describe('deploy all command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deployAll', () => {
    it('should run all deployment commands in sequence', async () => {
      deployConfig.mockResolvedValue({ uploaded: 2, failed: 0 });
      deployMusic.mockResolvedValue({ uploaded: 5, failed: 0 });
      deployMusings.mockResolvedValue({ uploaded: 3, failed: 0 });
      deployDrumMachine.mockResolvedValue({ uploaded: 10, failed: 0 });

      const result = await deployAll('API_KEY');

      expect(deployConfig).toHaveBeenCalledWith('API_KEY', expect.any(Object));
      expect(deployMusic).toHaveBeenCalledWith('API_KEY', expect.any(Object));
      expect(deployMusings).toHaveBeenCalledWith('API_KEY', expect.any(Object));
      expect(deployDrumMachine).toHaveBeenCalledWith('API_KEY', expect.any(Object));
      
      expect(result.totalUploaded).toBe(20);
      expect(result.totalFailed).toBe(0);
    });

    it('should deploy in correct order: config -> music -> musings -> drum-machine', async () => {
      const callOrder = [];
      
      deployConfig.mockImplementation(async () => {
        callOrder.push('config');
        return { uploaded: 2, failed: 0 };
      });
      deployMusic.mockImplementation(async () => {
        callOrder.push('music');
        return { uploaded: 5, failed: 0 };
      });
      deployMusings.mockImplementation(async () => {
        callOrder.push('musings');
        return { uploaded: 3, failed: 0 };
      });
      deployDrumMachine.mockImplementation(async () => {
        callOrder.push('drum-machine');
        return { uploaded: 10, failed: 0 };
      });

      await deployAll('API_KEY');

      expect(callOrder).toEqual(['config', 'music', 'musings', 'drum-machine']);
    });

    it('should continue even if one deployment fails', async () => {
      deployConfig.mockResolvedValue({ uploaded: 2, failed: 0 });
      deployMusic.mockRejectedValue(new Error('Music deployment failed'));
      deployMusings.mockResolvedValue({ uploaded: 3, failed: 0 });
      deployDrumMachine.mockResolvedValue({ uploaded: 10, failed: 0 });

      const result = await deployAll('API_KEY', { continueOnError: true });

      expect(deployConfig).toHaveBeenCalled();
      expect(deployMusings).toHaveBeenCalled();
      expect(deployDrumMachine).toHaveBeenCalled();
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('music');
    });

    it('should stop on first error if continueOnError is false', async () => {
      deployConfig.mockResolvedValue({ uploaded: 2, failed: 0 });
      deployMusic.mockRejectedValue(new Error('Music deployment failed'));

      await expect(
        deployAll('API_KEY', { continueOnError: false })
      ).rejects.toThrow('Music deployment failed');

      expect(deployConfig).toHaveBeenCalled();
      expect(deployMusings).not.toHaveBeenCalled();
      expect(deployDrumMachine).not.toHaveBeenCalled();
    });

    it('should respect dryRun option', async () => {
      deployConfig.mockResolvedValue({ dryRun: true, wouldUpload: 2 });
      deployMusic.mockResolvedValue({ dryRun: true, wouldUpload: 5 });
      deployMusings.mockResolvedValue({ dryRun: true, wouldUpload: 3 });
      deployDrumMachine.mockResolvedValue({ dryRun: true, wouldUpload: 10 });

      const result = await deployAll('API_KEY', { dryRun: true });

      expect(deployConfig).toHaveBeenCalledWith('API_KEY', expect.objectContaining({ dryRun: true }));
      expect(result.dryRun).toBe(true);
    });

    it('should pass verbose flag to all commands', async () => {
      deployConfig.mockResolvedValue({ uploaded: 2, failed: 0 });
      deployMusic.mockResolvedValue({ uploaded: 5, failed: 0 });
      deployMusings.mockResolvedValue({ uploaded: 3, failed: 0 });
      deployDrumMachine.mockResolvedValue({ uploaded: 10, failed: 0 });

      await deployAll('API_KEY', { verbose: true });

      expect(deployConfig).toHaveBeenCalledWith('API_KEY', expect.objectContaining({ verbose: true }));
      expect(deployMusic).toHaveBeenCalledWith('API_KEY', expect.objectContaining({ verbose: true }));
      expect(deployMusings).toHaveBeenCalledWith('API_KEY', expect.objectContaining({ verbose: true }));
      expect(deployDrumMachine).toHaveBeenCalledWith('API_KEY', expect.objectContaining({ verbose: true }));
    });

    it('should report summary statistics', async () => {
      deployConfig.mockResolvedValue({ uploaded: 2, failed: 0 });
      deployMusic.mockResolvedValue({ uploaded: 5, failed: 1 });
      deployMusings.mockResolvedValue({ uploaded: 3, failed: 0 });
      deployDrumMachine.mockResolvedValue({ uploaded: 10, failed: 2 });

      const result = await deployAll('API_KEY');

      expect(result.totalUploaded).toBe(20);
      expect(result.totalFailed).toBe(3);
      expect(result.deployments).toHaveLength(4);
    });

    it('should allow skipping specific deployments', async () => {
      deployConfig.mockResolvedValue({ uploaded: 2, failed: 0 });
      deployMusic.mockResolvedValue({ uploaded: 5, failed: 0 });
      deployMusings.mockResolvedValue({ uploaded: 3, failed: 0 });

      await deployAll('API_KEY', { skip: ['drum-machine'] });

      expect(deployConfig).toHaveBeenCalled();
      expect(deployMusic).toHaveBeenCalled();
      expect(deployMusings).toHaveBeenCalled();
      expect(deployDrumMachine).not.toHaveBeenCalled();
    });
  });
});
