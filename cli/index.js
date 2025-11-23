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
  .description('Deploy blog posts')
  .option('--dry-run', 'Show what would be deployed without uploading')
  .action(() => {
    console.log('⏳ Musings deployment command - coming in Phase 2');
  });

deployCommand
  .command('config')
  .description('Deploy configuration files')
  .action(() => {
    console.log('⏳ Config deployment command - coming in Phase 2');
  });

deployCommand
  .command('drum-machine')
  .description('Deploy drum machine build artifacts')
  .option('--dry-run', 'Show what would be deployed without uploading')
  .option('-v, --verbose', 'Verbose output')
  .action(() => {
    console.log('⏳ Drum machine deployment command - coming in Phase 2');
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
