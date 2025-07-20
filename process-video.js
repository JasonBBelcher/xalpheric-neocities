#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('❌ Error: No conversion mapping provided');
  console.log('💡 Usage: node process-video.js \'[{"inputName":"input.mp4","outputName":"output.mp3"}]\'');
  console.log('');
  console.log('📖 Examples:');
  console.log('  node process-video.js \'[{"inputName":"video1.mp4","outputName":"audio1.mp3"}]\'');
  console.log('  node process-video.js \'[{"inputName":"clip.MOV","outputName":"clip.mp4"},{"inputName":"video.mp4","outputName":"audio.wav"}]\'');
  process.exit(1);
}

const conversionsJson = args[0];

// Validate JSON format
try {
  const conversions = JSON.parse(conversionsJson);
  
  if (!Array.isArray(conversions)) {
    throw new Error('Conversion mapping must be an array');
  }
  
  for (let i = 0; i < conversions.length; i++) {
    const conversion = conversions[i];
    if (!conversion.inputName || !conversion.outputName) {
      throw new Error(`Conversion ${i + 1} missing inputName or outputName`);
    }
  }
  
  console.log(`🎬 Processing ${conversions.length} video conversion(s)...`);
  
} catch (error) {
  console.error('❌ Error: Invalid JSON format');
  console.error('💡 Expected format: [{"inputName":"input.mp4","outputName":"output.mp3"}]');
  console.error('🔍 Error details:', error.message);
  process.exit(1);
}

// Build the command
const scriptPath = path.join(__dirname, 'process_video', 'convert_videos.sh');
const command = `cd process_video && ./convert_videos.sh '${conversionsJson}'`;

try {
  console.log(`🎯 Running: ${command}`);
  execSync(command, { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.error('❌ Video processing failed:', error.message);
  process.exit(1);
}
