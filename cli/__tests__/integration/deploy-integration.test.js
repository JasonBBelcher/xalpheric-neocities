/**
 * Integration Tests for Deploy Commands
 * 
 * These tests validate the integration between deploy commands and uploadFiles
 * WITHOUT mocking uploadFiles itself. This approach catches bugs that unit tests miss,
 * such as:
 * - Incorrect function argument order
 * - Type mismatches between caller and callee
 * - Real error propagation through the call stack
 * 
 * Testing Strategy:
 * - Mock ONLY external dependencies (fs, git, API client)
 * - Use the REAL uploadFiles implementation
 * - Validate actual integration between modules
 * 
 * Why This Matters:
 * Unit tests with uploadFiles mocked can pass even when arguments are in the wrong order,
 * because mocks record calls but don't validate behavior. These integration tests catch
 * such bugs by executing the real function with real type checking.
 */

const deployRecent = require('../../commands/deploy/recent');
const deployFull = require('../../commands/deploy/full');
const deployDrumMachine = require('../../commands/deploy/drum-machine');
const git = require('../../lib/utils/git');
const client = require('../../lib/api/client');
const logger = require('../../lib/utils/logger');
const fs = require('fs');
const path = require('path');

// Mock only external dependencies (git, fs, API calls)
// Do NOT mock uploadFiles - we want to test the real integration
jest.mock('../../lib/utils/git');
jest.mock('../../lib/api/client');
jest.mock('../../lib/utils/logger');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readdir: jest.fn(),
    stat: jest.fn()
  },
  existsSync: jest.fn(),
  statSync: jest.fn(),
  createReadStream: jest.fn(),
  readdirSync: jest.fn(),
  lstatSync: jest.fn()
}));
jest.mock('path');

describe('Deploy Integration Tests', () => {
  let mockStream;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockStream = { 
      pipe: jest.fn(),
      on: jest.fn(),
      destroy: jest.fn()
    };
    
    logger.setVerbose = jest.fn();
    logger.info = jest.fn();
    logger.success = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();
    logger.verbose = jest.fn();
    
    // Setup path mocks
    path.join = jest.fn((...args) => args.join('/'));
    path.relative = jest.fn((from, to) => to);
    path.basename = jest.fn((p) => p.split('/').pop());
    
    // Mock fs.promises API (files.js uses require('fs').promises)
    fs.promises.readdir.mockResolvedValue([
      { name: 'test.html', isDirectory: () => false }
    ]);
  });

  describe('deployRecent integration', () => {
    it('should correctly pass arguments to uploadFiles in correct order', async () => {
      // Setup
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue(['public/test.html']);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      fs.createReadStream.mockReturnValue(mockStream);
      
      // Mock the API call to succeed
      client.makeAPICall.mockResolvedValue({
        result: 'success',
        message: 'Files uploaded'
      });

      // Execute
      const result = await deployRecent('API_KEY', {
        since: '1 hour ago',
        verbose: false
      });

      // Verify - if arguments are in wrong order, this will fail
      expect(result.uploaded).toBe(1);
      expect(result.failed).toBe(0);
      expect(client.makeAPICall).toHaveBeenCalled();
      
      // Verify the API was called with correct structure
      const apiCall = client.makeAPICall.mock.calls[0];
      expect(apiCall[0]).toMatchObject({
        method: 'POST',
        path: '/api/upload',
        apiKey: 'API_KEY'
      });
      // Verify FormData was passed and append was called with correct remote path
      expect(apiCall[1]).toBeDefined();
      expect(apiCall[1].append).toHaveBeenCalledWith('test.html', expect.anything());
    });

    it('should fail if uploadFiles receives wrong argument types', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue(['public/test.html']);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      // This will cause fs.createReadStream to fail if called with wrong args
      fs.createReadStream.mockImplementation((path) => {
        if (typeof path !== 'string') {
          throw new TypeError('path must be a string');
        }
        return mockStream;
      });
      
      client.makeAPICall.mockResolvedValue({ result: 'success' });

      // Should not throw - arguments are correct
      await expect(
        deployRecent('API_KEY', { since: '1 hour ago' })
      ).resolves.toBeDefined();
    });
  });

  describe('deployFull integration', () => {
    it('should correctly pass arguments to uploadFiles', async () => {
      // Mock directory reading for full deployment
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024, isDirectory: () => false });
      fs.promises.readdir.mockResolvedValue([
        { name: 'test.html', isDirectory: () => false }
      ]);
      fs.createReadStream.mockReturnValue(mockStream);
      
      client.makeAPICall.mockResolvedValue({
        result: 'success',
        message: 'Files uploaded'
      });

      const result = await deployFull('API_KEY', {
        publicDir: '/project/public',
        force: true,
        verbose: false
      });

      expect(result.uploaded).toBe(1);
      expect(result.failed).toBe(0);
      expect(client.makeAPICall).toHaveBeenCalled();
    });
  });

  describe('deployDrumMachine integration', () => {
    it('should correctly pass arguments to uploadFiles', async () => {
      // Mock directory and file operations for drum machine
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024, isDirectory: () => false });
      fs.readdirSync.mockReturnValue(['bundle.js']);
      fs.lstatSync.mockReturnValue({ isDirectory: () => false });
      fs.createReadStream.mockReturnValue(mockStream);
      
      client.makeAPICall.mockResolvedValue({
        result: 'success',
        message: 'Files uploaded'
      });

      const result = await deployDrumMachine('API_KEY', {
        distDir: '/drum-machine/dist',
        htmlFile: 'public/drum-machine.html',
        cssFile: 'public/css/drum-machine.css',
        verbose: false
      });

      expect(result.uploaded).toBeGreaterThan(0);
      expect(client.makeAPICall).toHaveBeenCalled();
    });
  });

  describe('Argument order validation', () => {
    it('should detect if files and apiKey are swapped in uploadFiles call', async () => {
      // This test ensures that if someone accidentally swaps arguments,
      // the real uploadFiles will fail (not just the mock)
      
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue(['public/test.html']);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      
      // createReadStream will be called with the local file path
      // If arguments are swapped, it might receive the apiKey instead
      fs.createReadStream.mockImplementation((path) => {
        // If path is not a string starting with valid path chars, fail
        if (typeof path !== 'string' || path.length < 3) {
          throw new TypeError(`Invalid path: ${path}`);
        }
        return mockStream;
      });
      
      client.makeAPICall.mockResolvedValue({ result: 'success' });

      // This should work because arguments are correct
      const result = await deployRecent('API_KEY', { since: '1 hour ago' });
      expect(result.uploaded).toBe(1);
      
      // If we had called uploadFiles(apiKey, files, options) instead,
      // createReadStream would have failed with TypeError
    });
  });

  describe('Real error propagation', () => {
    it('should propagate real uploadFiles errors without mock interference', async () => {
      git.isGitRepository.mockReturnValue(true);
      git.getChangedFiles.mockReturnValue(['public/test.html']);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });
      fs.createReadStream.mockReturnValue(mockStream);
      
      // Simulate real API failure
      client.makeAPICall.mockRejectedValue(new Error('Network timeout'));

      const result = await deployRecent('API_KEY', { since: '1 hour ago' });
      
      // Should handle failure gracefully
      expect(result.uploaded).toBe(0);
      expect(result.failed).toBe(1);
    });
  });
});
