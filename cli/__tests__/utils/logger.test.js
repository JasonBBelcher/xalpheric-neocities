const logger = require('../../lib/utils/logger');

describe('Logger', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    logger.setVerbose(false); // Reset to default
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('info', () => {
    it('should log info messages', () => {
      logger.info('Test message');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message')
      );
    });

    it('should include emoji if provided', () => {
      logger.info('Test', '📝');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('📝')
      );
    });
  });

  describe('success', () => {
    it('should log success messages with green color', () => {
      logger.success('Success!');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\x1b\[32m.*Success!.*\x1b\[0m/)
      );
    });
  });

  describe('error', () => {
    it('should log error messages with red color', () => {
      logger.error('Error!');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\x1b\[31m.*Error!.*\x1b\[0m/)
      );
    });
  });

  describe('warn', () => {
    it('should log warning messages with yellow color', () => {
      logger.warn('Warning!');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\x1b\[33m.*Warning!.*\x1b\[0m/)
      );
    });
  });

  describe('verbose', () => {
    it('should not log when verbose is false', () => {
      logger.setVerbose(false);
      logger.verbose('Verbose message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log when verbose is true', () => {
      logger.setVerbose(true);
      logger.verbose('Verbose message');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Verbose message')
      );
    });
  });

  describe('setVerbose', () => {
    it('should enable verbose logging', () => {
      logger.setVerbose(true);
      logger.verbose('Test');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should disable verbose logging', () => {
      logger.setVerbose(true);
      logger.setVerbose(false);
      logger.verbose('Test');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('colors', () => {
    it('should support cyan color', () => {
      logger.cyan('Cyan text');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\x1b\[36m.*Cyan text.*\x1b\[0m/)
      );
    });

    it('should support blue color', () => {
      logger.blue('Blue text');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\x1b\[34m.*Blue text.*\x1b\[0m/)
      );
    });

    it('should support magenta color', () => {
      logger.magenta('Magenta text');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\x1b\[35m.*Magenta text.*\x1b\[0m/)
      );
    });
  });
});
