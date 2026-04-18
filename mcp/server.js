#!/usr/bin/env node

/**
 * MCP server for the xalpheric-neocities CLI.
 * Each CLI command is exposed as an MCP tool.
 * Commands run as child processes so all output is captured naturally.
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { spawnSync } = require('child_process');
const path = require('path');

const CLI = path.resolve(__dirname, '../cli/index.js');
const CWD = path.resolve(__dirname, '..');

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd: CWD,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
    timeout: options.timeout || 120000
  });
  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();
  const output = [stdout, stderr].filter(Boolean).join('\n');
  if (result.status !== 0) {
    throw new Error(output || `Process exited with code ${result.status}`);
  }
  return output || 'Done.';
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
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
        verbose: { type: 'boolean' }
      }
    },
    build: (i) => {
      const args = ['deploy', 'music'];
      if (i.force) args.push('--force');
      if (i.delete_orphans) args.push('--delete-orphans');
      if (i.dry_run) args.push('--dry-run');
      if (i.music_dir) args.push('--music-dir', i.music_dir);
      if (i.config) args.push('--config', i.config);
      if (i.verbose) args.push('--verbose');
      return args;
    }
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
        verbose: { type: 'boolean' }
      }
    },
    build: (i) => {
      const args = ['deploy', 'musings'];
      if (i.force) args.push('--force');
      if (i.delete_orphans) args.push('--delete-orphans');
      if (i.dry_run) args.push('--dry-run');
      if (i.musings_dir) args.push('--musings-dir', i.musings_dir);
      if (i.verbose) args.push('--verbose');
      return args;
    }
  },
  {
    name: 'deploy_config',
    description: 'Deploy configuration files (releases.json, default album art) to Neocities',
    inputSchema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' }, description: 'Specific files to deploy' },
        dry_run: { type: 'boolean' },
        verbose: { type: 'boolean' }
      }
    },
    build: (i) => {
      const args = ['deploy', 'config'];
      if (i.files && i.files.length) args.push('--files', ...i.files);
      if (i.dry_run) args.push('--dry-run');
      if (i.verbose) args.push('--verbose');
      return args;
    }
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
        verbose: { type: 'boolean' }
      }
    },
    build: (i) => {
      const args = ['deploy', 'drum-machine'];
      if (i.dist_dir) args.push('--dist-dir', i.dist_dir);
      if (i.html) args.push('--html', i.html);
      if (i.css) args.push('--css', i.css);
      if (i.include_maps) args.push('--include-maps');
      if (i.dry_run) args.push('--dry-run');
      if (i.verbose) args.push('--verbose');
      return args;
    }
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
        verbose: { type: 'boolean' }
      }
    },
    build: (i) => {
      const args = ['deploy', 'recent'];
      if (i.since) args.push('--since', i.since);
      if (i.commit) args.push('--commit', i.commit);
      if (i.pattern) args.push('--pattern', i.pattern);
      if (i.dry_run) args.push('--dry-run');
      if (i.verbose) args.push('--verbose');
      return args;
    }
  },
  {
    name: 'deploy_full',
    description: 'Deploy the entire site (all files from public directory) to Neocities',
    inputSchema: {
      type: 'object',
      properties: {
        public_dir: { type: 'string', description: 'Public directory path (default: public)' },
        force: { type: 'boolean', description: 'Skip confirmation prompt' },
        dry_run: { type: 'boolean' },
        verbose: { type: 'boolean' }
      }
    },
    build: (i) => {
      const args = ['deploy', 'full'];
      if (i.public_dir) args.push('--public-dir', i.public_dir);
      if (i.force) args.push('--force');
      if (i.dry_run) args.push('--dry-run');
      if (i.verbose) args.push('--verbose');
      return args;
    }
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
        verbose: { type: 'boolean' }
      }
    },
    build: (i) => {
      const args = ['deploy', 'all'];
      if (i.skip && i.skip.length) args.push('--skip', ...i.skip);
      if (i.continue_on_error) args.push('--continue-on-error');
      if (i.force) args.push('--force');
      if (i.delete_orphans) args.push('--delete-orphans');
      if (i.dry_run) args.push('--dry-run');
      if (i.verbose) args.push('--verbose');
      return args;
    }
  },

  // ── BUILD ─────────────────────────────────────────────────────────────────
  {
    name: 'build_musings',
    description: 'Build markdown blog posts from thoughts-and-musings/ to HTML',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source directory with markdown files (default: thoughts-and-musings)' },
        output: { type: 'string', description: 'Output directory for HTML (default: public/musings)' },
        blog_images: { type: 'string', description: 'Directory for blog images (default: public/assets/blog-images)' },
        no_process_photos: { type: 'boolean', description: 'Skip photo processing step' },
        verbose: { type: 'boolean' }
      }
    },
    build: (i) => {
      const args = ['build', 'musings'];
      if (i.source) args.push('--source', i.source);
      if (i.output) args.push('--output', i.output);
      if (i.blog_images) args.push('--blog-images', i.blog_images);
      if (i.no_process_photos) args.push('--no-process-photos');
      if (i.verbose) args.push('--verbose');
      return args;
    }
  },
  {
    name: 'build_all',
    description: 'Run the complete blog build workflow (sync images + build musings)',
    inputSchema: {
      type: 'object',
      properties: {
        verbose: { type: 'boolean' }
      }
    },
    build: (i) => {
      const args = ['build', 'all'];
      if (i.verbose) args.push('--verbose');
      return args;
    }
  },

  // ── MEDIA ─────────────────────────────────────────────────────────────────
  {
    name: 'media_sync_images',
    description: 'Sync Obsidian images to the blog images directory',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source directory with markdown files (default: thoughts-and-musings)' },
        dest: { type: 'string', description: 'Destination for images (default: public/assets/blog-images)' },
        force: { type: 'boolean', description: 'Force re-copy all images' },
        verbose: { type: 'boolean' }
      }
    },
    build: (i) => {
      const args = ['media', 'sync-images'];
      if (i.source) args.push('--source', i.source);
      if (i.dest) args.push('--dest', i.dest);
      if (i.force) args.push('--force');
      if (i.verbose) args.push('--verbose');
      return args;
    }
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
        verbose: { type: 'boolean' }
      }
    },
    build: (i) => {
      const args = ['media', 'photos', i.size, i.format];
      if (i.pattern) args.push(i.pattern);
      if (i.script) args.push('--script', i.script);
      if (i.verbose) args.push('--verbose');
      return args;
    }
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
        verbose: { type: 'boolean' }
      }
    },
    build: (i) => {
      const args = ['media', 'videos'];
      if (i.preset) args.push('--preset', i.preset);
      if (i.input) args.push('--input', i.input);
      if (i.conversions) args.push('--conversions', i.conversions);
      if (i.script) args.push('--script', i.script);
      if (i.verbose) args.push('--verbose');
      return args;
    }
  },
  {
    name: 'media_gif',
    description: 'Create an animated GIF from a video file using FFmpeg two-pass palette method',
    inputSchema: {
      type: 'object',
      required: ['input'],
      properties: {
        input: { type: 'string', description: 'Input video file path' },
        output: { type: 'string', description: 'Output filename (default: <input-basename>.gif)' },
        output_dir: { type: 'string', description: 'Output directory (default: public/assets/)' },
        start: { type: 'string', description: 'Start time in seconds or HH:MM:SS (default: 0)' },
        duration: { type: 'string', description: 'Duration in seconds to convert' },
        fps: { type: 'string', description: 'Frames per second (default: 12)' },
        width: { type: 'string', description: 'Output width in pixels, height auto (default: 480)' },
        loop: { type: 'string', description: 'Loop count: 0=infinite, -1=no loop (default: 0)' },
        verbose: { type: 'boolean', description: 'Show ffmpeg output' }
      }
    },
    build: (i) => {
      const args = ['media', 'gif', '--input', i.input];
      if (i.output) args.push('--output', i.output);
      if (i.output_dir) args.push('--output-dir', i.output_dir);
      if (i.start) args.push('--start', i.start);
      if (i.duration) args.push('--duration', i.duration);
      if (i.fps) args.push('--fps', i.fps);
      if (i.width) args.push('--width', i.width);
      if (i.loop) args.push('--loop', i.loop);
      if (i.verbose) args.push('--verbose');
      return args;
    }
  },
  {
    name: 'media_list_video_presets',
    description: 'List all available video processing presets',
    inputSchema: { type: 'object', properties: {} },
    build: () => ['media', 'list-video-presets']
  },

  // ── CHECK ─────────────────────────────────────────────────────────────────
  {
    name: 'check_deps',
    description: 'Check that system dependencies are installed (FFmpeg, ImageMagick, ffprobe, jq)',
    inputSchema: {
      type: 'object',
      properties: {
        verbose: { type: 'boolean' }
      }
    },
    build: (i) => {
      const args = ['check', 'deps'];
      if (i.verbose) args.push('--verbose');
      return args;
    }
  },
  {
    name: 'check_storage',
    description: 'Check Neocities storage usage (shows used/remaining for free and supporter tiers)',
    inputSchema: {
      type: 'object',
      properties: {
        verbose: { type: 'boolean', description: 'Show top files by size' },
        json: { type: 'boolean', description: 'Output as JSON' }
      }
    },
    build: (i) => {
      const args = ['check', 'storage'];
      if (i.verbose) args.push('--verbose');
      if (i.json) args.push('--json');
      return args;
    }
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
        verbose: { type: 'boolean' }
      }
    },
    build: (i) => {
      const args = ['cleanup'];
      if (i.dry_run) args.push('--dry-run');
      if (i.force) args.push('--force');
      if (i.include && i.include.length) args.push('--include', ...i.include);
      if (i.exclude && i.exclude.length) args.push('--exclude', ...i.exclude);
      if (i.verbose) args.push('--verbose');
      return args;
    }
  }
];

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'xalpheric-neocities', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: input = {} } = request.params;
  const tool = TOOLS.find(t => t.name === name);
  if (!tool) {
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }

  try {
    const args = tool.build(input);
    const output = run(args);
    return { content: [{ type: 'text', text: output }] };
  } catch (err) {
    return { content: [{ type: 'text', text: err.message }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`MCP server error: ${err.message}\n`);
  process.exit(1);
});
