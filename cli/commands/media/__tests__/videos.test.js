const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const processVideos = require('../videos');
const { PRESETS, PROFILES, parseConversions, formatFromOutputName } = require('../videos');
const { checkDependencies, DEPENDENCIES } = require('../../../lib/media/dependencies');
const ffmpeg = require('../../../lib/media/ffmpeg');

// Mock modules
jest.mock('child_process');
jest.mock('fs');
jest.mock('../../../lib/media/dependencies');
jest.mock('../../../lib/media/ffmpeg');

describe('Process Videos Command (JS-native)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: dependencies satisfied
    checkDependencies.mockResolvedValue(undefined);

    // Default: ffmpeg runs succeed
    ffmpeg.runFfmpeg.mockReturnValue(Buffer.from(''));
    ffmpeg.ensureDir.mockReturnValue(undefined);
    ffmpeg.getVideoStreamInfo.mockReturnValue({ width: 1280, height: 720, codec: 'h264' });
    ffmpeg.webScaleFilter.mockReturnValue(null);
    ffmpeg.getDuration.mockReturnValue(60);

    // Input/output files exist when checked
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 1024 * 1024 });
    fs.mkdirSync.mockReturnValue(undefined);
  });

  describe('PROFILES', () => {
    it('has profiles for all common formats', () => {
      ['mp3', 'wav', 'mp4', 'webm', 'mov'].forEach(f => {
        expect(PROFILES[f]).toBeDefined();
        expect(typeof PROFILES[f].buildArgs).toBe('function');
      });
    });

    it('mp3 profile uses libmp3lame at 192k', () => {
      const args = PROFILES.mp3.buildArgs({ input: 'in.MOV', outputPath: 'out.mp3' });
      expect(args).toContain('-acodec');
      expect(args).toContain('libmp3lame');
      expect(args).toContain('-ab');
      expect(args).toContain('192k');
      expect(args[args.length - 1]).toBe('out.mp3');
    });

    it('wav profile uses pcm_s16le', () => {
      const args = PROFILES.wav.buildArgs({ input: 'in.mp4', outputPath: 'out.wav' });
      expect(args).toContain('pcm_s16le');
    });

    it('mp4 profile uses H.264 + AAC + faststart', () => {
      const args = PROFILES.mp4.buildArgs({
        input: 'in.MOV', outputPath: 'out.mp4',
        videoInfo: { width: 1280, height: 720, codec: 'h264' }
      });
      expect(args).toContain('libx264');
      expect(args).toContain('aac');
      expect(args).toContain('+faststart');
    });

    it('webm profile uses libvpx-vp9 + libopus', () => {
      const args = PROFILES.webm.buildArgs({
        input: 'in.MOV', outputPath: 'out.webm',
        videoInfo: { width: 1280, height: 720, codec: 'h264' }
      });
      expect(args).toContain('libvpx-vp9');
      expect(args).toContain('libopus');
    });

    it('mp4 profile adds scale filter when source is over 1920 wide', () => {
      ffmpeg.webScaleFilter.mockReturnValue('scale=1920:-2:flags=lanczos');
      const args = PROFILES.mp4.buildArgs({
        input: 'in.MOV', outputPath: 'out.mp4',
        videoInfo: { width: 3840, height: 2160, codec: 'hevc' }
      });
      const vfIdx = args.indexOf('-vf');
      expect(vfIdx).toBeGreaterThan(-1);
      expect(args[vfIdx + 1]).toBe('scale=1920:-2:flags=lanczos');
    });
  });

  describe('formatFromOutputName', () => {
    it('extracts the extension lowercased', () => {
      expect(formatFromOutputName('clip.MP4')).toBe('mp4');
      expect(formatFromOutputName('clip.webm')).toBe('webm');
      expect(formatFromOutputName('noext')).toBe('');
    });
  });

  describe('parseConversions', () => {
    it('accepts a valid JSON array', () => {
      const out = parseConversions(JSON.stringify([{ inputName: 'a.mov', outputName: 'a.mp4' }]));
      expect(out).toEqual([{ inputName: 'a.mov', outputName: 'a.mp4' }]);
    });

    it('throws on invalid JSON', () => {
      expect(() => parseConversions('not-json')).toThrow('Invalid conversions JSON');
    });

    it('throws when not an array', () => {
      expect(() => parseConversions('{"a":1}')).toThrow('Conversions must be an array');
    });

    it('throws when entries are missing fields', () => {
      expect(() => parseConversions(JSON.stringify([{ outputName: 'x.mp4' }])))
        .toThrow('missing inputName or outputName');
    });
  });

  describe('presets', () => {
    it('has the four expected presets', () => {
      expect(Object.keys(PRESETS).sort())
        .toEqual(['extract-audio', 'gif', 'web-mp4', 'web-ready']);
    });

    it('web-mp4 generates a single mp4 conversion', () => {
      const c = PRESETS['web-mp4'].getConversions('video.MOV', 'video', 'public/music');
      expect(c).toEqual([{ inputName: 'video.MOV', outputName: 'video.mp4', outputDir: 'public/music' }]);
    });

    it('extract-audio generates a single mp3 conversion', () => {
      const c = PRESETS['extract-audio'].getConversions('video.mp4', 'audio', 'public/music');
      expect(c[0].outputName).toBe('audio.mp3');
    });

    it('web-ready generates both mp4 and mp3', () => {
      const c = PRESETS['web-ready'].getConversions('src.MOV', 'out', 'public/music');
      expect(c.map(x => x.outputName)).toEqual(['out.mp4', 'out.mp3']);
    });
  });

  describe('processVideos parameter validation', () => {
    it('throws when neither conversions nor preset provided', async () => {
      await expect(processVideos({})).rejects.toThrow('Either conversions JSON or preset');
    });

    it('throws when preset used without input', async () => {
      await expect(processVideos({ preset: 'web-mp4' }))
        .rejects.toThrow('Input file required when using preset');
    });

    it('throws for unknown preset', async () => {
      await expect(processVideos({ preset: 'nope', input: 'x.mov' }))
        .rejects.toThrow('Unknown preset "nope"');
    });

    it('runs successfully with a valid preset', async () => {
      const result = await processVideos({ preset: 'web-mp4', input: 'video.MOV', outputDir: 'public/music' });
      expect(result.success).toBe(true);
      expect(result.preset).toBe('web-mp4');
      expect(ffmpeg.runFfmpeg).toHaveBeenCalled();
    });

    it('runs successfully with a manual conversions array', async () => {
      const conversions = JSON.stringify([{ inputName: 'a.MOV', outputName: 'a.mp3' }]);
      const result = await processVideos({ conversions });
      expect(result.success).toBe(true);
      expect(ffmpeg.runFfmpeg).toHaveBeenCalled();
    });
  });

  describe('processVideos dependency checking', () => {
    it('checks ffmpeg and ffprobe (no longer jq)', async () => {
      await processVideos({ preset: 'web-mp4', input: 'video.MOV' });
      expect(checkDependencies).toHaveBeenCalledWith(
        [DEPENDENCIES.ffmpeg, DEPENDENCIES.ffprobe],
        expect.objectContaining({ autoInstall: true, required: true })
      );
    });

    it('propagates dependency errors', async () => {
      checkDependencies.mockRejectedValue(new Error('FFmpeg not found'));
      await expect(processVideos({ preset: 'web-mp4', input: 'video.MOV' }))
        .rejects.toThrow('FFmpeg not found');
    });
  });

  describe('processVideos per-conversion behavior', () => {
    it('skips and returns null when input file is missing', async () => {
      fs.existsSync.mockReturnValue(false);
      const conversions = JSON.stringify([{ inputName: 'gone.MOV', outputName: 'gone.mp4' }]);
      const result = await processVideos({ conversions });
      expect(result.results).toEqual([]);
      expect(ffmpeg.runFfmpeg).not.toHaveBeenCalled();
    });

    it('skips and returns null when output format is unknown', async () => {
      const conversions = JSON.stringify([{ inputName: 'x.MOV', outputName: 'x.xyz' }]);
      const result = await processVideos({ conversions });
      expect(result.results).toEqual([]);
      expect(ffmpeg.runFfmpeg).not.toHaveBeenCalled();
    });

    it('uses PROFILES.mp3 args for .mp3 outputs', async () => {
      const conversions = JSON.stringify([{ inputName: 'a.MOV', outputName: 'a.mp3' }]);
      await processVideos({ conversions, outputDir: 'public/music' });
      const args = ffmpeg.runFfmpeg.mock.calls[0][0];
      expect(args).toContain('libmp3lame');
    });

    it('uses PROFILES.mp4 args for .mp4 outputs', async () => {
      const conversions = JSON.stringify([{ inputName: 'a.MOV', outputName: 'a.mp4' }]);
      await processVideos({ conversions, outputDir: 'public/music' });
      const args = ffmpeg.runFfmpeg.mock.calls[0][0];
      expect(args).toContain('libx264');
      expect(args).toContain('+faststart');
    });

    it('runs multiple conversions in sequence', async () => {
      const conversions = JSON.stringify([
        { inputName: 'a.MOV', outputName: 'a.mp4' },
        { inputName: 'a.MOV', outputName: 'a.mp3' }
      ]);
      const result = await processVideos({ conversions, outputDir: 'public/music' });
      expect(ffmpeg.runFfmpeg).toHaveBeenCalledTimes(2);
      expect(result.results).toHaveLength(2);
    });

    it('passes verbose through to ffmpeg.runFfmpeg', async () => {
      const conversions = JSON.stringify([{ inputName: 'a.MOV', outputName: 'a.mp3' }]);
      await processVideos({ conversions, outputDir: 'public/music', verbose: true });
      const opts = ffmpeg.runFfmpeg.mock.calls[0][1];
      expect(opts.verbose).toBe(true);
    });
  });

  describe('listPresets', () => {
    it('returns the same object as PRESETS', () => {
      const { listPresets } = require('../videos');
      expect(listPresets()).toBe(PRESETS);
    });
  });
});
