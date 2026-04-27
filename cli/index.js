#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();

// Load environment variables
require('./lib/utils/config').loadEnvFile();

program
  .name('neocities')
  .description('Unified CLI for Neocities deployment and management')
  .version('1.0.0');

// Deploy command group
const deployCommand = program
  .command('deploy')
  .description('Deploy files to Neocities');

// Deploy commands
deployCommand
  .command('music')
  .description('Deploy music files based on releases.json')
  .option('-f, --force', 'Force upload all files, even if they exist remotely')
  .option('--delete-orphans', 'Delete orphaned remote files not in config')
  .option('--dry-run', 'Simulate deployment without making changes')
  .option('-v, --verbose', 'Verbose output')
  .option('--music-dir <path>', 'Music directory path', 'public/music')
  .option('--config <path>', 'Path to releases.json', 'public/config/releases.json')
  .action(async (options) => {
    try {
      const { getApiKey } = require('./lib/utils/config');
      const deployMusic = require('./commands/deploy/music');
      
      const apiKey = getApiKey(true);
      
      await deployMusic(apiKey, {
        musicDir: options.musicDir,
        configFile: options.config,
        force: options.force,
        deleteOrphans: options.deleteOrphans,
        dryRun: options.dryRun,
        verbose: options.verbose
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

deployCommand
  .command('musings')
  .description('Deploy blog posts (HTML files in musings directory)')
  .option('-f, --force', 'Force upload all files, even if they exist remotely')
  .option('--delete-orphans', 'Delete orphaned remote files not present locally')
  .option('--dry-run', 'Simulate deployment without making changes')
  .option('-v, --verbose', 'Verbose output')
  .option('--musings-dir <path>', 'Musings directory path', 'public/musings')
  .action(async (options) => {
    try {
      const { getApiKey } = require('./lib/utils/config');
      const deployMusings = require('./commands/deploy/musings');
      
      const apiKey = getApiKey(true);
      
      await deployMusings(apiKey, {
        musingsDir: options.musingsDir,
        force: options.force,
        deleteOrphans: options.deleteOrphans,
        dryRun: options.dryRun,
        verbose: options.verbose
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

deployCommand
  .command('config')
  .description('Deploy configuration files (releases.json, default album art)')
  .option('--files <files...>', 'Specific files to deploy (uses defaults if not specified)')
  .option('--dry-run', 'Simulate deployment without uploading')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const { getApiKey } = require('./lib/utils/config');
      const deployConfig = require('./commands/deploy/config');
      
      const apiKey = getApiKey(true);
      
      await deployConfig(apiKey, {
        files: options.files,
        dryRun: options.dryRun,
        verbose: options.verbose
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

deployCommand
  .command('drum-machine')
  .description('Deploy drum machine HTML + JS/CSS bundles from public/')
  .option('--html <path>', 'HTML file path', 'public/drum-machine.html')
  .option('--js-dir <path>', 'JS/CSS bundle directory', 'public/js/drum-machine')
  .option('--include-maps', 'Include source map files')
  .option('--dry-run', 'Show what would be deployed without uploading')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const { getApiKey } = require('./lib/utils/config');
      const deployDrumMachine = require('./commands/deploy/drum-machine');

      const apiKey = getApiKey(true);

      await deployDrumMachine(apiKey, {
        htmlFile: options.html,
        jsDir: options.jsDir,
        includeMaps: options.includeMaps,
        dryRun: options.dryRun,
        verbose: options.verbose
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

deployCommand
  .command('recent')
  .description('Deploy recently changed files (requires Git)')
  .option('--since <period>', 'Time period for changes', '24 hours ago')
  .option('--commit <hash>', 'Deploy files changed since specific commit')
  .option('--pattern <pattern>', 'File pattern to filter (e.g., "public/music/*")')
  .option('--dry-run', 'Simulate deployment without uploading')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const { getApiKey } = require('./lib/utils/config');
      const deployRecent = require('./commands/deploy/recent');
      
      const apiKey = getApiKey(true);
      
      await deployRecent(apiKey, {
        since: options.since,
        commit: options.commit,
        pattern: options.pattern,
        dryRun: options.dryRun,
        verbose: options.verbose
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

deployCommand
  .command('full')
  .description('Deploy entire site (all files from public directory)')
  .option('--public-dir <path>', 'Public directory path', 'public')
  .option('-f, --force', 'Skip confirmation prompt')
  .option('--dry-run', 'Simulate deployment without uploading')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const { getApiKey } = require('./lib/utils/config');
      const deployFull = require('./commands/deploy/full');
      
      const apiKey = getApiKey(true);
      
      await deployFull(apiKey, {
        publicDir: options.publicDir,
        force: options.force,
        dryRun: options.dryRun,
        verbose: options.verbose
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

deployCommand
  .command('all')
  .description('Deploy all site components (config, music, musings, drum-machine)')
  .option('--skip <commands...>', 'Commands to skip (e.g., "drum-machine")')
  .option('--continue-on-error', 'Continue if a deployment fails', true)
  .option('-f, --force', 'Force operations without confirmation')
  .option('--delete-orphans', 'Delete orphaned files')
  .option('--dry-run', 'Simulate deployment without uploading')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const { getApiKey } = require('./lib/utils/config');
      const deployAll = require('./commands/deploy/all');
      
      const apiKey = getApiKey(true);
      
      await deployAll(apiKey, {
        skip: options.skip || [],
        continueOnError: options.continueOnError,
        force: options.force,
        deleteOrphans: options.deleteOrphans,
        dryRun: options.dryRun,
        verbose: options.verbose
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Build command group
const buildCommand = program
  .command('build')
  .description('Build site content');

buildCommand
  .command('musings')
  .description('Build markdown blog posts to HTML')
  .option('--source <dir>', 'Source directory containing markdown files', 'thoughts-and-musings')
  .option('--output <dir>', 'Output directory for HTML files', 'public/musings')
  .option('--blog-images <dir>', 'Directory for blog images', 'public/assets/blog-images')
  .option('--no-process-photos', 'Skip photo processing before build')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const buildMusings = require('./commands/build/musings');
      
      await buildMusings({
        source: options.source,
        output: options.output,
        blogImagesDir: options.blogImages,
        processPhotos: options.processPhotos,
        verbose: options.verbose
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

buildCommand
  .command('all')
  .description('Run complete blog build workflow (sync images + build musings)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const buildAll = require('./commands/build/all');
      
      await buildAll({
        verbose: options.verbose
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Media command group
const mediaCommand = program
  .command('media')
  .description('Process media files');

mediaCommand
  .command('sync-images')
  .description('Sync Obsidian images to blog images directory')
  .option('--source <dir>', 'Source directory containing markdown files', 'thoughts-and-musings')
  .option('--dest <dir>', 'Destination directory for images', 'public/assets/blog-images')
  .option('-f, --force', 'Force re-copy all images')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const syncImages = require('./commands/media/sync-images');
      
      await syncImages({
        source: options.source,
        dest: options.dest,
        force: options.force,
        verbose: options.verbose
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

mediaCommand
  .command('photos <size> <format>')
  .description('Process photos with ImageMagick')
  .argument('[pattern]', 'Naming pattern (e.g., photo{increment})')
  .option('--script <path>', 'Path to processing script', 'process_photos/run_me.sh')
  .option('-v, --verbose', 'Verbose output')
  .action(async (size, format, pattern, options) => {
    try {
      const processPhotos = require('./commands/media/photos');
      
      await processPhotos({
        size,
        format,
        naming: pattern,
        scriptPath: options.script,
        verbose: options.verbose
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

mediaCommand
  .command('videos')
  .description('Process videos with FFmpeg')
  .option('-c, --conversions <json>', 'JSON array of conversion mappings')
  .option('-p, --preset <name>', 'Preset name (web-mp4, extract-audio, web-ready, gif)')
  .option('-i, --input <file>', 'Input file (required with preset)')
  .option('--script <path>', 'Path to processing script', 'process_video/convert_videos.sh')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const processVideos = require('./commands/media/videos');
      
      await processVideos({
        conversions: options.conversions,
        preset: options.preset,
        input: options.input,
        scriptPath: options.script,
        verbose: options.verbose
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

mediaCommand
  .command('gif')
  .description('Create an animated GIF from a video file')
  .requiredOption('-i, --input <file>', 'Input video file')
  .option('-o, --output <name>', 'Output filename (default: input basename + .gif)')
  .option('-d, --output-dir <path>', 'Output directory', 'public/assets/')
  .option('-s, --start <time>', 'Start time (seconds or HH:MM:SS)', '0')
  .option('-t, --duration <seconds>', 'Duration in seconds')
  .option('--fps <number>', 'Frames per second', '12')
  .option('-w, --width <pixels>', 'Output width in pixels', '480')
  .option('--loop <count>', 'Loop count (0=infinite, -1=no loop)', '0')
  .option('-v, --verbose', 'Show ffmpeg output')
  .action(async (options) => {
    try {
      const createGif = require('./commands/media/gif');
      await createGif({
        input: options.input,
        output: options.output,
        outputDir: options.outputDir,
        start: options.start,
        duration: options.duration,
        fps: options.fps,
        width: options.width,
        loop: options.loop,
        verbose: options.verbose
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

mediaCommand
  .command('list-video-presets')
  .description('List available video processing presets')
  .action(() => {
    const { PRESETS } = require('./commands/media/videos');
    
    console.log('\n📋 Available video presets:\n');
    Object.entries(PRESETS).forEach(([key, preset]) => {
      console.log(`  ${key.padEnd(15)} - ${preset.description}`);
    });
    console.log();
  });

// Check command group
const checkCommand = program
  .command('check')
  .description('Check system dependencies and storage');

checkCommand
  .command('deps')
  .description('Check system and Node.js dependencies')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const checkDeps = require('./commands/check/deps');
      
      const result = await checkDeps({
        verbose: options.verbose
      });
      
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

checkCommand
  .command('storage')
  .description('Check Neocities storage usage')
  .option('-v, --verbose', 'Show top files by size')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const { getApiKey } = require('./lib/utils/config');
      const checkStorage = require('./commands/check/storage');
      
      const apiKey = getApiKey(true);
      
      await checkStorage(apiKey, {
        verbose: options.verbose,
        json: options.json
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Cleanup command
program
  .command('cleanup')
  .description('Clean unwanted files from Neocities')
  .option('--dry-run', 'Show what would be deleted without deleting')
  .option('-f, --force', 'Skip confirmation prompt')
  .option('--include <categories...>', 'Only include specific categories (system, media, backup)')
  .option('--exclude <categories...>', 'Exclude specific categories')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const { getApiKey } = require('./lib/utils/config');
      const cleanup = require('./commands/cleanup');
      
      const apiKey = getApiKey(true);
      
      await cleanup(apiKey, {
        dryRun: options.dryRun,
        force: options.force,
        include: options.include,
        exclude: options.exclude,
        verbose: options.verbose
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
