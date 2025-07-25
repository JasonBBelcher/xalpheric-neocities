#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');

// Dependency checking functions
function checkCommand(command, installInstructions) {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    console.error(`❌ ${command} is not installed or not in PATH`);
    console.log(`💡 Install instructions:`);
    Object.entries(installInstructions).forEach(([platform, instruction]) => {
      console.log(`   ${platform}: ${instruction}`);
    });
    return false;
  }
}

async function promptInstall(missing) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`\n🤔 Would you like me to attempt to install the missing dependencies? (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function attemptInstall(command) {
  console.log(`\n🔧 Attempting to install ${command}...`);
  
  try {
    // Detect platform and try appropriate package manager
    const platform = process.platform;
    
    if (platform === 'darwin') {
      // macOS - try homebrew
      console.log('📦 Using Homebrew...');
      if (command === 'ffmpeg') {
        execSync('brew install ffmpeg', { stdio: 'inherit' });
      } else if (command === 'jq') {
        execSync('brew install jq', { stdio: 'inherit' });
      }
    } else if (platform === 'linux') {
      // Linux - try apt first
      console.log('📦 Trying apt package manager...');
      if (command === 'ffmpeg') {
        execSync('sudo apt update && sudo apt install -y ffmpeg', { stdio: 'inherit' });
      } else if (command === 'jq') {
        execSync('sudo apt update && sudo apt install -y jq', { stdio: 'inherit' });
      }
    } else {
      throw new Error(`Automatic installation not supported on ${platform}`);
    }
    
    console.log(`✅ ${command} installation completed!`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to install ${command}: ${error.message}`);
    return false;
  }
}

async function checkDependencies() {
  console.log('🔍 Checking dependencies...\n');
  
  const dependencies = [
    {
      command: 'ffmpeg',
      name: 'FFmpeg',
      installInstructions: {
        'macOS': 'brew install ffmpeg',
        'Ubuntu/Debian': 'sudo apt install ffmpeg',
        'RHEL/CentOS': 'sudo yum install ffmpeg',
        'Windows': 'Download from https://ffmpeg.org/download.html'
      }
    },
    {
      command: 'ffprobe',
      name: 'FFprobe (video analysis)',
      installInstructions: {
        'macOS': 'brew install ffmpeg (includes ffprobe)',
        'Ubuntu/Debian': 'sudo apt install ffmpeg (includes ffprobe)',
        'RHEL/CentOS': 'sudo yum install ffmpeg (includes ffprobe)',
        'Windows': 'Download ffmpeg from https://ffmpeg.org/download.html'
      }
    },
    {
      command: 'jq',
      name: 'jq (JSON processor)',
      installInstructions: {
        'macOS': 'brew install jq',
        'Ubuntu/Debian': 'sudo apt install jq',
        'RHEL/CentOS': 'sudo yum install jq',
        'Windows': 'Download from https://jqlang.github.io/jq/download/'
      }
    }
  ];

  const missing = [];
  
  for (const dep of dependencies) {
    console.log(`Checking ${dep.name}...`);
    if (!checkCommand(dep.command, dep.installInstructions)) {
      missing.push(dep);
    } else {
      console.log(`✅ ${dep.name} is available`);
    }
  }

  if (missing.length > 0) {
    console.log(`\n❌ Missing ${missing.length} required dependencies`);
    
    const shouldInstall = await promptInstall(missing);
    
    if (shouldInstall) {
      let allInstalled = true;
      for (const dep of missing) {
        const success = await attemptInstall(dep.command);
        if (!success) {
          allInstalled = false;
        }
      }
      
      if (!allInstalled) {
        console.log('\n❌ Some dependencies could not be installed automatically.');
        console.log('💡 Please install them manually and try again.');
        process.exit(1);
      }
    } else {
      console.log('\n❌ Cannot proceed without required dependencies.');
      console.log('💡 Please install them manually and try again.');
      process.exit(1);
    }
  }

  console.log('\n✅ All dependencies are available!\n');
}

// Main execution
(async () => {
  // Check dependencies first
  await checkDependencies();

  // Get command line arguments
  const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('❌ Error: No conversion mapping provided');
  console.log('💡 Usage: node process-video.js \'[{"inputName":"input.mp4","outputName":"output.mp3"}]\'');
  console.log('💡 Or use preset: node process-video.js --preset <preset-name> <input-file>');
  console.log('');
  console.log('📖 Examples:');
  console.log('  node process-video.js \'[{"inputName":"video1.mp4","outputName":"audio1.mp3"}]\'');
  console.log('  node process-video.js \'[{"inputName":"clip.MOV","outputName":"clip.mp4"},{"inputName":"video.mp4","outputName":"audio.wav"}]\'');
  console.log('');
  console.log('🎯 Available presets for iOS videos:');
  console.log('  --preset web-mp4 video.MOV      # Convert to web-optimized MP4');
  console.log('  --preset extract-audio video.MOV # Extract MP3 audio');
  console.log('  --preset web-ready video.MOV     # Create both MP4 and MP3');
  console.log('  --preset gif video.MOV           # Create animated GIF');
  process.exit(1);
}

// Handle preset commands
if (args[0] === '--preset') {
  if (args.length < 3) {
    console.error('❌ Error: Preset requires preset name and input file');
    console.error('💡 Usage: node process-video.js --preset <preset-name> <input-file>');
    process.exit(1);
  }
  
  const presetName = args[1];
  const inputFile = args[2];
  const baseName = path.basename(inputFile, path.extname(inputFile));
  
  let conversions = [];
  
  switch (presetName) {
    case 'web-mp4':
      conversions = [{ inputName: inputFile, outputName: `${baseName}.mp4` }];
      console.log('🎯 Preset: Converting iOS video to web-optimized MP4');
      break;
      
    case 'extract-audio':
      conversions = [{ inputName: inputFile, outputName: `${baseName}.mp3` }];
      console.log('🎯 Preset: Extracting audio to MP3');
      break;
      
    case 'web-ready':
      conversions = [
        { inputName: inputFile, outputName: `${baseName}.mp4` },
        { inputName: inputFile, outputName: `${baseName}.mp3` }
      ];
      console.log('🎯 Preset: Creating web-ready MP4 video and MP3 audio');
      break;
      
    case 'gif':
      conversions = [{ inputName: inputFile, outputName: `${baseName}.gif` }];
      console.log('🎯 Preset: Converting to animated GIF');
      break;
      
    default:
      console.error(`❌ Error: Unknown preset "${presetName}"`);
      console.error('💡 Available presets: web-mp4, extract-audio, web-ready, gif');
      process.exit(1);
  }
  
  const conversionsJson = JSON.stringify(conversions);
  console.log(`📋 Generated conversion mapping: ${conversionsJson}`);
  
  // Build and run the command
  const command = `cd process_video && ./convert_videos.sh '${conversionsJson}'`;
  
  try {
    console.log(`🎯 Running: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Preset conversion completed!');
  } catch (error) {
    console.error('❌ Video processing failed:', error.message);
    process.exit(1);
  }
  
  return;
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
})();
