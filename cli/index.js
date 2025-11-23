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

// Placeholder deploy commands (will be implemented in Phase 2)
deployCommand
  .command('music')
  .description('Deploy music files')
  .option('--force', 'Deploy all files, not just changed')
  .option('--skip-orphan-check', 'Skip orphan detection')
  .option('-v, --verbose', 'Verbose output')
  .action(() => {
    console.log('⏳ Music deployment command - coming in Phase 2');
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
