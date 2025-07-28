# Xalpheric Neocities Site Builder

A complete static site builder and deployment system for the Neocities platform, featuring automated content management, media processing workflows, and sophisticated deployment strategies.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Neocities-blue.svg)](https://neocities.org/)

## � Documentation Navigation

### Core Documentation
- [�🚀 Quick Start](#-quick-start) - Get up and running in minutes
- [🏗️ Project Architecture](#%EF%B8%8F-project-architecture) - System overview and structure
- [⚙️ Available Scripts](#%EF%B8%8F-available-scripts) - Complete command reference
- [🎯 Features](#-features) - What this system can do
- [🔧 Dependencies](#-dependencies) - System requirements and setup

### Workflows & Guides
- [📱 Media Processing](#-media-processing) - Photo and video workflows
- [🚀 Deployment](#-deployment) - Publishing to Neocities
- [📝 Content Management](#-content-management) - Writing and publishing content
- [🔍 Troubleshooting](#-troubleshooting) - Common issues and solutions
- [🎨 Gallery Integration](#-gallery-integration) - Photo gallery system

### Advanced Documentation
- [📚 Comprehensive Knowledge Base](https://github.com/JasonBBelcher/xalpheric-neocities-kb) - Complete technical documentation with AI optimization
- [🔄 Development Workflows](#-development-workflows) - Development best practices
- [🤝 Contributing](#-contributing) - How to contribute to this project

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v14+ ([Download](https://nodejs.org/))
- **Git** for version control
- **Neocities account** with API key

### Installation
```bash
# Clone the repository
git clone https://github.com/JasonBBelcher/xalpheric-neocities.git
cd xalpheric-neocities

# Install Node.js dependencies
npm install

# Check all system dependencies
npm run check-deps
```

### Essential Commands
```bash
# Content Management
npm run deploy                   # Deploy content changes
npm run build-musings           # Build markdown to HTML
npm run serve                   # Local development server

# Media Processing
npm run process-photos -- 512 jpg studio{increment}
npm run process-video -- '[{"inputName":"video.mp4","outputName":"audio.mp3"}]'

# System Management
npm run check-deps              # Verify all dependencies
npm run deploy-full-refresh     # Complete site rebuild
```

### Environment Setup
```bash
# Set your Neocities API key (required for deployment)
export NEOCITIES_API_KEY="your-api-key-here"

# Or create a .env file:
echo "NEOCITIES_API_KEY=your-api-key-here" > .env
```

**📚 Need detailed technical documentation?** Visit the [comprehensive knowledge base](https://github.com/JasonBBelcher/xalpheric-neocities-kb) with complete system architecture, AI-optimized assistance, and troubleshooting guides.

---

## 🏗️ Project Architecture

### System Overview
This project is a **Node.js-based static site generator** specifically designed for the Neocities platform. It features:

- **Automated Content Pipeline**: Markdown → HTML → Deployment
- **Media Processing Workflows**: Photo/video processing with ImageMagick and FFmpeg
- **Intelligent Deployment**: Incremental updates with rate limiting and error handling
- **Dependency Management**: Automatic detection and installation of system requirements

### Project Structure
```
xalpheric-neocities/
├── 📄 README.md                    # This comprehensive guide
├── 📦 package.json                 # Node.js configuration and scripts
├── 🔧 .env                         # Environment variables (API keys)
│
├── 🤖 .github/
│   ├── workflows/                  # GitHub Actions CI/CD
│   └── scripts/                    # Core build and deployment scripts
│       ├── build-musings.js        # Markdown to HTML converter
│       ├── deploy-musings.js       # Incremental deployment
│       ├── deploy-full-refresh.js  # Complete site rebuild
│       └── deploy-assets.js        # Asset-only deployment
│
├── 📝 thoughts-and-musings/        # Source markdown content files
├── 🌐 public/                      # Built website files (deployment target)
│   ├── 🖼️ assets/                  # Processed images and media
│   ├── 🎵 music/                   # Audio files from video processing
│   ├── 📄 musings/                 # Generated HTML from markdown
│   ├── 🎨 css/                     # Stylesheets and themes
│   ├── ⚡ js/                      # JavaScript (gallery, audio player)
│   └── 📱 [other site files]       # HTML pages, favicon, etc.
│
├── 📸 process_photos/              # Photo processing workspace
│   ├── run_me.sh                   # Photo processing script
│   └── README.md                   # Photo processing documentation
│
├── 🎬 process_video/               # Video processing workspace
│   ├── convert_videos.sh           # Video conversion script
│   └── README.md                   # Video processing documentation
│
├── 🔧 System Scripts
│   ├── process-photos.js           # Node.js photo processing wrapper
│   ├── process-video.js            # Node.js video processing wrapper
│   ├── build-musings.js            # Standalone markdown builder
│   └── check-deps.js               # System dependency checker
```

**📋 Documentation Structure**: Each major component has its own README with detailed usage instructions. See the [workflows section](#-development-workflows) for how everything connects.

### Core Technologies
- **🟢 Node.js v14+**: Runtime environment and package management
- **🌐 Neocities API**: Static hosting platform with REST API
- **📝 markdown-it**: Markdown to HTML conversion with extensions
- **🖼️ ImageMagick**: Photo processing, resizing, and format conversion
- **🎬 FFmpeg**: Video to audio conversion and media processing
- **⚡ jQuery**: Frontend interactivity (gallery, audio player)
- **🤖 GitHub Actions**: Automated CI/CD pipeline

### Data Flow
```
Content Creation → Processing → Deployment
     ↓               ↓           ↓
1. Write Markdown → 2. Build HTML → 3. Upload to Neocities
   Add Photos →      Process Images → Deploy Assets
   Add Videos →      Extract Audio → Deploy Media
```

**🔗 Detailed Architecture**: For complete system architecture, data flow diagrams, and technical implementation details, see the [System Overview](https://github.com/JasonBBelcher/xalpheric-neocities-kb/blob/main/architecture/system-overview.md) in the knowledge base.

---

## ⚙️ Available Scripts

### Content Management Scripts
| Command | Purpose | Usage Example |
|---------|---------|---------------|
| `npm run build-musings` | Convert markdown files to HTML | `npm run build-musings` |
| `npm run deploy` | Deploy content changes only | `npm run deploy` |
| `npm run serve` | Start local development server | `npm run serve` (→ http://localhost:8080) |

**Content Workflow**: Write markdown in `thoughts-and-musings/` → Build → Deploy → Live on Neocities

### Media Processing Scripts
| Command | Purpose | Usage Example |
|---------|---------|---------------|
| `npm run process-photos` | Batch photo processing | `npm run process-photos -- 512 jpg studio{increment}` |
| `npm run process-video` | Convert videos to audio | `npm run process-video -- '[{"inputName":"video.mp4","outputName":"audio.mp3"}]'` |

**Media Workflow**: Add files to `process_photos/` or `process_video/` → Process → Auto-deploy with content

### Deployment Scripts
| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run deploy` | Incremental deployment | Regular content updates |
| `npm run deploy-assets` | Deploy assets only | After processing photos/videos |
| `npm run deploy-full-refresh` | Complete site rebuild | Major changes or troubleshooting |
| `npm run deploy-full-refresh -- --dry-run` | Test deployment | Before major changes |
| `npm run deploy-full-refresh -- --include-mp3s` | Deploy with audio files | Include large audio files |

**Deployment Strategy**: Use incremental deployment for daily updates, full refresh for major changes.

### System Management Scripts
| Command | Purpose | Details |
|---------|---------|---------|
| `npm run check-deps` | Verify all dependencies | Checks Node.js packages and system tools |
| `npm install` | Install Node.js packages | Run after cloning or updating |

---

### Detailed Script Usage

#### Photo Processing
```bash
# Basic photo processing (recommended)
npm run process-photos -- <size> <format> [naming_pattern]

# Examples:
npm run process-photos -- 512 jpg                    # Proportional scaling to 512px
npm run process-photos -- 1024x768 jpg studio{increment} # Exact dimensions with custom naming
npm run process-photos -- 2048 webp                  # High-quality WebP format
```

**Photo Processing Options**:
- **Size Formats**: 
  - Single dimension (e.g., `512`) - proportional scaling, preserves aspect ratio
  - Two dimensions (e.g., `512x512`) - exact sizing, may distort aspect ratio
- **Output Formats**: `jpg` (photos), `png` (graphics), `webp` (modern format)
- **Naming Patterns**: Use `{increment}` for sequential numbering

📖 **Detailed Guide**: See [Photo Processing Documentation](process_photos/README.md)

#### Video Processing
```bash
# Convert videos to audio files
npm run process-video -- '[JSON_CONFIG]'

# Single file example:
npm run process-video -- '[{"inputName":"performance.mov","outputName":"song.mp3"}]'

# Batch processing example:
npm run process-video -- '[
  {"inputName":"video1.MOV","outputName":"track1.mp3"},
  {"inputName":"video2.mp4","outputName":"track2.wav"}
]'
```

**Video Processing Features**:
- **Input Formats**: MP4, MOV, M4V, AVI, MKV
- **Output Formats**: MP3, WAV, FLAC, OGG
- **Batch Processing**: Multiple files in single command
- **Quality Control**: Configurable bitrate and sample rate

📖 **Detailed Guide**: See [Video Processing Documentation](process_video/README.md)

#### Deployment Options
```bash
# Test what will be deployed (safe)
npm run deploy-full-refresh -- --dry-run

# Deploy everything except MP3s (default)
npm run deploy-full-refresh

# Deploy including large audio files (careful!)
npm run deploy-full-refresh -- --include-mp3s

# Get help on deployment options
npm run deploy-full-refresh -- --help
```

**Deployment Features**:
- **Rate Limiting**: Respects Neocities API limits
- **Error Handling**: Automatic retry with exponential backoff
- **SHA1 Comparison**: Only uploads changed files
- **Progress Tracking**: Real-time upload progress
- **Dry Run Mode**: Test deployments safely

🔗 **Advanced Deployment**: See [Deployment Strategy Documentation](https://github.com/JasonBBelcher/xalpheric-neocities-kb/blob/main/deployment/deployment-strategy.md)

## 🏗️ Project Structure

```
xalpheric-neocities/
├── README.md                    # This file
├── package.json                 # Node.js configuration and scripts
├── 
├── .github/
│   ├── workflows/              # GitHub Actions for CI/CD
│   └── scripts/                # Build and deployment scripts
│       ├── build-musings.js    # Markdown to HTML converter
│       ├── deploy-musings.js   # Incremental deployment
│       └── deploy-full-refresh.js # Complete site rebuild
│
├── thoughts-and-musings/       # Source markdown files
├── public/                     # Built website files
│   ├── assets/                # Processed images (gallery photos)
│   ├── music/                 # Processed audio files
│   ├── musings/               # Built HTML from markdown
│   ├── css/                   # Stylesheets
│   ├── js/                    # JavaScript (gallery, etc.)
│   └── [other site files]
│
├── process_photos/             # Photo processing workspace
├── process_video/              # Video processing workspace
│
├── process-photos.js           # Photo processing script
├── process-video.js            # Video processing script
└── check-deps.js              # Dependency checker
```

**📚 Documentation**: Complete technical documentation and AI-optimized knowledge base available at: [xalpheric-neocities-kb](https://github.com/JasonBBelcher/xalpheric-neocities-kb)

## ✨ Features

### 📝 Content Management System
- **Markdown-to-HTML Pipeline**: Write in Markdown, deploy as HTML
- **Template System**: Consistent layout with customizable themes
- **Dynamic Navigation**: Automatic menu generation from content
- **Meta Content Support**: Custom titles, descriptions, and SEO tags
- **Hot Reload Development**: Local server with automatic rebuilding

**Content Types Supported**:
- Blog posts and articles
- Project documentation  
- Photo galleries with metadata
- Audio streaming pages
- Custom HTML templates

### 🖼️ Advanced Media Processing

#### Photo Processing Engine
- **Batch Processing**: Process entire directories at once
- **Smart Scaling**: Proportional or exact dimension scaling
- **Format Conversion**: JPEG ↔ PNG ↔ WebP ↔ HEIC
- **Custom Naming**: Sequential numbering with custom patterns
- **Quality Control**: Configurable compression and quality settings

**Supported Photo Workflows**:
```
Raw Photos → process_photos/ → ImageMagick → public/assets/ → Gallery Display
```

#### Video-to-Audio Conversion
- **Professional Audio Extraction**: High-quality audio from video sources
- **Flexible Configuration**: JSON-based batch processing
- **Multiple Formats**: MP3, WAV, FLAC, OGG output support
- **Metadata Preservation**: Title, artist, album information retention
- **Quality Options**: Bitrate and sample rate control

**Supported Video Workflows**:
```
Video Files → process_video/ → FFmpeg → public/music/ → Audio Player
```

### 🚀 Deployment Automation

#### Intelligent Deployment System
- **Delta Deployment**: Only uploads changed files (SHA1 comparison)
- **Rate Limiting**: Respects Neocities API limits automatically
- **Error Recovery**: Automatic retry with exponential backoff
- **Progress Tracking**: Real-time upload progress and statistics
- **Dry Run Mode**: Test deployments safely before going live

#### Multi-Stage Deployment Options
- **Content Only**: Quick updates for text changes
- **Assets Only**: Deploy processed media files  
- **Full Refresh**: Complete site rebuild with all files
- **Selective Inclusion**: Choose which file types to include

### 🔧 Development Tools

#### Local Development Environment
- **Built-in Server**: Local preview on `http://localhost:8080`
- **Hot Reload**: Automatic browser refresh on file changes
- **Error Reporting**: Detailed build error messages
- **Dependency Checking**: Verify all system requirements

#### Quality Assurance
- **Pre-deployment Validation**: File integrity checks
- **Dependency Verification**: System tool availability
- **Link Validation**: Internal link checking
- **Asset Optimization**: Automatic file size optimization

### 🎵 Interactive Frontend Components

#### Audio Player System
- **Custom Audio Player**: HTML5 audio with custom controls
- **Playlist Support**: Sequential track playback
- **Progress Tracking**: Visual playback progress
- **Format Support**: MP3, WAV, OGG, M4A

#### Gallery System
- **Responsive Grid Layout**: Automatic image grid arrangement
- **Lightbox Display**: Full-size image viewing
- **Lazy Loading**: Performance optimization for large galleries
- **Mobile Optimization**: Touch-friendly navigation

#### Interactive Elements
- **Dynamic Content Loading**: AJAX-powered content updates
- **Responsive Design**: Mobile-first responsive layouts
- **Cross-browser Compatibility**: Modern browser support
- **Accessibility Features**: Screen reader and keyboard navigation

### 🔗 Platform Integration

#### Neocities Platform Optimization
- **API Integration**: Full Neocities REST API utilization
- **File Management**: Remote file operations and organization
- **Bandwidth Optimization**: Efficient file transfer protocols
- **Error Handling**: Graceful degradation for API failures

#### Version Control Integration  
- **Git Workflow**: Standard Git version control
- **GitHub Actions**: Automated CI/CD pipelines
- **Branch Management**: Development and production workflows
- **Collaborative Development**: Multi-contributor support

---

### Feature Roadmap

#### Planned Enhancements
- [ ] **Advanced Photo Processing**: EXIF data handling, GPS coordinates
- [ ] **Video Streaming**: Direct video embedding and streaming
- [ ] **Comment System**: Static site commenting integration
- [ ] **Search Functionality**: Client-side content search
- [ ] **RSS Feeds**: Automatic feed generation for content
- [ ] **Analytics Integration**: Privacy-focused visitor analytics

#### Community Requests
- [ ] **Theme System**: Multiple visual themes and dark mode
- [ ] **Plugin Architecture**: Extensible functionality system
- [ ] **Content Scheduling**: Automated publishing workflows
- [ ] **Social Media Integration**: Automatic cross-posting

🔗 **Feature Requests**: Submit ideas via [GitHub Issues](https://github.com/JasonBBelcher/xalpheric-neocities/issues)

## 📚 Documentation

### Comprehensive Knowledge Base
This project includes a detailed **AI-optimized knowledge base** with complete technical documentation:

**🔗 [Xalpheric Neocities Knowledge Base](https://github.com/JasonBBelcher/xalpheric-neocities-kb)**

The knowledge base provides:
- **Complete system architecture** and technical implementation details
- **Step-by-step workflows** for content creation and media processing
- **AI-optimized documentation** for enhanced assistance with Claude AI and other AI tools
- **Troubleshooting guides** with real-world solutions
- **Development best practices** and optimization strategies

**For AI Assistants**: The knowledge base includes a specialized context loading prompt that enables AI to provide project-specific assistance with complete understanding of the system architecture and workflows.

## 🔧 Dependencies

### System Requirements
- **Node.js** (v14+ recommended)
- **ImageMagick** (for photo processing) - `brew install imagemagick`
- **FFmpeg** (for video processing) - `brew install ffmpeg`
- **jq** (for JSON processing) - `brew install jq`

### Node.js Packages (auto-installed)
- **form-data** - File uploads to Neocities API
- **markdown-it** - Markdown to HTML conversion

*All dependencies are automatically checked when you run scripts. Missing dependencies will trigger installation prompts.*

## � iOS/iPhone Integration

### Photos from iPhone
1. **AirDrop** HEIC photos to your Mac
2. **Place in** `process_photos/` directory
3. **Run** `npm run process-photos -- 512x512 jpg studio{increment}`
4. **Result**: Web-optimized JPEG images in gallery

### Videos from iPhone
1. **AirDrop** MOV videos to your Mac
2. **Place in** `process_video/` directory  
3. **Run** `npm run process-video -- '[{"inputName":"video.MOV","outputName":"audio.mp3"}]'`
4. **Result**: Audio files ready for your music section

## 🚀 Deployment Workflows

### Development Workflow
```bash
# 1. Create content
echo "# New Post" > thoughts-and-musings/new-post.md

# 2. Process media
npm run process-photos -- 512x512 jpg
npm run process-video -- '[{"inputName":"video.MOV","outputName":"song.mp3"}]'

# 3. Deploy incrementally
npm run deploy
```

### Complete Site Rebuild
```bash
# 1. Test what will happen
npm run deploy-full-refresh -- --dry-run

# 2. Full rebuild (excludes MP3s by default)
npm run deploy-full-refresh

# 3. Include everything (careful - large files!)
npm run deploy-full-refresh -- --include-mp3s
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### Deployment Problems

**❌ Error: "Command failed with exit code 1"**
```bash
# Solution: Check your Neocities API key
echo $NEOCITIES_API_KEY  # Should show your API key
# If empty, add to your shell profile:
export NEOCITIES_API_KEY="your_api_key_here"
```

**❌ Error: "Rate limit exceeded"**
- **Cause**: Too many API requests to Neocities
- **Solution**: Wait 5-10 minutes, then retry
- **Prevention**: Use `npm run deploy` for small changes instead of full refresh

**❌ Error: "File upload failed"**
```bash
# Test connection first
npm run deploy-full-refresh -- --dry-run

# Check file permissions
chmod 644 public/*
chmod 755 public/

# Verify file isn't too large (Neocities has 250MB total limit)
du -sh public/
```

#### Media Processing Issues

**❌ Error: "magick: command not found"**
```bash
# Install ImageMagick
# macOS:
brew install imagemagick

# Verify installation
magick --version
```

**❌ Error: "ffmpeg: command not found"**
```bash
# Install FFmpeg
# macOS:
brew install ffmpeg

# Verify installation
ffmpeg -version
```

**❌ Photo processing produces distorted images**
- **Cause**: Using two-dimension sizing (e.g., `512x512`) on non-square images
- **Solution**: Use single dimension (e.g., `512`) for proportional scaling
```bash
# ✅ Correct - proportional scaling
npm run process-photos -- 512 jpg

# ❌ Incorrect - may distort images
npm run process-photos -- 512x512 jpg
```

**❌ Video processing fails with "Invalid JSON"**
```bash
# ✅ Correct JSON format
npm run process-video -- '[{"inputName":"video.mp4","outputName":"audio.mp3"}]'

# ❌ Common mistakes:
# Missing quotes around JSON
# Single quotes instead of double quotes in JSON
# Missing brackets for array
```

#### Development Server Issues

**❌ Error: "Port 8080 already in use"**
```bash
# Find and kill the process using port 8080
lsof -ti:8080 | xargs kill -9

# Or use a different port
# Edit serve.js to change the port number
```

**❌ Local server not updating changes**
- Clear browser cache (Cmd+Shift+R on macOS)
- Check if files are saving correctly
- Restart the server: `Ctrl+C` then `npm run serve`

#### Content Building Problems

**❌ Markdown files not converting to HTML**
```bash
# Check if markdown files exist
ls thoughts-and-musings/*.md

# Verify file permissions
chmod 644 thoughts-and-musings/*

# Run build manually to see errors
npm run build-musings
```

**❌ Missing dependencies**
```bash
# Check all dependencies
npm run check-deps

# Reinstall Node.js packages if needed
rm -rf node_modules package-lock.json
npm install
```

---

### Debugging Tips

#### Enable Detailed Logging
```bash
# Set debug mode for deployment
DEBUG=1 npm run deploy-full-refresh

# Check file differences
npm run deploy-full-refresh -- --dry-run --verbose
```

#### Manual Deployment Testing
```bash
# Test individual components
node build-musings.js     # Test content building
node process-photos.js    # Test photo processing
node process-video.js     # Test video conversion
```

#### File Permission Issues
```bash
# Fix common permission problems
chmod -R 644 public/
chmod 755 public/ public/*/
chmod +x *.sh
```

#### Network Connectivity
```bash
# Test Neocities API connection
curl -H "Authorization: Bearer $NEOCITIES_API_KEY" \
     "https://neocities.org/api/info"
```

---

### Environment Validation

#### Complete System Check
```bash
# Run comprehensive dependency check
npm run check-deps

# Expected output should show:
# ✅ Node.js version X.X.X
# ✅ ImageMagick version X.X.X  
# ✅ FFmpeg version X.X.X
# ✅ jq version X.X
# ✅ All npm packages installed
```

#### Reset Everything (Nuclear Option)
```bash
# If all else fails, complete reset:
rm -rf node_modules package-lock.json
npm install
npm run check-deps
npm run deploy-full-refresh -- --dry-run
```

---

### Getting Help

#### Before Asking for Help
1. **Run the dependency check**: `npm run check-deps`
2. **Try dry run deployment**: `npm run deploy-full-refresh -- --dry-run`
3. **Check the logs**: Look for specific error messages
4. **Test individual components**: Run scripts separately to isolate issues

#### Where to Get Support
- 📚 **Detailed Documentation**: [Knowledge Base Repository](https://github.com/JasonBBelcher/xalpheric-neocities-kb)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/JasonBBelcher/xalpheric-neocities/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/JasonBBelcher/xalpheric-neocities/discussions)
- 📧 **Direct Contact**: [Email Support](mailto:jason@xalpheric.com)

#### When Reporting Issues
Include the following information:
- **Operating System**: macOS, Linux, Windows
- **Node.js Version**: `node --version`
- **Error Message**: Full error text
- **Command Used**: Exact command that failed
- **File Structure**: `ls -la` of relevant directories

🔗 **Advanced Troubleshooting**: See [Technical Troubleshooting Guide](https://github.com/JasonBBelcher/xalpheric-neocities-kb/blob/main/workflows/troubleshooting.md)

## 🎨 Gallery Integration

The photo processing automatically integrates with your gallery:

1. **Process photos**: `npm run process-photos -- 512x512 jpg studio{increment}`
2. **Update gallery.js**: Add new images to the gallery configuration
3. **Deploy**: `npm run deploy` to upload changes

Gallery features:
- **Lightbox viewing** with navigation
- **2-column responsive layout**
- **Display names and descriptions**
- **Automatic image detection**

## 🤝 Contributing

### Development Setup

This is primarily a personal website builder, but the system is designed to be reusable and contributions are welcome!

#### Getting Started
```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/xalpheric-neocities.git
cd xalpheric-neocities

# Install dependencies
npm install

# Verify everything works
npm run check-deps
npm run serve  # Test local development server
```

#### Development Workflow
1. **Create feature branch**: `git checkout -b feature/your-feature-name`
2. **Make changes**: Edit code, test locally
3. **Test thoroughly**: Run all scripts and verify deployment
4. **Commit changes**: Use conventional commit messages
5. **Submit PR**: Include description of changes and testing performed

### Code Style Guidelines

#### JavaScript
- **ES6+ Syntax**: Use modern JavaScript features
- **Error Handling**: Always include proper try/catch blocks
- **Comments**: Document complex logic and external dependencies
- **Async/Await**: Prefer async/await over raw Promises

#### Scripts and Automation
- **Cross-platform**: Ensure scripts work on macOS, Linux, and Windows
- **Error Messages**: Provide clear, actionable error messages
- **Progress Feedback**: Include progress indicators for long operations
- **Dry Run Support**: Allow testing without side effects

#### Documentation
- **README Updates**: Keep documentation current with code changes
- **Code Comments**: Explain "why" not just "what"
- **Examples**: Include practical usage examples
- **Error Scenarios**: Document common failure cases and solutions

### Areas for Contribution

#### High Priority
- [ ] **Windows Support**: Ensure all scripts work on Windows
- [ ] **Error Recovery**: Improve robustness of deployment processes
- [ ] **Performance**: Optimize photo/video processing for large batches
- [ ] **Testing**: Add automated tests for core functionality

#### Medium Priority
- [ ] **Plugin System**: Extensible architecture for custom processors
- [ ] **Theme Support**: Multiple visual themes and layouts
- [ ] **Content Management**: Enhanced markdown processing features
- [ ] **Analytics**: Privacy-focused visitor tracking options

#### Low Priority
- [ ] **GUI Interface**: Optional desktop app for non-technical users
- [ ] **Cloud Storage**: Integration with cloud providers for media
- [ ] **Collaboration**: Multi-user content management
- [ ] **Advanced SEO**: Enhanced search engine optimization

### Testing Your Changes

#### Before Submitting
```bash
# Test all core functionality
npm run check-deps           # Verify dependencies
npm run build-musings        # Test content building
npm run serve                # Test local server
npm run deploy -- --dry-run  # Test deployment logic

# Test media processing (if applicable)
# Add test files to process_photos/ and process_video/
npm run process-photos -- 512 jpg test{increment}
npm run process-video -- '[{"inputName":"test.mp4","outputName":"test.mp3"}]'
```

#### Test Environment
- **Node.js Versions**: Test with Node.js 14, 16, and 18
- **Operating Systems**: Test on macOS and Linux (Windows if possible)
- **Dependency Versions**: Verify with different ImageMagick/FFmpeg versions
- **Edge Cases**: Test with empty directories, large files, network failures

### Submitting Issues

#### Bug Reports
Include the following information:
- **Environment**: OS, Node.js version, dependency versions
- **Steps to Reproduce**: Exact commands and inputs used
- **Expected Behavior**: What should have happened
- **Actual Behavior**: What actually happened
- **Error Messages**: Full error text and stack traces
- **Workarounds**: Any temporary solutions you found

#### Feature Requests
Provide context for:
- **Use Case**: Why this feature would be useful
- **Implementation Ideas**: Suggestions for how it could work
- **Alternatives**: Other solutions you've considered
- **Impact**: Who would benefit from this feature

### Code Review Process

#### What We Look For
- **Functionality**: Does the code work as intended?
- **Compatibility**: Will it work across different environments?
- **Documentation**: Are changes properly documented?
- **Testing**: Has the code been tested thoroughly?
- **Style**: Does it follow project conventions?

#### Response Time
- **Initial Response**: Within 1-2 weeks
- **Review Completion**: Within 2-4 weeks
- **Merge Decision**: Depends on complexity and testing requirements

### Adapting for Your Own Use

#### Using as Template
This system can be adapted for other static sites:

1. **Fork the Repository**: Create your own version
2. **Update Configuration**: Change site name, API keys, etc.
3. **Customize Templates**: Modify HTML templates and CSS
4. **Adapt Processing**: Modify photo/video processing for your needs
5. **Update Documentation**: Reflect your specific setup

#### License and Attribution
- **MIT License**: Free to use, modify, and redistribute
- **Attribution**: Not required but appreciated
- **Sharing**: Consider contributing improvements back to the original project

🔗 **Development Resources**: See [Developer Documentation](https://github.com/JasonBBelcher/xalpheric-neocities-kb/blob/main/workflows/development-workflow.md) for detailed technical guides.

## 📄 License

MIT License - see package.json for details.

**Copyright (c) 2024 Jason Belcher**

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so.

### What This Means
- ✅ **Commercial Use**: Use for commercial projects
- ✅ **Modification**: Adapt for your needs
- ✅ **Distribution**: Share with others
- ✅ **Private Use**: Use for personal projects
- ✅ **No Attribution Required**: Though appreciated!

---

## 🔗 Additional Resources

### Related Projects
- **[xalpheric-neocities-kb](https://github.com/JasonBBelcher/xalpheric-neocities-kb)**: Comprehensive knowledge base with AI-optimized documentation
- **[Neocities Platform](https://neocities.org/)**: The hosting platform this system deploys to
- **[ImageMagick](https://imagemagick.org/)**: Powerful image processing library
- **[FFmpeg](https://ffmpeg.org/)**: Multimedia processing framework

### Community and Support
- 🌐 **Live Site**: [xalpheric.neocities.org](https://xalpheric.neocities.org)
- 📚 **Documentation**: [Knowledge Base](https://github.com/JasonBBelcher/xalpheric-neocities-kb)
- 🐛 **Issues**: [GitHub Issues](https://github.com/JasonBBelcher/xalpheric-neocities/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/JasonBBelcher/xalpheric-neocities/discussions)
- 📧 **Contact**: [jason@xalpheric.com](mailto:jason@xalpheric.com)

### Technical References
- **[Neocities API Documentation](https://neocities.org/api)**
- **[Node.js Documentation](https://nodejs.org/docs/)**  
- **[ImageMagick Command Line](https://imagemagick.org/script/command-line-tools.php)**
- **[FFmpeg Documentation](https://ffmpeg.org/documentation.html)**
- **[GitHub Actions Documentation](https://docs.github.com/en/actions)**

---

<div align="center">

**🎵 Built with passion for music, technology, and the independent web 🎵**

*This project powers [xalpheric.neocities.org](https://xalpheric.neocities.org) - a personal space for electronic music, creative projects, and digital expression.*

**[⭐ Star this repository](https://github.com/JasonBBelcher/xalpheric-neocities) if you find it useful!**

</div>

**Built with ❤️ for the Neocities community**
