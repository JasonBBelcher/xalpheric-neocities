const { execSync } = require('child_process');
const processVideos = require('../videos');
const { PRESETS } = require('../videos');
const { checkDependencies, DEPENDENCIES } = require('../../../lib/media/dependencies');

// Mock modules
jest.mock('child_process');
jest.mock('../../../lib/media/dependencies');

describe('Process Videos Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default: dependencies satisfied
    checkDependencies.mockResolvedValue(undefined);
    
    // Default: execSync succeeds
    execSync.mockReturnValue(Buffer.from(''));
    
    // Mock DEPENDENCIES
    DEPENDENCIES.ffmpeg = { commands: ['ffmpeg'], description: 'FFmpeg' };
    DEPENDENCIES.ffprobe = { commands: ['ffprobe'], description: 'FFprobe' };
    DEPENDENCIES.jq = { commands: ['jq'], description: 'jq' };
  });

  describe('presets', () => {
    it('should have web-mp4 preset', () => {
      expect(PRESETS['web-mp4']).toBeDefined();
      expect(PRESETS['web-mp4'].description).toBeTruthy();
      expect(PRESETS['web-mp4'].getConversions).toBeInstanceOf(Function);
    });

    it('should have extract-audio preset', () => {
      expect(PRESETS['extract-audio']).toBeDefined();
      expect(PRESETS['extract-audio'].description).toBeTruthy();
    });

    it('should have web-ready preset', () => {
      expect(PRESETS['web-ready']).toBeDefined();
      expect(PRESETS['web-ready'].description).toBeTruthy();
    });

    it('should have gif preset', () => {
      expect(PRESETS['gif']).toBeDefined();
      expect(PRESETS['gif'].description).toBeTruthy();
    });

    describe('web-mp4 preset', () => {
      it('should generate MP4 conversion', () => {
        const conversions = PRESETS['web-mp4'].getConversions('video.MOV', 'video');
        
        expect(conversions).toEqual([
          { inputName: 'video.MOV', outputName: 'video.mp4' }
        ]);
      });
    });

    describe('extract-audio preset', () => {
      it('should generate MP3 conversion', () => {
        const conversions = PRESETS['extract-audio'].getConversions('video.mp4', 'audio');
        
        expect(conversions).toEqual([
          { inputName: 'video.mp4', outputName: 'audio.mp3' }
        ]);
      });
    });

    describe('web-ready preset', () => {
      it('should generate both MP4 and MP3 conversions', () => {
        const conversions = PRESETS['web-ready'].getConversions('source.MOV', 'output');
        
        expect(conversions).toEqual([
          { inputName: 'source.MOV', outputName: 'output.mp4' },
          { inputName: 'source.MOV', outputName: 'output.mp3' }
        ]);
      });
    });

    describe('gif preset', () => {
      it('should generate GIF conversion', () => {
        const conversions = PRESETS['gif'].getConversions('video.mp4', 'animation');
        
        expect(conversions).toEqual([
          { inputName: 'video.mp4', outputName: 'animation.gif' }
        ]);
      });
    });
  });

  describe('parameter validation', () => {
    it('should throw error when neither conversions nor preset provided', async () => {
      await expect(
        processVideos({})
      ).rejects.toThrow('Either conversions JSON or preset with input file required');
    });

    it('should throw error when preset used without input file', async () => {
      await expect(
        processVideos({ preset: 'web-mp4' })
      ).rejects.toThrow('Input file required when using preset');
    });

    it('should throw error for unknown preset', async () => {
      await expect(
        processVideos({ preset: 'unknown', input: 'video.mp4' })
      ).rejects.toThrow('Unknown preset "unknown"');
    });

    it('should accept valid preset with input', async () => {
      const result = await processVideos({
        preset: 'web-mp4',
        input: 'video.MOV'
      });

      expect(result.success).toBe(true);
      expect(result.preset).toBe('web-mp4');
    });

    it('should accept conversions JSON', async () => {
      const conversions = JSON.stringify([
        { inputName: 'input.MOV', outputName: 'output.mp4' }
      ]);

      const result = await processVideos({ conversions });

      expect(result.success).toBe(true);
      expect(result.conversions).toHaveLength(1);
    });
  });

  describe('conversions JSON validation', () => {
    it('should throw error for invalid JSON', async () => {
      await expect(
        processVideos({ conversions: 'not-valid-json' })
      ).rejects.toThrow('Invalid conversions JSON');
    });

    it('should throw error when conversions is not an array', async () => {
      await expect(
        processVideos({ conversions: '{"inputName": "test"}' })
      ).rejects.toThrow('Conversions must be an array');
    });

    it('should throw error when conversion missing inputName', async () => {
      const conversions = JSON.stringify([
        { outputName: 'output.mp4' }
      ]);

      await expect(
        processVideos({ conversions })
      ).rejects.toThrow('missing inputName or outputName');
    });

    it('should throw error when conversion missing outputName', async () => {
      const conversions = JSON.stringify([
        { inputName: 'input.MOV' }
      ]);

      await expect(
        processVideos({ conversions })
      ).rejects.toThrow('missing inputName or outputName');
    });

    it('should accept valid conversions array', async () => {
      const conversions = JSON.stringify([
        { inputName: 'video1.MOV', outputName: 'video1.mp4' },
        { inputName: 'video2.MOV', outputName: 'video2.mp4' }
      ]);

      const result = await processVideos({ conversions });

      expect(result.success).toBe(true);
      expect(result.conversions).toHaveLength(2);
    });
  });

  describe('dependency checking', () => {
    it('should check for FFmpeg, FFprobe, and jq', async () => {
      await processVideos({
        preset: 'web-mp4',
        input: 'video.MOV'
      });

      expect(checkDependencies).toHaveBeenCalledWith(
        [DEPENDENCIES.ffmpeg, DEPENDENCIES.ffprobe, DEPENDENCIES.jq],
        expect.objectContaining({
          autoInstall: true,
          required: true
        })
      );
    });

    it('should fail when dependencies are not satisfied', async () => {
      checkDependencies.mockRejectedValue(new Error('FFmpeg not found'));

      await expect(
        processVideos({
          preset: 'web-mp4',
          input: 'video.MOV'
        })
      ).rejects.toThrow('FFmpeg not found');
    });
  });

  describe('script execution with presets', () => {
    it('should execute script with web-mp4 preset', async () => {
      await processVideos({
        preset: 'web-mp4',
        input: 'video.MOV'
      });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('[{"inputName":"video.MOV","outputName":"video.mp4"}]'),
        expect.any(Object)
      );
    });

    it('should execute script with extract-audio preset', async () => {
      await processVideos({
        preset: 'extract-audio',
        input: 'video.mp4'
      });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('[{"inputName":"video.mp4","outputName":"video.mp3"}]'),
        expect.any(Object)
      );
    });

    it('should execute script with web-ready preset', async () => {
      await processVideos({
        preset: 'web-ready',
        input: 'source.MOV'
      });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('"outputName":"source.mp4"'),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('"outputName":"source.mp3"'),
        expect.any(Object)
      );
    });

    it('should execute script with gif preset', async () => {
      await processVideos({
        preset: 'gif',
        input: 'video.mp4'
      });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('[{"inputName":"video.mp4","outputName":"video.gif"}]'),
        expect.any(Object)
      );
    });

    it('should use custom script path when provided', async () => {
      await processVideos({
        preset: 'web-mp4',
        input: 'video.MOV',
        scriptPath: 'custom/path/script.sh'
      });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('./script.sh'),
        expect.objectContaining({
          cwd: expect.stringContaining('custom/path')
        })
      );
    });
  });

  describe('script execution with manual conversions', () => {
    it('should execute script with single conversion', async () => {
      const conversions = JSON.stringify([
        { inputName: 'input.MOV', outputName: 'output.mp4' }
      ]);

      await processVideos({ conversions });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining(conversions),
        expect.any(Object)
      );
    });

    it('should execute script with multiple conversions', async () => {
      const conversions = JSON.stringify([
        { inputName: 'video1.MOV', outputName: 'video1.mp4' },
        { inputName: 'video2.MOV', outputName: 'video2.webm' },
        { inputName: 'video3.MOV', outputName: 'video3.mp3' }
      ]);

      await processVideos({ conversions });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining(conversions),
        expect.any(Object)
      );
    });

    it('should handle complex file paths in conversions', async () => {
      const conversions = JSON.stringify([
        { inputName: 'path/to/video.MOV', outputName: 'output/video.mp4' }
      ]);

      await processVideos({ conversions });

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('path/to/video.MOV'),
        expect.any(Object)
      );
    });
  });

  describe('stdio handling', () => {
    it('should inherit stdio when verbose is true', async () => {
      await processVideos({
        preset: 'web-mp4',
        input: 'video.MOV',
        verbose: true
      });

      expect(execSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          stdio: 'inherit'
        })
      );
    });

    it('should pipe stdio when verbose is false', async () => {
      await processVideos({
        preset: 'web-mp4',
        input: 'video.MOV',
        verbose: false
      });

      expect(execSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          stdio: 'pipe'
        })
      );
    });
  });

  describe('return values', () => {
    it('should return success status with preset', async () => {
      const result = await processVideos({
        preset: 'web-mp4',
        input: 'video.MOV'
      });

      expect(result).toMatchObject({
        success: true,
        preset: 'web-mp4'
      });
    });

    it('should return success status without preset', async () => {
      const conversions = JSON.stringify([
        { inputName: 'input.MOV', outputName: 'output.mp4' }
      ]);

      const result = await processVideos({ conversions });

      expect(result).toMatchObject({
        success: true,
        preset: null
      });
    });

    it('should return conversions array', async () => {
      const result = await processVideos({
        preset: 'web-ready',
        input: 'video.MOV'
      });

      expect(result.conversions).toEqual([
        { inputName: 'video.MOV', outputName: 'video.mp4' },
        { inputName: 'video.MOV', outputName: 'video.mp3' }
      ]);
    });
  });

  describe('error handling', () => {
    it('should throw error when script execution fails', async () => {
      execSync.mockImplementation(() => {
        throw new Error('FFmpeg failed');
      });

      await expect(
        processVideos({
          preset: 'web-mp4',
          input: 'video.MOV'
        })
      ).rejects.toThrow('FFmpeg failed');
    });

    it('should handle missing script file', async () => {
      execSync.mockImplementation(() => {
        const error = new Error('ENOENT: no such file or directory');
        error.code = 'ENOENT';
        throw error;
      });

      await expect(
        processVideos({
          preset: 'web-mp4',
          input: 'video.MOV'
        })
      ).rejects.toThrow('no such file or directory');
    });
  });

  describe('file extension handling', () => {
    const testCases = [
      { input: 'video.MOV', expected: 'video' },
      { input: 'video.mp4', expected: 'video' },
      { input: 'file.with.dots.MOV', expected: 'file.with.dots' },
      { input: 'no-extension', expected: 'no-extension' }
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should extract base name from ${input}`, async () => {
        const result = await processVideos({
          preset: 'web-mp4',
          input
        });

        expect(result.conversions[0].outputName).toBe(`${expected}.mp4`);
      });
    });
  });

  describe('listPresets function', () => {
    it('should export listPresets function', () => {
      const { listPresets } = require('../videos');
      expect(listPresets).toBeInstanceOf(Function);
    });

    it('should return presets object', () => {
      const { listPresets } = require('../videos');
      const presets = listPresets();
      
      expect(presets).toHaveProperty('web-mp4');
      expect(presets).toHaveProperty('extract-audio');
      expect(presets).toHaveProperty('web-ready');
      expect(presets).toHaveProperty('gif');
    });
  });
});
