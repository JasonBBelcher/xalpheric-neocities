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
      if (command === 'magick') {
        execSync('brew install imagemagick', { stdio: 'inherit' });
      }
    } else if (platform === 'linux') {
      // Linux - try apt first, then yum
      console.log('📦 Trying apt package manager...');
      if (command === 'magick') {
        execSync('sudo apt update && sudo apt install -y imagemagick', { stdio: 'inherit' });
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
      command: 'magick',
      name: 'ImageMagick',
      installInstructions: {
        'macOS': 'brew install imagemagick',
        'Ubuntu/Debian': 'sudo apt install imagemagick',
        'RHEL/CentOS': 'sudo yum install ImageMagick',
        'Windows': 'Download from https://imagemagick.org/script/download.php'
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

if (args.length < 2) {
  console.log('Usage: node process-photos.js <size> <format> [naming_pattern]');
  console.log('Examples:');
  console.log('  node process-photos.js 512x512 jpg');
  console.log('  node process-photos.js 512x512 jpg studio{increment}');
  console.log('  node process-photos.js 512x512 png photo{increment}');
  process.exit(1);
}

const size = args[0];
const format = args[1];
const naming = args[2] || '';

// Build the command
const scriptPath = path.join(__dirname, 'process_photos', 'run_me.sh');
let command = `cd process_photos && ./run_me.sh ${size} ${format}`;

  if (naming) {
    command += ` "${naming}"`;
  }

  try {
    console.log(`🎯 Running: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: __dirname });
  } catch (error) {
    console.error('❌ Photo processing failed:', error.message);
    process.exit(1);
  }
})();
