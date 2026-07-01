const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const createGif = require('../gif');
const {
  MODES, DITHERS, STATS_MODES, RECIPES, VIDEO_EXTENSIONS,
  renderSegment, renderSummary, renderFull, runBatch, listVideoFiles,
  probeFps, parseLoop, buildPaletteGenFilter, buildPaletteUseFilter
} = require('../gif');
const ffmpeg = require('../../../lib/media/ffmpeg');
const { checkDependencies, DEPENDENCIES } = require('../../../lib/media/dependencies');

jest.mock('child_process');
jest.mock('fs');
jest.mock('../../../lib/media/dependencies');
jest.mock('../../../lib/media/ffmpeg');

describe('media gif command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkDependencies.mockResolvedValue(undefined);
    ffmpeg.ensureDir.mockReturnValue(undefined);
    ffmpeg.runFfmpeg.mockReturnValue(Buffer.from(''));
    ffmpeg.probe.mockReturnValue({
      format: { duration: '30' },
      streams: [{ codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080, rate: '30/1' }]
    });
    ffmpeg.getDuration.mockReturnValue(30);
    ffmpeg.tempFile.mockImplementation((suffix = '') =>
      `/tmp/xalpheric-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${suffix}`
    );
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 5_000_000 });
    fs.mkdirSync.mockReturnValue(undefined);
    fs.writeFileSync.mockReturnValue(undefined);
    fs.unlinkSync.mockReturnValue(undefined);
    fs.readdirSync.mockReturnValue([]);
    fs.rmdirSync.mockReturnValue(undefined);
  });

  describe('MODES', () => {
    it('exposes the three expected modes', () => {
      expect(MODES).toEqual(['segment', 'summary', 'full']);
    });
  });

  describe('createGif parameter validation', () => {
    it('throws for an unknown mode', async () => {
      await expect(createGif({ input: 'a.mp4', mode: 'lol' }))
        .rejects.toThrow("Unknown mode 'lol'");
    });

    it('throws when input file is missing', async () => {
      fs.existsSync.mockReturnValue(false);
      await expect(createGif({ input: 'nope.mp4' }))
        .rejects.toThrow('Input file not found');
    });

    it('checks ffmpeg dependency', async () => {
      await createGif({ input: 'a.mp4' });
      expect(checkDependencies).toHaveBeenCalledWith(
        [DEPENDENCIES.ffmpeg],
        expect.objectContaining({ autoInstall: false })
      );
    });

    it('defaults to segment mode', async () => {
      await createGif({ input: 'a.mp4' });
      // Segment mode: pass1 should include palettegen
      const firstArgs = ffmpeg.runFfmpeg.mock.calls[0][0];
      expect(firstArgs.join(' ')).toContain('palettegen');
    });
  });

  describe('segment mode', () => {
    it('runs two passes: palettegen then paletteuse', async () => {
      await createGif({ input: 'a.mp4', mode: 'segment', fps: '15', width: '320' });
      expect(ffmpeg.runFfmpeg).toHaveBeenCalledTimes(2);
      const pass1 = ffmpeg.runFfmpeg.mock.calls[0][0].join(' ');
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0].join(' ');
      expect(pass1).toContain('palettegen');
      expect(pass2).toContain('paletteuse');
      // pass2 should not generate a new palette
      expect(pass2).not.toContain('palettegen');
    });

    it('passes -ss and -t when start/duration provided', async () => {
      await createGif({
        input: 'a.mp4', mode: 'segment', start: '5', duration: '10'
      });
      const pass1 = ffmpeg.runFfmpeg.mock.calls[0][0];
      expect(pass1).toContain('-ss');
      expect(pass1).toContain('5');
      expect(pass1).toContain('-t');
      expect(pass1).toContain('10');
    });

    it('pass1 always emits -frames:v 1 and -update 1 (HEVC-safe)', async () => {
      await createGif({ input: 'a.mp4', mode: 'segment' });
      const pass1 = ffmpeg.runFfmpeg.mock.calls[0][0];
      expect(pass1).toContain('-frames:v');
      expect(pass1).toContain('1');
      expect(pass1).toContain('-update');
    });

    it('normalizes pixel format to yuv420p before palettegen', async () => {
      await createGif({ input: 'a.mp4', mode: 'segment' });
      const pass1 = ffmpeg.runFfmpeg.mock.calls[0][0].join(' ');
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0].join(' ');
      expect(pass1).toContain('format=yuv420p');
      expect(pass2).toContain('format=yuv420p');
    });
  });

  describe('summary mode (new)', () => {
    beforeEach(() => {
      // For summary mode, frame extraction calls execFileSync directly
      execFileSync.mockReturnValue(Buffer.from(''));
      // make ffmpeg.getDuration return a known duration
      ffmpeg.getDuration.mockReturnValue(60);
    });

    it('samples N frames evenly across the full video duration', async () => {
      await createGif({
        input: 'a.mp4', mode: 'summary', frames: '5', outputDir: 'public/assets'
      });

      // Pass 1: build palette from concat demuxer
      const paletteArgs = ffmpeg.runFfmpeg.mock.calls[0][0];
      expect(paletteArgs).toContain('concat');
      expect(paletteArgs.join(' ')).toContain('palettegen');

      // Pass 2: encode gif via concat demuxer + paletteuse
      const gifArgs = ffmpeg.runFfmpeg.mock.calls[1][0];
      expect(gifArgs).toContain('concat');
      expect(gifArgs.join(' ')).toContain('paletteuse');
      expect(gifArgs).toContain('-framerate');
    });

    it('throws when source duration cannot be determined', async () => {
      ffmpeg.getDuration.mockReturnValue(0);
      await expect(createGif({ input: 'a.mp4', mode: 'summary', frames: '5' }))
        .rejects.toThrow('Could not determine source video duration');
    });

    it('throws when frames < 2', async () => {
      await expect(createGif({ input: 'a.mp4', mode: 'summary', frames: '1' }))
        .rejects.toThrow('frames >= 2');
    });

    it('extracts one frame per timestamp via execFileSync', async () => {
      await createGif({
        input: 'a.mp4', mode: 'summary', frames: '4', width: '400'
      });
      // 4 frame extractions + 2 ffmpeg runs = 6 execFileSync invocations
      const calls = execFileSync.mock.calls;
      const ffmpegCalls = calls.filter(c => c[0] === 'ffmpeg');
      expect(ffmpegCalls.length).toBeGreaterThanOrEqual(4);
      // Each should include -frames:v 1
      for (const c of ffmpegCalls) {
        const args = c[1];
        expect(args).toContain('-frames:v');
        expect(args).toContain('1');
        expect(args).toContain('scale=400:-1:flags=lanczos');
      }
    });

    it('cleans up temp frame files after success', async () => {
      await createGif({ input: 'a.mp4', mode: 'summary', frames: '3' });
      // Should have created a temp dir and removed it
      expect(fs.mkdirSync).toHaveBeenCalled();
      // unlink + rmdir for the frame dir cleanup
      const rmdirCalls = fs.rmdirSync.mock.calls;
      expect(rmdirCalls.length).toBeGreaterThan(0);
    });
  });

  describe('full mode', () => {
    it('runs palettegen + paletteuse over the full video', async () => {
      await createGif({ input: 'a.mp4', mode: 'full' });
      expect(ffmpeg.runFfmpeg).toHaveBeenCalledTimes(2);
      const pass1 = ffmpeg.runFfmpeg.mock.calls[0][0].join(' ');
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0].join(' ');
      expect(pass1).toContain('palettegen');
      expect(pass2).toContain('paletteuse');
    });

    it('full mode pass1 emits -frames:v 1 -update 1 and format=yuv420p', async () => {
      await createGif({ input: 'a.mp4', mode: 'full' });
      const pass1 = ffmpeg.runFfmpeg.mock.calls[0][0];
      expect(pass1).toContain('-frames:v');
      expect(pass1).toContain('1');
      expect(pass1).toContain('-update');
      expect(pass1.join(' ')).toContain('format=yuv420p');
    });
  });

  describe('output naming', () => {
    it('uses <basename>.gif by default', async () => {
      await createGif({ input: 'video.mp4', mode: 'segment' });
      // Pass 2 produces the output — last arg is the output path
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0];
      const out = pass2[pass2.length - 1];
      expect(out.endsWith('video.gif')).toBe(true);
    });

    it('honors --output when provided', async () => {
      await createGif({ input: 'video.mp4', output: 'custom.gif', mode: 'segment' });
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0];
      const out = pass2[pass2.length - 1];
      expect(out.endsWith('custom.gif')).toBe(true);
    });

    it('respects an absolute --output path (does not join with outputDir)', async () => {
      await createGif({
        input: 'video.mp4',
        output: '/tmp/xalpheric-abs/custom.gif',
        outputDir: 'public/assets',
        mode: 'segment'
      });
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0];
      const out = pass2[pass2.length - 1];
      expect(out).toBe('/tmp/xalpheric-abs/custom.gif');
    });
  });

  describe('cleanup', () => {
    it('removes the temp palette file on success', async () => {
      await createGif({ input: 'a.mp4', mode: 'segment' });
      expect(fs.unlinkSync).toHaveBeenCalled();
    });
  });

  describe('probeFps', () => {
    it('returns 25 when probe finds no rate', () => {
      ffmpeg.probe.mockReturnValue({ streams: [{ codec_type: 'video' }] });
      expect(probeFps('a.mp4')).toBe(25);
    });

    it('parses a fraction rate string', () => {
      ffmpeg.probe.mockReturnValue({
        streams: [{ codec_type: 'video', rate: '30000/1001' }]
      });
      expect(probeFps('a.mp4')).toBeCloseTo(29.97, 1);
    });

    it('returns 25 on probe failure', () => {
      ffmpeg.probe.mockImplementation(() => { throw new Error('probe failed'); });
      expect(probeFps('a.mp4')).toBe(25);
    });
  });

  // ── New options: --palette / --dither / --loop / etc. ─────────────────────

  describe('parseLoop', () => {
    it('defaults to 0 (infinite) for null/undefined/empty', () => {
      expect(parseLoop(undefined)).toBe(0);
      expect(parseLoop(null)).toBe(0);
      expect(parseLoop('')).toBe(0);
    });

    it('resolves named "infinite" variants to 0', () => {
      expect(parseLoop('infinite')).toBe(0);
      expect(parseLoop('inf')).toBe(0);
      expect(parseLoop('forever')).toBe(0);
      expect(parseLoop('0')).toBe(0);
    });

    it('resolves "none" variants to -1', () => {
      expect(parseLoop('none')).toBe(-1);
      expect(parseLoop('no')).toBe(-1);
      expect(parseLoop('off')).toBe(-1);
      expect(parseLoop('once')).toBe(-1);
      expect(parseLoop('-1')).toBe(-1);
    });

    it('parses positive integers as-is', () => {
      expect(parseLoop('1')).toBe(1);
      expect(parseLoop('3')).toBe(3);
      expect(parseLoop('100')).toBe(100);
    });

    it('throws on garbage input', () => {
      expect(() => parseLoop('abc')).toThrow('Invalid --loop value');
      expect(() => parseLoop('-5')).toThrow('Invalid --loop value');
    });

    it('rejects values > 65535', () => {
      expect(() => parseLoop('99999')).toThrow('out of range');
    });
  });

  describe('buildPaletteGenFilter', () => {
    it('emits the default diff/256 form', () => {
      expect(buildPaletteGenFilter({ statsMode: 'diff', colors: 256, transparency: '0' }))
        .toBe('palettegen=stats_mode=diff:max_colors=256');
    });

    it('emits single-pass when requested', () => {
      expect(buildPaletteGenFilter({ statsMode: 'single', colors: 128, transparency: '0' }))
        .toBe('palettegen=stats_mode=single:max_colors=128');
    });

    it('clamps colors to 256', () => {
      expect(buildPaletteGenFilter({ statsMode: 'diff', colors: 9999, transparency: '0' }))
        .toBe('palettegen=stats_mode=diff:max_colors=256');
    });

    it('adds reserve_transparent when requested', () => {
      expect(buildPaletteGenFilter({ statsMode: 'diff', colors: 256, transparency: '1' }))
        .toBe('palettegen=stats_mode=diff:max_colors=256:reserve_transparent=1');
    });
  });

  describe('buildPaletteUseFilter', () => {
    it('defaults to bayer scale 5', () => {
      expect(buildPaletteUseFilter({ dither: 'bayer', bayerScale: 5 }))
        .toBe('paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle');
    });

    it('clamps bayer scale to 1..8', () => {
      expect(buildPaletteUseFilter({ dither: 'bayer', bayerScale: 0 }))
        .toContain('bayer_scale=1');
      expect(buildPaletteUseFilter({ dither: 'bayer', bayerScale: 99 }))
        .toContain('bayer_scale=8');
    });

    it('emits floyd_steinberg when requested', () => {
      expect(buildPaletteUseFilter({ dither: 'floyd_steinberg' }))
        .toBe('paletteuse=dither=floyd_steinberg:diff_mode=rectangle');
    });

    it('emits sierra2 when requested', () => {
      expect(buildPaletteUseFilter({ dither: 'sierra2' }))
        .toBe('paletteuse=dither=sierra2:diff_mode=rectangle');
    });

    it('emits dither=none when requested', () => {
      expect(buildPaletteUseFilter({ dither: 'none' }))
        .toBe('paletteuse=dither=none');
    });
  });

  describe('DITHERS and STATS_MODES exports', () => {
    it('exposes the four dither modes', () => {
      expect(DITHERS).toEqual(['bayer', 'floyd_steinberg', 'sierra2', 'none']);
    });

    it('exposes the two stats modes', () => {
      expect(STATS_MODES).toEqual(['diff', 'single']);
    });
  });

  describe('createGif parameter validation (new options)', () => {
    it('throws for an unknown dither', async () => {
      await expect(createGif({ input: 'a.mp4', dither: 'hqx' }))
        .rejects.toThrow("Unknown dither 'hqx'");
    });

    it('throws for an unknown stats mode', async () => {
      await expect(createGif({ input: 'a.mp4', statsMode: 'wild' }))
        .rejects.toThrow("Unknown stats mode 'wild'");
    });

    it('throws for an invalid loop value', async () => {
      await expect(createGif({ input: 'a.mp4', loop: 'bad' }))
        .rejects.toThrow('Invalid --loop value');
    });
  });

  describe('palette / dither / loop wiring', () => {
    it('emits max_colors and stats_mode in segment mode', async () => {
      await createGif({
        input: 'a.mp4', mode: 'segment', colors: '64', statsMode: 'single'
      });
      const pass1 = ffmpeg.runFfmpeg.mock.calls[0][0].join(' ');
      expect(pass1).toContain('max_colors=64');
      expect(pass1).toContain('stats_mode=single');
    });

    it('emits floyd_steinberg in segment mode pass 2', async () => {
      await createGif({ input: 'a.mp4', mode: 'segment', dither: 'floyd_steinberg' });
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0].join(' ');
      expect(pass2).toContain('dither=floyd_steinberg');
    });

    it('emits dither=none in segment mode pass 2', async () => {
      await createGif({ input: 'a.mp4', mode: 'segment', dither: 'none' });
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0].join(' ');
      expect(pass2).toContain('dither=none');
    });

    it('clamps the bayer scale in the segment filter', async () => {
      await createGif({ input: 'a.mp4', mode: 'segment', ditherScale: '3' });
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0].join(' ');
      expect(pass2).toContain('bayer_scale=3');
    });

    it('passes loop=0 to ffmpeg when --loop is "infinite"', async () => {
      await createGif({ input: 'a.mp4', mode: 'segment', loop: 'infinite' });
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0];
      const loopIdx = pass2.indexOf('-loop');
      expect(pass2[loopIdx + 1]).toBe('0');
    });

    it('passes loop=-1 to ffmpeg when --loop is "none"', async () => {
      await createGif({ input: 'a.mp4', mode: 'segment', loop: 'none' });
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0];
      const loopIdx = pass2.indexOf('-loop');
      expect(pass2[loopIdx + 1]).toBe('-1');
    });

    it('passes loop=N to ffmpeg when --loop is a number', async () => {
      await createGif({ input: 'a.mp4', mode: 'segment', loop: '5' });
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0];
      const loopIdx = pass2.indexOf('-loop');
      expect(pass2[loopIdx + 1]).toBe('5');
    });

    it('emits reserve_transparent when transparent=true', async () => {
      await createGif({ input: 'a.mp4', mode: 'segment', transparent: true });
      const pass1 = ffmpeg.runFfmpeg.mock.calls[0][0].join(' ');
      expect(pass1).toContain('reserve_transparent=1');
    });

    it('wires palette options into summary mode', async () => {
      execFileSync.mockReturnValue(Buffer.from(''));
      ffmpeg.getDuration.mockReturnValue(60);
      await createGif({
        input: 'a.mp4', mode: 'summary', frames: '4',
        colors: '32', dither: 'floyd_steinberg', statsMode: 'single'
      });
      const pass1 = ffmpeg.runFfmpeg.mock.calls[0][0].join(' ');
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0].join(' ');
      expect(pass1).toContain('max_colors=32');
      expect(pass1).toContain('stats_mode=single');
      expect(pass2).toContain('dither=floyd_steinberg');
    });

    it('wires palette options into full mode', async () => {
      await createGif({
        input: 'a.mp4', mode: 'full', colors: '128', dither: 'sierra2'
      });
      const pass1 = ffmpeg.runFfmpeg.mock.calls[0][0].join(' ');
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0].join(' ');
      expect(pass1).toContain('max_colors=128');
      expect(pass2).toContain('dither=sierra2');
    });
  });

  // ── Recipes ──────────────────────────────────────────────────────────────

  describe('RECIPES', () => {
    it('exposes the four expected recipes', () => {
      expect(Object.keys(RECIPES).sort())
        .toEqual(['flat', 'flipbook', 'loop-once', 'tiny']);
    });

    it('every recipe returns a valid options object', () => {
      for (const [name, fn] of Object.entries(RECIPES)) {
        const opts = fn();
        expect(opts).toEqual(expect.objectContaining({ mode: expect.any(String) }));
        expect(MODES).toContain(opts.mode);
      }
    });

    it('tiny recipe is small, plays once, segment mode', () => {
      const r = RECIPES.tiny();
      expect(r.mode).toBe('segment');
      expect(r.loop).toBe('none');
      expect(r.duration).toBeLessThanOrEqual(3);
      expect(r.width).toBeLessThanOrEqual(320);
      expect(r.colors).toBeLessThanOrEqual(64);
    });

    it('flipbook recipe is summary mode with floyd_steinberg', () => {
      const r = RECIPES.flipbook();
      expect(r.mode).toBe('summary');
      expect(r.dither).toBe('floyd_steinberg');
      expect(r.frames).toBeGreaterThanOrEqual(8);
    });

    it('flat recipe uses dither=none for crisp vector art', () => {
      const r = RECIPES.flat();
      expect(r.dither).toBe('none');
      expect(r.colors).toBeLessThanOrEqual(32);
    });

    it('loop-once recipe plays once', () => {
      const r = RECIPES['loop-once']();
      expect(r.loop).toBe('none');
      expect(r.mode).toBe('summary');
    });
  });

  describe('applyRecipe (via createGif)', () => {
    it('applies tiny recipe defaults when no other flags override', async () => {
      await createGif({ input: 'a.mp4', recipe: 'tiny' });
      // tiny → segment, 2s, width 240, loop none, 32 colors
      const pass1 = ffmpeg.runFfmpeg.mock.calls[0][0];
      // -t 2 (duration)
      expect(pass1).toContain('-t');
      expect(pass1).toContain('2');
      // loop -1
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0];
      const loopIdx = pass2.indexOf('-loop');
      expect(pass2[loopIdx + 1]).toBe('-1');
    });

    it('applies flipbook recipe (summary mode, no -t)', async () => {
      execFileSync.mockReturnValue(Buffer.from(''));
      ffmpeg.getDuration.mockReturnValue(30);
      await createGif({ input: 'a.mp4', recipe: 'flipbook' });
      const pass1 = ffmpeg.runFfmpeg.mock.calls[0][0];
      // No -t in summary mode
      expect(pass1).not.toContain('-t');
      // palette uses floyd_steinberg
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0].join(' ');
      expect(pass2).toContain('dither=floyd_steinberg');
    });

    it('applies flat recipe (dither=none)', async () => {
      await createGif({ input: 'a.mp4', recipe: 'flat' });
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0].join(' ');
      expect(pass2).toContain('dither=none');
    });

    it('CLI flag overrides recipe default', async () => {
      // Recipe tiny has width=240, but user supplies -w 600.
      // Because the CLI default is '480', applyRecipe sees a non-default
      // value and preserves it.
      await createGif({ input: 'a.mp4', recipe: 'tiny', width: '600' });
      const pass1 = ffmpeg.runFfmpeg.mock.calls[0][0].join(' ');
      expect(pass1).toContain('scale=600');
    });

    it('throws on unknown recipe', async () => {
      await expect(createGif({ input: 'a.mp4', recipe: 'huge' }))
        .rejects.toThrow("Unknown recipe 'huge'");
    });
  });

  // ── Batch mode ───────────────────────────────────────────────────────────

  describe('listVideoFiles', () => {
    beforeEach(() => {
      // Make fs.readdirSync / existsSync / statSync return controlled data
      fs.existsSync.mockImplementation((p) => p === '/some/dir');
      fs.statSync.mockImplementation((p) => {
        if (p === '/some/dir') return { isDirectory: () => true };
        return { isDirectory: () => false };
      });
    });

    it('returns video files from a directory', () => {
      fs.readdirSync.mockReturnValue([
        { name: 'clip.mov', isFile: () => true, isDirectory: () => false },
        { name: 'shot.mp4', isFile: () => true, isDirectory: () => false },
        { name: 'notes.txt', isFile: () => true, isDirectory: () => false },
        { name: 'sub', isFile: () => false, isDirectory: () => true }
      ]);
      const out = listVideoFiles('/some/dir', { recursive: false });
      expect(out).toEqual(['/some/dir/clip.mov', '/some/dir/shot.mp4']);
    });

    it('recognizes all expected video extensions', () => {
      expect(VIDEO_EXTENSIONS.has('.mov')).toBe(true);
      expect(VIDEO_EXTENSIONS.has('.mp4')).toBe(true);
      expect(VIDEO_EXTENSIONS.has('.webm')).toBe(true);
      expect(VIDEO_EXTENSIONS.has('.hevc')).toBe(true);
      expect(VIDEO_EXTENSIONS.has('.gif')).toBe(false);
      expect(VIDEO_EXTENSIONS.has('.txt')).toBe(false);
    });

    it('returns [] when the directory does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      expect(listVideoFiles('/nope')).toEqual([]);
    });

    it('returns [] when path is a file, not a directory', () => {
      fs.statSync.mockReturnValue({ isDirectory: () => false });
      expect(listVideoFiles('/some/file.mov')).toEqual([]);
    });
  });

  describe('runBatch (batch mode)', () => {
    it('throws when batch input directory does not exist', async () => {
      fs.existsSync.mockReturnValue(false);
      await expect(createGif({ batch: true, batchInput: '/nope/dir' }))
        .rejects.toThrow('Batch input directory not found');
    });

    it('warns and returns empty when no videos found', async () => {
      // existsSync true for the dir, but readdirSync returns no video files
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ isDirectory: () => true });
      fs.readdirSync.mockReturnValue([]);
      const result = await createGif({ batch: true, batchInput: '/some/empty' });
      expect(result).toEqual({ succeeded: 0, skipped: 0, failed: 0, results: [] });
    });

    it('processes every video in the directory and writes to public/assets/gifs/', async () => {
      // Two videos in the dir
      fs.existsSync.mockImplementation((p) => {
        if (p === '/some/dir') return true;
        // Files don't exist yet
        if (typeof p === 'string' && p.endsWith('.gif')) return false;
        return true;
      });
      fs.statSync.mockImplementation((p) => {
        if (p === '/some/dir') return { isDirectory: () => true };
        return { isDirectory: () => false, size: 1024 };
      });
      fs.readdirSync.mockReturnValue([
        { name: 'a.mov', isFile: () => true, isDirectory: () => false },
        { name: 'b.mp4', isFile: () => true, isDirectory: () => false }
      ]);
      const result = await createGif({ batch: true, batchInput: '/some/dir' });
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      // Two ffmpeg invocations (two passes each) for each video
      // → 2 videos × 2 passes = 4 ffmpeg.runFfmpeg calls
      expect(ffmpeg.runFfmpeg).toHaveBeenCalledTimes(4);
    });

    it('skips existing GIFs by default', async () => {
      fs.existsSync.mockImplementation((p) => {
        if (p === '/some/dir') return true;
        if (typeof p === 'string' && p.endsWith('.gif')) return true; // exists
        return true;
      });
      fs.statSync.mockImplementation((p) => {
        if (p === '/some/dir') return { isDirectory: () => true };
        return { isDirectory: () => false, size: 1024 };
      });
      fs.readdirSync.mockReturnValue([
        { name: 'already-here.mov', isFile: () => true, isDirectory: () => false }
      ]);
      const result = await createGif({ batch: true, batchInput: '/some/dir' });
      expect(result.skipped).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(ffmpeg.runFfmpeg).not.toHaveBeenCalled();
    });

    it('overwrites existing GIFs when --overwrite is set', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockImplementation((p) => {
        if (p === '/some/dir') return { isDirectory: () => true };
        return { isDirectory: () => false, size: 1024 };
      });
      fs.readdirSync.mockReturnValue([
        { name: 'redundant.mov', isFile: () => true, isDirectory: () => false }
      ]);
      const result = await createGif({ batch: true, batchInput: '/some/dir', overwrite: true });
      expect(result.succeeded).toBe(1);
      expect(ffmpeg.runFfmpeg).toHaveBeenCalledTimes(2);
    });

    it('continues to the next video when one fails', async () => {
      // Directory exists; input files exist; prospective .gif outputs do NOT
      fs.existsSync.mockImplementation((p) => {
        if (p === '/some/dir') return true;
        if (typeof p === 'string' && p.endsWith('.gif')) return false;
        return true;
      });
      fs.statSync.mockImplementation((p) => {
        if (p === '/some/dir') return { isDirectory: () => true };
        return { isDirectory: () => false, size: 1024 };
      });
      fs.readdirSync.mockReturnValue([
        { name: 'a.mov', isFile: () => true, isDirectory: () => false },
        { name: 'b.mov', isFile: () => true, isDirectory: () => false }
      ]);
      // First ffmpeg.runFfmpeg call throws (a.mov pass 1), subsequent succeed
      ffmpeg.runFfmpeg
        .mockImplementationOnce(() => { throw new Error('boom'); })
        .mockReturnValue(Buffer.from(''));
      const result = await createGif({ batch: true, batchInput: '/some/dir' });
      expect(result.failed).toBe(1);
      expect(result.succeeded).toBe(1);
    });
  });

  // ── Default output dir ───────────────────────────────────────────────────

  describe('default output dir', () => {
    it('defaults to public/assets/gifs/ when not specified', async () => {
      await createGif({ input: 'a.mp4' });
      const pass2 = ffmpeg.runFfmpeg.mock.calls[1][0];
      const out = pass2[pass2.length - 1];
      expect(out.startsWith('public/assets/gifs/')).toBe(true);
    });
  });
});
