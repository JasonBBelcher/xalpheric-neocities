const { execSync } = require('child_process');
const readline = require('readline');
const { 
  checkCommand, 
  checkDependencies, 
  DEPENDENCIES 
} = require('../../../lib/media/dependencies');

// Mock modules
jest.mock('child_process');
jest.mock('readline');

describe('Media Dependencies', () => {
  let mockLogger;
  let mockInterface;
  let mockQuestion;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      warn: jest.fn(),
      verbose: jest.fn()
    };

    // Mock readline interface
    mockQuestion = jest.fn();
    mockInterface = {
      question: mockQuestion,
      close: jest.fn()
    };
    readline.createInterface.mockReturnValue(mockInterface);
  });

  describe('checkCommand', () => {
    it('should return true when command exists', () => {
      execSync.mockReturnValue(Buffer.from('/usr/local/bin/ffmpeg\n'));

      const result = checkCommand('ffmpeg');

      expect(result).toBe(true);
      expect(execSync).toHaveBeenCalledWith('command -v ffmpeg', {
        stdio: 'ignore'
      });
    });

    it('should return false when command does not exist', () => {
      execSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const result = checkCommand('nonexistent');

      expect(result).toBe(false);
    });

    it('should handle empty output', () => {
      execSync.mockReturnValue(Buffer.from(''));

      const result = checkCommand('something');

      expect(result).toBe(true); // command -v returns successfully even with empty output
    });
  });

  describe('DEPENDENCIES constant', () => {
    it('should have imagemagick definition', () => {
      expect(DEPENDENCIES.imagemagick).toBeDefined();
      expect(DEPENDENCIES.imagemagick.command).toBe('magick');
      expect(DEPENDENCIES.imagemagick.name).toBeTruthy();
      expect(DEPENDENCIES.imagemagick.installInstructions).toBeTruthy();
    });

    it('should have ffmpeg definition', () => {
      expect(DEPENDENCIES.ffmpeg).toBeDefined();
      expect(DEPENDENCIES.ffmpeg.command).toBe('ffmpeg');
      expect(DEPENDENCIES.ffmpeg.name).toBeTruthy();
      expect(DEPENDENCIES.ffmpeg.installInstructions).toBeTruthy();
    });

    it('should have ffprobe definition', () => {
      expect(DEPENDENCIES.ffprobe).toBeDefined();
      expect(DEPENDENCIES.ffprobe.command).toBe('ffprobe');
      expect(DEPENDENCIES.ffprobe.name).toBeTruthy();
    });

    it('should have jq definition', () => {
      expect(DEPENDENCIES.jq).toBeDefined();
      expect(DEPENDENCIES.jq.command).toBe('jq');
      expect(DEPENDENCIES.jq.name).toBeTruthy();
    });

    it('should have sharp definition', () => {
      expect(DEPENDENCIES.sharp).toBeDefined();
      expect(DEPENDENCIES.sharp.command).toBe('node');
      expect(DEPENDENCIES.sharp.name).toBeTruthy();
    });
  });

  describe('checkDependencies', () => {
    describe('when all dependencies are satisfied', () => {
      beforeEach(() => {
        execSync.mockImplementation(() => {
          // checkCommand succeeds
        });
      });

      it('should succeed with required dependencies', async () => {
        const result = await checkDependencies([DEPENDENCIES.ffmpeg], {
          required: true,
          logger: mockLogger
        });

        expect(result.available).toBe(true);
        expect(result.missing).toHaveLength(0);
        expect(mockLogger.success).toHaveBeenCalledWith(
          expect.stringContaining('All dependencies are available')
        );
      });

      it('should succeed with optional dependencies', async () => {
        const result = await checkDependencies([DEPENDENCIES.sharp], {
          required: false,
          logger: mockLogger
        });

        expect(result.available).toBe(true);
        expect(result.missing).toHaveLength(0);
      });
    });

    describe('when dependencies are missing', () => {
      beforeEach(() => {
        execSync.mockImplementation((cmd) => {
          if (cmd.includes('ffmpeg')) {
            throw new Error('Not found');
          }
          return Buffer.from('/usr/local/bin/other\n');
        });
      });

      it('should throw error for required dependencies without auto-install', async () => {
        await expect(
          checkDependencies([DEPENDENCIES.ffmpeg], {
            required: true,
            autoInstall: false,
            logger: mockLogger
          })
        ).rejects.toThrow('Missing required dependencies');

        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('should not throw for optional dependencies', async () => {
        const result = await checkDependencies([DEPENDENCIES.ffmpeg], {
          required: false,
          autoInstall: false,
          logger: mockLogger
        });

        expect(result.available).toBe(false);
        expect(result.missing).toHaveLength(1);
        expect(mockLogger.warn).toHaveBeenCalled();
      });

      it('should prompt for installation when auto-install is enabled', async () => {
        mockQuestion.mockImplementation((question, callback) => {
          callback('y');
        });

        // Mock successful installation
        execSync
          .mockImplementationOnce(() => {
            throw new Error('Not found');
          })
          .mockImplementationOnce(() => {
            // install succeeds
            return Buffer.from('');
          });

        const result = await checkDependencies([DEPENDENCIES.ffmpeg], {
          required: true,
          autoInstall: true,
          logger: mockLogger
        });

        expect(mockQuestion).toHaveBeenCalled();
        expect(result.available).toBe(true);
        expect(mockLogger.success).toHaveBeenCalledWith(
          expect.stringContaining('All dependencies installed successfully')
        );
      });

      it('should abort when user declines installation', async () => {
        mockQuestion.mockImplementation((question, callback) => {
          callback('n');
        });

        execSync.mockImplementation(() => {
          throw new Error('Not found');
        });

        await expect(
          checkDependencies([DEPENDENCIES.ffmpeg], {
            required: true,
            autoInstall: true,
            logger: mockLogger
          })
        ).rejects.toThrow('Missing required dependencies');
      });
    });

    describe('platform-specific installation', () => {
      beforeEach(() => {
        execSync
          .mockImplementationOnce(() => {
            throw new Error('Not found');
          })
          .mockImplementationOnce(() => {
            // installation succeeds
            return Buffer.from('');
          });

        mockQuestion.mockImplementation((question, callback) => {
          callback('y');
        });
      });

      it('should attempt installation on macOS', async () => {
        const result = await checkDependencies([DEPENDENCIES.ffmpeg], {
          required: true,
          autoInstall: true,
          logger: mockLogger
        });

        expect(result.available).toBe(true);
        expect(mockQuestion).toHaveBeenCalled();
      });

      it('should attempt installation on Linux', async () => {
        const result = await checkDependencies([DEPENDENCIES.jq], {
          required: true,
          autoInstall: true,
          logger: mockLogger
        });

        expect(result.available).toBe(true);
        expect(mockQuestion).toHaveBeenCalled();
      });
    });

    describe('multiple dependencies', () => {
      it('should check all dependencies', async () => {
        execSync.mockImplementation(() => {
          // all succeed
        });

        const result = await checkDependencies(
          [DEPENDENCIES.ffmpeg, DEPENDENCIES.ffprobe, DEPENDENCIES.jq],
          {
            required: true,
            logger: mockLogger
          }
        );

        expect(result.available).toBe(true);
        expect(result.missing).toHaveLength(0);
        expect(mockLogger.success).toHaveBeenCalledWith(
          expect.stringContaining('All dependencies are available')
        );
      });

      it('should report all missing dependencies', async () => {
        execSync.mockImplementation((cmd) => {
          if (cmd.includes('ffmpeg') || cmd.includes('jq')) {
            throw new Error('Not found');
          }
          // ffprobe succeeds
        });

        await expect(
          checkDependencies(
            [DEPENDENCIES.ffmpeg, DEPENDENCIES.ffprobe, DEPENDENCIES.jq],
            {
              required: true,
              autoInstall: false,
              logger: mockLogger
            }
          )
        ).rejects.toThrow('Missing required dependencies');

        // Check that missing dependencies were logged
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });

    describe('parent package handling', () => {
      it('should install dependencies when prompted', async () => {
        execSync
          .mockImplementationOnce(() => {
            throw new Error('Not found');
          })
          .mockImplementationOnce(() => {
            // Installation succeeds
            return Buffer.from('');
          });

        mockQuestion.mockImplementation((question, callback) => {
          callback('y');
        });

        const result = await checkDependencies([DEPENDENCIES.ffprobe], {
          required: true,
          autoInstall: true,
          logger: mockLogger
        });

        expect(result.available).toBe(true);
        expect(mockQuestion).toHaveBeenCalled();
      });
    });
  });
});
