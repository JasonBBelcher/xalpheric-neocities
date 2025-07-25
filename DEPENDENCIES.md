# Dependency Management System

Your project now has comprehensive dependency checking built into all processing scripts. This ensures that required tools are installed before attempting to run any operations.

## How It Works

Each script now automatically checks for its required dependencies when you run it and offers to help install missing ones.

### Supported Scripts with Dependency Checking

#### 1. Photo Processing (`npm run process-photos`)
**Dependencies:**
- **ImageMagick** (`magick` command)
  - macOS: `brew install imagemagick`
  - Ubuntu/Debian: `sudo apt install imagemagick`
  - RHEL/CentOS: `sudo yum install ImageMagick`
  - Windows: Download from https://imagemagick.org/script/download.php

#### 2. Video Processing (`npm run process-video`)
**Dependencies:**
- **FFmpeg** (`ffmpeg` command)
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt install ffmpeg`
  - RHEL/CentOS: `sudo yum install ffmpeg`
  - Windows: Download from https://ffmpeg.org/download.html

- **jq** (`jq` command) - for JSON processing
  - macOS: `brew install jq`
  - Ubuntu/Debian: `sudo apt install jq`
  - RHEL/CentOS: `sudo yum install jq`

#### 3. Photos Watcher (`npm run watch-photos`)
**Dependencies:**
- **Node.js packages**: `chokidar` (auto-installed)
- **macOS System Tools**:
  - **sqlite3** - for database access method
    - macOS: `brew install sqlite3` (usually pre-installed)
  - **osascript** - for AppleScript method (built into macOS)
- **Photos App** - Must be installed and initialized
- **System Permissions** - Photos access and Full Disk Access
  - Windows: Download from https://jqlang.github.io/jq/download/

#### 3. Deploy Scripts (`npm run deploy`, `npm run deploy-full-refresh`)
**Dependencies:**
- **Node.js packages**: `form-data`, `markdown-it`
  - Install with: `npm install form-data markdown-it`

## Features

### 🔍 Automatic Detection
- Each script checks for its required dependencies at startup
- Clear error messages with installation instructions for each platform
- Supports macOS, Linux (apt/yum), and Windows

### 🛠️ Automated Installation
- Scripts offer to automatically install missing dependencies
- Uses appropriate package managers (Homebrew on macOS, apt on Ubuntu, etc.)
- Graceful fallback to manual installation instructions if auto-install fails

### 📋 Comprehensive Checking
- Run `npm run check-deps` to see the status of all dependencies at once
- Individual scripts provide detailed installation guidance
- No more confusing "command not found" errors

## Usage Examples

### Check All Dependencies
```bash
npm run check-deps
```

### Interactive Installation
When you run a script with missing dependencies:
```bash
npm run process-photos -- 512x512 jpg
# Output:
# 🔍 Checking dependencies...
# ❌ magick is not installed or not in PATH
# 💡 Install instructions:
#    macOS: brew install imagemagick
#    Ubuntu/Debian: sudo apt install imagemagick
# 
# 🤔 Would you like me to attempt to install the missing dependencies? (y/N):
```

Choose 'y' for automatic installation or 'n' for manual installation.

### Successful Run
Once dependencies are installed:
```bash
npm run process-photos -- 512x512 jpg
# Output:
# 🔍 Checking dependencies...
# ✅ ImageMagick is available
# ✅ All dependencies are available!
# [continues with photo processing...]
```

## Troubleshooting

### Permission Issues
If automatic installation fails due to permissions:
- On macOS: Install Homebrew first: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- On Linux: Make sure you have sudo access
- On Windows: Run as administrator or install tools manually

### Package Manager Not Found
- macOS: Install Homebrew if `brew` command is not found
- Linux: The script tries `apt` first, then suggests alternatives
- Windows: Manual installation links are provided

### Network Issues
If automatic installation fails due to network:
- Check your internet connection
- Try running the suggested manual installation commands
- Some corporate networks may block package manager repositories

## Safety Features

- **No sudo by default**: Scripts won't run privileged commands without explicit user consent
- **Graceful fallbacks**: If auto-install fails, clear manual instructions are provided
- **Platform detection**: Appropriate installation commands for your operating system
- **Confirmation prompts**: You always choose whether to attempt automatic installation

## Development Notes

The dependency checking system is modular and can be easily extended to check for additional tools. Each script includes:

1. **checkCommand()** - Tests if a command exists in PATH
2. **promptInstall()** - Interactive confirmation for auto-installation
3. **attemptInstall()** - Platform-specific installation logic
4. **checkDependencies()** - Orchestrates the checking process

This ensures consistent behavior across all processing scripts while maintaining flexibility for future enhancements.
