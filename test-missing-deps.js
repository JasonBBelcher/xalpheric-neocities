#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

// Dependency checking functions (copied from our scripts)
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

async function checkDependencies() {
  console.log('🔍 Testing missing dependency scenario...\n');
  
  const dependencies = [
    {
      command: 'totally-fake-command-that-does-not-exist',
      name: 'Fake Command (for testing)',
      installInstructions: {
        'macOS': 'brew install fake-package',
        'Ubuntu/Debian': 'sudo apt install fake-package',
        'Windows': 'Download from https://fake-url.com'
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
      console.log('\n❌ Automatic installation would fail (this is a test)');
      console.log('💡 Please install them manually and try again.');
      process.exit(1);
    } else {
      console.log('\n❌ Cannot proceed without required dependencies.');
      console.log('💡 Please install them manually and try again.');
      process.exit(1);
    }
  }

  console.log('\n✅ All dependencies are available!\n');
}

// Test the dependency checking
checkDependencies();
