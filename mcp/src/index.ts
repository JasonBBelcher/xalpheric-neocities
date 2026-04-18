#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(__dirname, '../../cli/index.js');
const CWD = path.resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function run(args: string[]): string {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd: CWD,
    env: process.env,
    encoding: 'utf8',
    timeout: 120_000,
  });
  const stdout = (result.stdout ?? '').trim();
  const stderr = (result.stderr ?? '').trim();
  const output = [stdout, stderr].filter(Boolean).join('\n');
  if (result.status !== 0) {
    throw new Error(output || `Process exited with code ${result.status}`);
  }
  return output || 'Done.';
}

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

interface ToolDef extends Tool {
  build: (input: Record<string, unknown>) => string[];
}

const TOOLS: ToolDef[] = [
  // ── DEPLOY ────────────────────────────────────────────────────────────────
  {
    name: 'deploy_music',
    description: 'Deploy music files to Neocities based on releases.json',
    inputSchema: {
      type: 'object',
      properties: {
        force: { type: 'boolean', description: 'Force upload all files even if they exist remotely' },
        delete_orphans: { type: 'boolean', description: 'Delete orphaned remote files not in config' },
        dry_run: { type: 'boolean', description: 'Simulate deployment without making changes' },
        music_dir: { type: 'string', description: 'Music directory path (default: public/music)' },
        config: { type: 'string', description: 'Path to releases.json (default: public/config/releases.json)' },
        verbose: { type: 'boolean' },
      },
    },
    build: (i) => {
      const a = ['deploy', 'music'];
      if (i.force) a.push('--force');
      if (i.delete_orphans) a.push('--delete-orphans');
      if (i.dry_run) a.push('--dry-run');
      if (i.music_dir) a.push('--music-dir', i.music_dir as string);
      if (i.config) a.push('--config', i.config as string);
      if (i.verbose) a.push('--verbose');
      return a;
    },
  },
  {
    name: 'deploy_musings',
    description: 'Deploy blog post HTML files to Neocities musings directory',
    inputSchema: {
      type: 'object',
      properties: {
        force: { type: 'boolean', description: 'Force upload all files' },
        delete_orphans: { type: 'boolean', description: 'Delete orphaned remote files' },
        dry_run: { type: 'boolean' },
        musings_dir: { type: 'string', description: 'Musings directory path (default: public/musings)' },
        verbose: { type: 'boolean' },
      },
    },
    build: (i) => {
      const a = ['deploy', 'musings'];
      if (i.force) a.push('--force');
      if (i.delete_orphans) a.push('--delete-orphans');
      if (i.dry_run) a.push('--dry-run');
      if (i.musings_dir) a.push('--musings-dir', i.musings_dir as string);
      if (i.verbose) a.push('--verbose');
      return a;
    },
  },
  {
    name: 'deploy_config',
    description: 'Deploy configuration files (releases.json, default album art) to Neocities',
    inputSchema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' }, description: 'Specific files to deploy' },
        dry_run: { type: 'boolean' },
        verbose: { type: 'boolean' },
      },
    },
    build: (i) => {
      const a = ['deploy', 'config'];
      const files = i.files as string[] | undefined;
      if (files?.length) a.push('--files', ...files);
      if (i.dry_run) a.push('--dry-run');
      if (i.verbose) a.push('--verbose');
      return a;
    },
  },
  {
    name: 'deploy_drum_machine',
    description: 'Deploy drum machine build artifacts (HTML, CSS, JS) to Neocities',
    inputSchema: {
      type: 'object',
      properties: {
        dist_dir: { type: 'string', description: 'Drum machine dist directory (default: ../drum-machine/dist)' },
        html: { type: 'string', description: 'HTML file path (default: public/drum-machine.html)' },
        css: { type: 'string', description: 'CSS file path (default: public/css/drum-machine.css)' },
        include_maps: { type: 'boolean', description: 'Include source map files' },
        dry_run: { type: 'boolean' },
        verbose: { type: 'boolean' },
      },
    },
    build: (i) => {
      const a = ['deploy', 'drum-machine'];
      if (i.dist_dir) a.push('--dist-dir', i.dist_dir as string);
      if (i.html) a.push('--html', i.html as string);
      if (i.css) a.push('--css', i.css as string);
      if (i.include_maps) a.push('--include-maps');
      if (i.dry_run) a.push('--dry-run');
      if (i.verbose) a.push('--verbose');
      return a;
    },
  },
  {
    name: 'deploy_recent',
    description: 'Deploy recently changed files to Neocities (uses Git history)',
    inputSchema: {
      type: 'object',
      properties: {
        since: { type: 'string', description: 'Time period for changes (default: "24 hours ago")' },
        commit: { type: 'string', description: 'Deploy files changed since a specific commit hash' },
        pattern: { type: 'string', description: 'File pattern to filter (e.g. "public/music/*")' },
        dry_run: { type: 'boolean' },
        verbose: { type: 'boolean' },
      },
    },
    build: (i) => {
      const a = ['deploy', 'recent'];
      if (i.since) a.push('--since', i.since as string);
      if (i.commit) a.push('--commit', i.commit as string);
      if (i.pattern) a.push('--pattern', i.pattern as string);
      if (i.dry_run) a.push('--dry-run');
      if (i.verbose) a.push('--verbose');
      return a;
    },
  },
  {
    name: 'deploy_full',
    description: 'Deploy the entire site (all files from public/) to Neocities',
    inputSchema: {
      type: 'object',
      properties: {
        public_dir: { type: 'string', description: 'Public directory path (default: public)' },
        force: { type: 'boolean', description: 'Skip confirmation prompt' },
        dry_run: { type: 'boolean' },
        verbose: { type: 'boolean' },
      },
    },
    build: (i) => {
      const a = ['deploy', 'full'];
      if (i.public_dir) a.push('--public-dir', i.public_dir as string);
      if (i.force) a.push('--force');
      if (i.dry_run) a.push('--dry-run');
      if (i.verbose) a.push('--verbose');
      return a;
    },
  },
  {
    name: 'deploy_all',
    description: 'Deploy all site components to Neocities (config → music → musings → drum-machine)',
    inputSchema: {
      type: 'object',
      properties: {
        skip: { type: 'array', items: { type: 'string' }, description: 'Components to skip (e.g. ["drum-machine"])' },
        continue_on_error: { type: 'boolean', description: 'Continue if a deployment step fails' },
        force: { type: 'boolean' },
        delete_orphans: { type: 'boolean' },
        dry_run: { type: 'boolean' },
        verbose: { type: 'boolean' },
      },
    },
    build: (i) => {
      const a = ['deploy', 'all'];
      const skip = i.skip as string[] | undefined;
      if (skip?.length) a.push('--skip', ...skip);
      if (i.continue_on_error) a.push('--continue-on-error');
      if (i.force) a.push('--force');
      if (i.delete_orphans) a.push('--delete-orphans');
      if (i.dry_run) a.push('--dry-run');
      if (i.verbose) a.push('--verbose');
      return a;
    },
  },

  // ── BUILD ─────────────────────────────────────────────────────────────────
  {
    name: 'build_musings',
    description: 'Build markdown blog posts from thoughts-and-musings/ to HTML',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source directory (default: thoughts-and-musings)' },
        output: { type: 'string', description: 'Output directory (default: public/musings)' },
        blog_images: { type: 'string', description: 'Blog images directory (default: public/assets/blog-images)' },
        no_process_photos: { type: 'boolean', description: 'Skip photo processing step' },
        verbose: { type: 'boolean' },
      },
    },
    build: (i) => {
      const a = ['build', 'musings'];
      if (i.source) a.push('--source', i.source as string);
      if (i.output) a.push('--output', i.output as string);
      if (i.blog_images) a.push('--blog-images', i.blog_images as string);
      if (i.no_process_photos) a.push('--no-process-photos');
      if (i.verbose) a.push('--verbose');
      return a;
    },
  },
  {
    name: 'build_all',
    description: 'Run the complete blog build workflow (sync images + build musings)',
    inputSchema: {
      type: 'object',
      properties: { verbose: { type: 'boolean' } },
    },
    build: (i) => {
      const a = ['build', 'all'];
      if (i.verbose) a.push('--verbose');
      return a;
    },
  },

  // ── MEDIA ─────────────────────────────────────────────────────────────────
  {
    name: 'media_sync_images',
    description: 'Sync Obsidian images to the blog images directory',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source directory (default: thoughts-and-musings)' },
        dest: { type: 'string', description: 'Destination directory (default: public/assets/blog-images)' },
        force: { type: 'boolean', description: 'Force re-copy all images' },
        verbose: { type: 'boolean' },
      },
    },
    build: (i) => {
      const a = ['media', 'sync-images'];
      if (i.source) a.push('--source', i.source as string);
      if (i.dest) a.push('--dest', i.dest as string);
      if (i.force) a.push('--force');
      if (i.verbose) a.push('--verbose');
      return a;
    },
  },
  {
    name: 'media_photos',
    description: 'Process photos with ImageMagick (resize/convert)',
    inputSchema: {
      type: 'object',
      required: ['size', 'format'],
      properties: {
        size: { type: 'string', description: 'Target size in pixels (e.g. "512")' },
        format: { type: 'string', description: 'Output format (e.g. "jpg", "png", "webp")' },
        pattern: { type: 'string', description: 'Naming pattern (e.g. "photo{increment}")' },
        script: { type: 'string', description: 'Path to processing script (default: process_photos/run_me.sh)' },
        verbose: { type: 'boolean' },
      },
    },
    build: (i) => {
      const a = ['media', 'photos', i.size as string, i.format as string];
      if (i.pattern) a.push(i.pattern as string);
      if (i.script) a.push('--script', i.script as string);
      if (i.verbose) a.push('--verbose');
      return a;
    },
  },
  {
    name: 'media_videos',
    description: 'Process videos with FFmpeg using a preset (web-mp4, extract-audio, web-ready, gif)',
    inputSchema: {
      type: 'object',
      properties: {
        preset: { type: 'string', enum: ['web-mp4', 'extract-audio', 'web-ready', 'gif'], description: 'Processing preset name' },
        input: { type: 'string', description: 'Input video file (required when using a preset)' },
        conversions: { type: 'string', description: 'JSON array of conversion mappings' },
        script: { type: 'string', description: 'Path to processing script (default: process_video/convert_videos.sh)' },
        verbose: { type: 'boolean' },
      },
    },
    build: (i) => {
      const a = ['media', 'videos'];
      if (i.preset) a.push('--preset', i.preset as string);
      if (i.input) a.push('--input', i.input as string);
      if (i.conversions) a.push('--conversions', i.conversions as string);
      if (i.script) a.push('--script', i.script as string);
      if (i.verbose) a.push('--verbose');
      return a;
    },
  },
  {
    name: 'media_gif',
    description: 'Create an animated GIF from a video file using FFmpeg two-pass palette method',
    inputSchema: {
      type: 'object',
      required: ['input'],
      properties: {
        input: { type: 'string', description: 'Input video file path' },
        output: { type: 'string', description: 'Output filename (default: <basename>.gif)' },
        output_dir: { type: 'string', description: 'Output directory (default: public/assets/)' },
        start: { type: 'string', description: 'Start time in seconds or HH:MM:SS (default: 0)' },
        duration: { type: 'string', description: 'Duration in seconds to convert' },
        fps: { type: 'string', description: 'Frames per second (default: 12)' },
        width: { type: 'string', description: 'Output width in pixels, height auto (default: 480)' },
        loop: { type: 'string', description: 'Loop count: 0=infinite, -1=no loop (default: 0)' },
        verbose: { type: 'boolean', description: 'Show ffmpeg output' },
      },
    },
    build: (i) => {
      const a = ['media', 'gif', '--input', i.input as string];
      if (i.output) a.push('--output', i.output as string);
      if (i.output_dir) a.push('--output-dir', i.output_dir as string);
      if (i.start) a.push('--start', i.start as string);
      if (i.duration) a.push('--duration', i.duration as string);
      if (i.fps) a.push('--fps', i.fps as string);
      if (i.width) a.push('--width', i.width as string);
      if (i.loop) a.push('--loop', i.loop as string);
      if (i.verbose) a.push('--verbose');
      return a;
    },
  },
  {
    name: 'media_list_video_presets',
    description: 'List all available video processing presets',
    inputSchema: { type: 'object', properties: {} },
    build: () => ['media', 'list-video-presets'],
  },

  // ── CHECK ─────────────────────────────────────────────────────────────────
  {
    name: 'check_deps',
    description: 'Check that system dependencies are installed (FFmpeg, ImageMagick, ffprobe, jq)',
    inputSchema: {
      type: 'object',
      properties: { verbose: { type: 'boolean' } },
    },
    build: (i) => {
      const a = ['check', 'deps'];
      if (i.verbose) a.push('--verbose');
      return a;
    },
  },
  {
    name: 'check_storage',
    description: 'Check Neocities storage usage (used/remaining for free and supporter tiers)',
    inputSchema: {
      type: 'object',
      properties: {
        verbose: { type: 'boolean', description: 'Show top files by size' },
        json: { type: 'boolean', description: 'Output as JSON' },
      },
    },
    build: (i) => {
      const a = ['check', 'storage'];
      if (i.verbose) a.push('--verbose');
      if (i.json) a.push('--json');
      return a;
    },
  },

  // ── CLEANUP ───────────────────────────────────────────────────────────────
  {
    name: 'cleanup',
    description: 'Clean unwanted files from Neocities (.DS_Store, .ogg, drum-machine backups, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        dry_run: { type: 'boolean', description: 'Show what would be deleted without deleting' },
        force: { type: 'boolean', description: 'Skip confirmation prompt' },
        include: { type: 'array', items: { type: 'string' }, description: 'Only include these categories (system, media, backup)' },
        exclude: { type: 'array', items: { type: 'string' }, description: 'Exclude these categories' },
        verbose: { type: 'boolean' },
      },
    },
    build: (i) => {
      const a = ['cleanup'];
      if (i.dry_run) a.push('--dry-run');
      if (i.force) a.push('--force');
      const inc = i.include as string[] | undefined;
      const exc = i.exclude as string[] | undefined;
      if (inc?.length) a.push('--include', ...inc);
      if (exc?.length) a.push('--exclude', ...exc);
      if (i.verbose) a.push('--verbose');
      return a;
    },
  },
];

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'xalpheric-neocities', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: input = {} } = request.params;
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) {
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }
  try {
    const args = tool.build(input as Record<string, unknown>);
    const output = run(args);
    return { content: [{ type: 'text', text: output }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: msg }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`MCP server error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
