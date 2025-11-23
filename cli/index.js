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
  .description('Deploy drum machine build artifacts (HTML, CSS, JS from dist)')
  .option('--dist-dir <path>', 'Drum machine dist directory', '../drum-machine/dist')
  .option('--html <path>', 'HTML file path', 'public/drum-machine.html')
  .option('--css <path>', 'CSS file path', 'public/css/drum-machine.css')
  .option('--include-maps', 'Include source map files')
  .option('--dry-run', 'Show what would be deployed without uploading')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const { getApiKey } = require('./lib/utils/config');
      const deployDrumMachine = require('./commands/deploy/drum-machine');
      
      const apiKey = getApiKey(true);
      
      await deployDrumMachine(apiKey, {
        distDir: options.distDir,
        htmlFile: options.html,
        cssFile: options.css,
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
  .action(() => {
    console.log('⏳ Build musings command - coming in Phase 4');
  });

// Media command group
const mediaCommand = program
  .command('media')
  .description('Process media files');

mediaCommand
  .command('photos <size> <format>')
  .description('Process photos')
  .argument('[pattern]', 'Naming pattern (e.g., photo{increment})')
  .action(() => {
    console.log('⏳ Media photos command - coming in Phase 4');
  });

// Utility commands
program
  .command('check')
  .argument('<type>', 'Type to check (storage, deps)')
  .description('Check storage usage or dependencies')
  .action(() => {
    console.log('⏳ Check command - coming in Phase 5');
  });

program
  .command('cleanup')
  .description('Clean unwanted files from Neocities')
  .option('--dry-run', 'Show what would be deleted without deleting')
  .action(() => {
    console.log('⏳ Cleanup command - coming in Phase 5');
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
