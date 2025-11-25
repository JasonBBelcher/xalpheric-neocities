# Xalpheric Neocities Project

A complete static site builder, content management, and deployment system for Neocities. Features automated workflows, media processing, and a unified CLI for deploying a music artist's website.

[![Tests](https://img.shields.io/badge/tests-409%20passing-brightgreen)](https://github.com/JasonBBelcher/xalpheric-neocities)
[![Coverage](https://img.shields.io/badge/coverage-86%25-brightgreen)](https://github.com/JasonBBelcher/xalpheric-neocities)

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [CLI Commands](#cli-commands)
  - [Deployment Commands](#deployment-commands)
  - [Media Processing](#media-processing)
  - [Utility Commands](#utility-commands)
- [Configuration](#configuration)
- [Development](#development)
- [Documentation](#documentation)
- [Testing](#testing)

---

## Features

✨ **Unified CLI** - Single `neocities` command for all operations  
📝 **Blog System** - Markdown to HTML with frontmatter support  
🎵 **Audio Integration** - Music player with lightbox gallery  
🖼️ **Photo Processing** - Automated image optimization and resizing  
🎥 **Video Processing** - Video conversion and audio extraction  
🚀 **Smart Deployment** - Git-aware, incremental, or full site deployment  
🧪 **Comprehensive Testing** - 409 tests, 86% coverage  
⚙️ **Configuration Management** - JSON-based site config deployment

---

## Installation

### Prerequisites

**System Dependencies:**
- [ImageMagick](https://imagemagick.org/) - Photo processing
- [FFmpeg](https://ffmpeg.org/) - Video/audio processing  
- [jq](https://stedolan.github.io/jq/) - JSON processing
- [Node.js](https://nodejs.org/) v14+ - Runtime

**macOS Installation:**
```bash
brew install imagemagick ffmpeg jq
```

**Linux Installation:**
```bash
sudo apt install imagemagick ffmpeg jq
```

### Project Setup

```bash
# Clone repository
git clone https://github.com/JasonBBelcher/xalpheric-neocities.git
cd xalpheric-neocities

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your NEOCITIES_API_KEY to .env

# Verify installation
npm run check:deps
```

---

## CLI Commands

All functionality is available through the unified `neocities` CLI or npm scripts.

### Deployment Commands

#### Deploy Blog (Musings)

Deploy markdown blog posts converted to HTML:

```bash
# Via npm script (recommended)
npm run deploy

# Via CLI
node cli/index.js deploy musings [options]

# Options:
#   --verbose       Detailed output
#   --dry-run       Preview without deploying
```

**What it does:**
- Converts markdown to HTML
- Processes frontmatter metadata
- Deploys to `/thoughts-and-musings/`
- Updates navigation

#### Deploy Music

Deploy audio files with validation:

```bash
# Via npm script
npm run deploy:music

# Via CLI
node cli/index.js deploy music [options]

# Options:
#   --verbose       Show all file operations
#   --dry-run       Preview without uploading
```

**What it does:**
- Validates audio file formats (MP3, OGG)
- Checks file sizes
- Deploys to `/music/`
- Updates audio catalog

#### Deploy Configuration

Deploy configuration files and assets:

```bash
# Via npm script
npm run deploy:config

# Via CLI  
node cli/index.js deploy config [options]

# Options:
#   --verbose       Detailed logging
#   --dry-run       Preview changes
```

**What it does:**
- Deploys `config/releases.json`
- Uploads cover art and assets
- Updates site configuration

#### Deploy Recent Changes

Git-aware deployment of recently modified files:

```bash
# Via npm script
npm run deploy:recent

# Via CLI
node cli/index.js deploy recent [options]

# Options:
#   --since <time>  Time range (default: "24 hours ago")
#   --verbose       Show git log details
#   --dry-run       Preview file list

# Examples:
node cli/index.js deploy recent --since "1 week ago"
node cli/index.js deploy recent --since "2025-01-15"
```

**What it does:**
- Analyzes Git history
- Finds modified files in time range
- Deploys only changed files
- Perfect for incremental updates

#### Deploy Full Site

Complete site deployment with safety checks:

```bash
# Via npm script  
npm run deploy:full

# Via CLI
node cli/index.js deploy full [options]

# Options:
#   --force         Skip confirmation prompt
#   --verbose       Detailed progress
#   --dry-run       Preview full deployment
```

**What it does:**
- Analyzes entire `public/` directory
- Shows file count and total size
- Requires confirmation (unless `--force`)
- Deploys everything to Neocities

#### Deploy All (Orchestration)

Sequential deployment of all components:

```bash
# Via npm script
npm run deploy:all

# Via CLI
node cli/index.js deploy all [options]

# Options:
#   --verbose       Show all steps
#   --dry-run       Preview all deployments
```

**Deployment Order:**
1. Configuration & assets
2. Blog posts (musings)
3. Music files
4. Complete

---

### Media Processing

#### Process Photos

Batch photo optimization and resizing:

```bash
# Via npm script
npm run process:photos -- <options>

# Direct script
node process-photos.js <width>x<height> <format> <prefix>

# Examples:
npm run process:photos -- 512x512 jpg studio{increment}
npm run process:photos -- 1920x1080 webp photo_{increment}
npm run process:photos -- 800x600 png thumb

# Options:
#   <width>x<height>  Target dimensions
#   <format>          jpg, png, webp
#   <prefix>          Filename pattern ({increment} = auto-number)
```

**What it does:**
- Reads from `process_photos/input/`
- Resizes and optimizes images
- Outputs to `process_photos/output/`
- Generates sequential filenames

#### Process Videos

Video conversion and audio extraction:

```bash
# Via npm script
npm run process:video -- '<json>'

# Direct script  
node process-video.js '[{"inputName":"video.mp4","outputName":"audio.mp3"}]'

# Examples:
npm run process:video -- '[{"inputName":"concert.mov","outputName":"concert.mp3"}]'
npm run process:video -- '[{"inputName":"raw.mp4","outputName":"compressed.mp4"}]'

# Input: process_video/input/
# Output: process_video/output/
```

**Supported Operations:**
- MP4 → MP3 (audio extraction)
- MOV → MP4 (video conversion)
- Video compression
- Audio quality optimization

#### Deploy Drum Machine

Deploy drum machine app:

```bash
npm run deploy:drum-machine

# Options via script:
#   DRY_RUN=true     Preview only
#   VERBOSE=true     Detailed output
```

---

### Utility Commands

#### Check Dependencies

Verify all system and Node.js dependencies:

```bash
# Via npm script
npm run check:deps

# Via CLI
node cli/index.js check deps [options]

# Options:
#   --verbose       Show detailed dependency info
```

**Output:**
```
🔍 Checking all project dependencies...

📋 System Dependencies:
✅ ImageMagick - available
✅ FFmpeg - available
✅ FFprobe - available
✅ jq - available

📋 Node.js Dependencies:
✅ form-data - available
✅ markdown-it - available
✅ commander - available
✅ dotenv - available
✅ node-fetch - available

✅ All dependencies are available!
```

#### Check Storage

Monitor Neocities storage usage:

```bash
# Via npm script
npm run check:storage

# Via CLI
node cli/index.js check storage [options]

# Options:
#   --verbose       Show top 10 largest files
#   --json          JSON output for scripting
```

**Output:**
```
📊 Neocities Storage Usage:
────────────────────────────────────────
   Total files: 169
   Total size: 239.86 MB (0.234 GB)

   Tier Limits:
   • Free tier: 1 GB
   • Supporter tier: 50 GB

   Free tier:
     Used: 23.4%
     Remaining: 784.14 MB

   Supporter tier:
     Used: 0.5%
     Remaining: 50960.14 MB
────────────────────────────────────────
```

#### Cleanup

Remove unwanted files from Neocities:

```bash
# Via npm script
npm run cleanup

# Via CLI
node cli/index.js cleanup [options]

# Options:
#   --dry-run               Preview without deleting
#   --force                 Skip confirmation prompt
#   --verbose               Show all file details
#   --include <categories>  Only these categories (comma-separated)
#   --exclude <categories>  Skip these categories (comma-separated)

# Examples:
node cli/index.js cleanup --dry-run
node cli/index.js cleanup --include system,media
node cli/index.js cleanup --exclude backup --force
```

**Default Cleanup Patterns:**
- **system**: `.DS_Store` files (macOS artifacts)
- **media**: `.ogg` audio files (redundant format)
- **backup**: `drum-machine-backup` files

**Output:**
```
🧹 Starting cleanup process...

📋 Getting list of files from Neocities...
   Found 171 files

🔍 Identifying unwanted files...

📊 Unwanted files by category:
   • System artifacts: 3 files
   • OGG audio files: 12 files

   Total: 15 files to delete

⚠️  This will permanently delete 15 files. Continue? (y/n):
```

---

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Required
NEOCITIES_API_KEY=your_api_key_here

# Optional
NODE_ENV=development
DEPLOY_VERBOSE=true
DRY_RUN=false
```

### Site Configuration

`public/config/releases.json` - Music catalog:

```json
{
  "releases": [
    {
      "title": "Album Name",
      "artist": "Artist Name",
      "coverArt": "/images/album-cover.jpg",
      "tracks": [
        {
          "title": "Track 1",
          "audioSrc": "/music/track1.mp3",
          "duration": "3:45"
        }
      ]
    }
  ]
}
```

---

## Development

### Project Structure

```
xalpheric-neocities/
├── cli/                       # Unified CLI system
│   ├── index.js              # CLI entry point
│   ├── commands/             # Command implementations
│   │   ├── deploy/           # Deployment commands
│   │   │   ├── musings.js
│   │   │   ├── music.js
│   │   │   ├── config.js
│   │   │   ├── recent.js
│   │   │   ├── full.js
│   │   │   └── all.js
│   │   ├── check/            # Utility checks
│   │   │   ├── deps.js
│   │   │   └── storage.js
│   │   └── cleanup.js        # File cleanup
│   ├── lib/                  # Shared libraries
│   │   ├── api/              # Neocities API
│   │   ├── git/              # Git operations
│   │   └── logger.js         # Logging utilities
│   └── __tests__/            # Test suites
├── public/                    # Website files (deployed)
│   ├── css/
│   ├── js/
│   ├── images/
│   ├── music/
│   ├── config/
│   └── thoughts-and-musings/
├── thoughts-and-musings/      # Source markdown files
├── process_photos/            # Photo processing workspace
├── process_video/             # Video processing workspace
├── package.json               # Project configuration
└── .env                       # Environment variables
```

### Local Development

```bash
# Start local server
npm run serve
# Visit http://localhost:8080

# Build blog posts
npm run build:musings

# Watch for changes (if configured)
npm run watch
```

### Adding New Commands

1. Create command file in `cli/commands/`
2. Implement using Commander.js pattern
3. Add tests in `cli/__tests__/commands/`
4. Register in `cli/index.js`
5. Add npm script to `package.json`

---

## Documentation

Comprehensive documentation in the `xalpheric-neocities-kb` workspace:

### Architecture
- [System Overview](../xalpheric-neocities-kb/architecture/system-overview.md)
- [File Structure](../xalpheric-neocities-kb/architecture/file-structure.md)
- [Data Flow](../xalpheric-neocities-kb/architecture/data-flow.md)

### Features  
- [Content Management](../xalpheric-neocities-kb/features/content-management.md)
- [Gallery System](../xalpheric-neocities-kb/features/gallery-system.md)
- [Audio System](../xalpheric-neocities-kb/features/audio-system.md)
- [Blog System](../xalpheric-neocities-kb/features/enhanced-blog-system.md)

### Workflows
- [CLI Migration Guide](../xalpheric-neocities-kb/workflows/CLI_MIGRATION.md)
- [Development Workflow](../xalpheric-neocities-kb/workflows/development-workflow.md)

### Project Phases
- [Phase 4A Complete](PHASE4A_COMPLETE.md) - Deployment commands
- [Phase 4B Complete](PHASE4B_COMPLETE.md) - Media processing
- [Phase 4C Complete](PHASE4C_COMPLETE.md) - Utility commands

---

## Testing

### Run Tests

```bash
# All tests
npm test

# With coverage
npm test -- --coverage

# Specific test suite
npm test -- cli/__tests__/commands/deploy

# Watch mode
npm test -- --watch
```

### Test Coverage

Current coverage: **86.35%**

```
File                    | % Stmts | % Branch | % Funcs | % Lines
------------------------|---------|----------|---------|----------
All files               |   86.35 |    83.49 |   79.45 |   86.28
cli/commands/deploy/    |   87.5  |    85.2  |   81.3  |   87.4
cli/commands/check/     |   95.68 |    75    |   92.3  |   95.65
cli/commands/cleanup.js |   94.2  |    76.1  |   91.7  |   94.1
cli/lib/                |   83.1  |    80.5  |   74.2  |   83.0
```

### Test Suites

- **Deploy Commands**: 98 tests
- **Media Processing**: 48 tests  
- **Check Commands**: 27 tests
- **Cleanup**: 32 tests
- **API & Utilities**: 204 tests

**Total**: 409 tests passing

---

## Legacy Scripts (Deprecated)

The following root-level scripts are deprecated. Use CLI commands instead:

| Legacy Script | CLI Command |
|--------------|-------------|
| `build-musings.js` | `neocities deploy musings` |
| `deploy-music.js` | `neocities deploy music` |
| `deploy-config.js` | `neocities deploy config` |
| `deploy-drum-machine.js` | `npm run deploy:drum-machine` |
| `check-deps.js` | `neocities check deps` |
| `check-storage.js` | `neocities check storage` |
| `cleanup-unwanted-files.js` | `neocities cleanup` |

Legacy scripts remain functional but will show deprecation warnings.

---

## Quick Start Examples

### Initial Deployment

```bash
# 1. Check dependencies
npm run check:deps

# 2. Check current storage
npm run check:storage

# 3. Deploy full site (with confirmation)
npm run deploy:full

# Or deploy components individually:
npm run deploy:config
npm run deploy
npm run deploy:music
```

### Daily Workflow

```bash
# 1. Make changes to markdown, CSS, JS, etc.

# 2. Deploy recent changes (last 24 hours)
npm run deploy:recent

# Or deploy specific component:
npm run deploy              # Blog posts
npm run deploy:music        # Audio files
npm run deploy:config       # Configuration
```

### Media Workflow

```bash
# 1. Process photos
cp *.jpg process_photos/input/
npm run process:photos -- 1920x1080 jpg photo{increment}

# 2. Process videos  
cp video.mov process_video/input/
npm run process:video -- '[{"inputName":"video.mov","outputName":"audio.mp3"}]'

# 3. Move processed files to public/
mv process_photos/output/* public/images/
mv process_video/output/* public/music/

# 4. Deploy
npm run deploy:recent
```

### Cleanup Workflow

```bash
# 1. Preview cleanup
npm run cleanup -- --dry-run --verbose

# 2. Clean specific categories
npm run cleanup -- --include system

# 3. Full cleanup (with confirmation)
npm run cleanup
```

---

## Troubleshooting

### Common Issues

**"Command not found" errors:**
```bash
npm run check:deps
# Verify all system dependencies installed
```

**API rate limiting:**
```bash
# Use --dry-run to preview before deploying
npm run deploy:full -- --dry-run

# Deploy in smaller batches
npm run deploy:recent --since "1 day ago"
```

**Storage full:**
```bash
# Check usage
npm run check:storage --verbose

# Clean unwanted files
npm run cleanup
```

**Tests failing:**
```bash
# Clear cache and reinstall
rm -rf node_modules coverage
npm install
npm test
```

---

## Contributing

This is a personal project, but feedback and suggestions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure all tests pass: `npm test`
5. Submit a pull request

---

## License

MIT License - See LICENSE file for details

---

## Credits

**Author**: Jason Belcher (Xalpheric)  
**Website**: [xalpheric.neocities.org](https://xalpheric.neocities.org)  
**Platform**: Built for [Neocities](https://neocities.org)

---

## Changelog

### v2.0.0 - Unified CLI (November 2025)
- ✨ Complete CLI migration (Phases 4A, 4B, 4C)
- 📦 6 deployment commands
- 🎨 2 media processing commands
- 🛠️ 3 utility commands
- 🧪 409 tests (86% coverage)
- 📝 Comprehensive documentation

### v1.0.0 - Initial Release
- Blog system with markdown support
- Audio player integration
- Photo/video processing
- Manual deployment scripts

---

*For detailed documentation, see the [knowledge base](../xalpheric-neocities-kb/)*
