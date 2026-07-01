const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('../../../lib/media/ffmpeg');

jest.mock('child_process');
jest.mock('fs');

describe('lib/media/ffmpeg helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runFfmpeg', () => {
    it('calls ffmpeg with the given args', () => {
      execFileSync.mockReturnValue(Buffer.from(''));
      ffmpeg.runFfmpeg(['-y', '-i', 'in.mp4', 'out.mp4']);
      expect(execFileSync).toHaveBeenCalledWith(
        'ffmpeg',
        ['-y', '-i', 'in.mp4', 'out.mp4'],
        expect.objectContaining({ stdio: expect.anything() })
      );
    });

    it('uses inherit stdio when verbose', () => {
      execFileSync.mockReturnValue(Buffer.from(''));
      ffmpeg.runFfmpeg(['-y'], { verbose: true });
      const call = execFileSync.mock.calls[0];
      expect(call[2].stdio).toBe('inherit');
    });

    it('uses pipe stdio when not verbose', () => {
      execFileSync.mockReturnValue(Buffer.from(''));
      ffmpeg.runFfmpeg(['-y'], { verbose: false });
      const call = execFileSync.mock.calls[0];
      expect(call[2].stdio).not.toBe('inherit');
    });

    it('forwards cwd', () => {
      execFileSync.mockReturnValue(Buffer.from(''));
      ffmpeg.runFfmpeg(['-y'], { cwd: '/tmp' });
      const call = execFileSync.mock.calls[0];
      expect(call[2].cwd).toBe('/tmp');
    });
  });

  describe('probe / getDuration / getVideoStreamInfo', () => {
    it('parses ffprobe JSON output', () => {
      execFileSync.mockReturnValue(JSON.stringify({
        format: { duration: '12.345' },
        streams: [{ codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080, rate: '30/1' }]
      }));
      const info = ffmpeg.probe('in.mp4');
      expect(info.format.duration).toBe('12.345');
      expect(info.streams[0].codec_name).toBe('h264');
    });

    it('getDuration returns 0 when missing', () => {
      execFileSync.mockReturnValue(JSON.stringify({ format: {} }));
      expect(ffmpeg.getDuration('in.mp4')).toBe(0);
    });

    it('getDuration returns parsed float', () => {
      execFileSync.mockReturnValue(JSON.stringify({ format: { duration: '42.5' } }));
      expect(ffmpeg.getDuration('in.mp4')).toBe(42.5);
    });

    it('getVideoStreamInfo handles missing video stream', () => {
      execFileSync.mockReturnValue(JSON.stringify({ streams: [{ codec_type: 'audio' }] }));
      expect(ffmpeg.getVideoStreamInfo('in.mp3')).toEqual({
        width: null, height: null, codec: null
      });
    });

    it('getVideoStreamInfo returns width/height/codec', () => {
      execFileSync.mockReturnValue(JSON.stringify({
        streams: [{ codec_type: 'video', codec_name: 'hevc', width: 1280, height: 720, rate: '25/1' }]
      }));
      expect(ffmpeg.getVideoStreamInfo('in.mp4')).toEqual({
        width: 1280, height: 720, codec: 'hevc'
      });
    });
  });

  describe('webScaleFilter', () => {
    it('returns null when input is below cap', () => {
      expect(ffmpeg.webScaleFilter(1280, 1920)).toBeNull();
    });

    it('returns null when input is missing', () => {
      expect(ffmpeg.webScaleFilter(null, 1920)).toBeNull();
    });

    it('returns scale filter when over cap', () => {
      expect(ffmpeg.webScaleFilter(3840, 1920)).toBe('scale=1920:-2:flags=lanczos');
    });
  });

  describe('tempFile / ensureDir', () => {
    it('tempFile produces a unique path with the given suffix', () => {
      const a = ffmpeg.tempFile('.png');
      const b = ffmpeg.tempFile('.png');
      expect(a).toMatch(/\.png$/);
      expect(b).toMatch(/\.png$/);
      expect(a).not.toEqual(b);
    });

    it('ensureDir creates missing directories', () => {
      fs.existsSync.mockReturnValue(false);
      ffmpeg.ensureDir('/tmp/x');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/x', { recursive: true });
    });

    it('ensureDir skips existing directories', () => {
      fs.existsSync.mockReturnValue(true);
      ffmpeg.ensureDir('/tmp/x');
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });
});
