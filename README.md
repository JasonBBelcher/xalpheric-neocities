# Xalpheric Neocities Site Builder

A complete static site builder and deployment system for the Neocities platform, featuring automated content management, media processing, and deployment workflows.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Check all dependencies are installed
npm run check-deps

# Build and deploy content
npm run deploy

# Process photos for the gallery
npm run process-photos -- 512x512 jpg studio{increment}

# Process videos to audio
npm run process-video -- '[{"inputName":"video.mp4","outputName":"audio.mp3"}]'
```

**📚 Need detailed documentation?** Check out the [comprehensive knowledge base](https://github.com/JasonBBelcher/xalpheric-neocities-kb) with complete technical details and AI-optimized assistance.

## ️ Available Scripts

### Content Management
```bash
# Build musings from markdown files
npm run build-musings

# Deploy musings content to Neocities
npm run deploy

# Complete site refresh (nuclear option)
npm run deploy-full-refresh -- --dry-run  # Test first
npm run deploy-full-refresh                # Full rebuild
npm run deploy-full-refresh -- --include-mp3s  # Include audio files
```

### Media Processing

#### Photo Processing
```bash
# Basic usage: npm run process-photos -- <size> <format> [naming_pattern]

# Examples:
npm run process-photos -- 512x512 jpg                    # Keep original names
npm run process-photos -- 512x512 jpg studio{increment}  # studio1.jpg, studio2.jpg...
npm run process-photos -- 1024x768 png photo{increment}  # photo1.png, photo2.png...
```

**Photo Processing Details:**
- **Input**: Place images in `process_photos/` directory
- **Output**: Processed images saved to `public/assets/`
- **Formats**: Supports JPEG, PNG, HEIC (iPhone photos)
- **Dependencies**: Requires ImageMagick (`magick` command)
- **Features**: Batch processing, custom naming patterns, automatic cleanup

#### Video Processing
```bash
# Convert videos to audio
npm run process-video -- '[{"inputName":"input.mp4","outputName":"output.mp3"}]'

# Batch processing example
npm run process-video -- '[
  {"inputName":"video1.MOV","outputName":"song1.mp3"},
  {"inputName":"video2.mp4","outputName":"song2.wav"}
]'
```

**Video Processing Details:**
- **Input**: Place videos in `process_video/` directory
- **Output**: Audio files saved to `public/music/`
- **Formats**: MP4, MOV, M4V → MP3, WAV, etc.
- **Dependencies**: Requires FFmpeg and jq
- **Features**: Flexible JSON configuration, multiple format support

### System Management
```bash
# Check all dependencies (ImageMagick, FFmpeg, jq, Node packages)
npm run check-deps

# Get help for deployment script
npm run deploy-full-refresh -- --help
```

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

## 🎯 Features

### ✅ Content Management
- **Markdown to HTML** conversion for blog posts/musings
- **Automatic index generation** with navigation links
- **Template system** for consistent styling
- **Incremental deployment** - only uploads changed files

### ✅ Media Processing
- **Photo processing** with ImageMagick
  - Batch resize and format conversion
  - Custom naming patterns (studio1, gallery1, etc.)
  - HEIC support for iPhone photos
  - Automatic web optimization
- **Video processing** with FFmpeg
  - Convert videos to audio (MP4/MOV → MP3/WAV)
  - Batch processing with JSON configuration
  - Flexible input/output mapping

### ✅ Deployment System
- **Incremental deployment** for content updates
- **Full site refresh** for complete rebuilds
- **Rate limiting** and retry logic for API reliability
- **SHA1 comparison** to avoid unnecessary uploads
- **MP3 exclusion** options for performance
- **Dry-run mode** for safe testing

### ✅ Dependency Management
- **Automatic dependency detection** for all scripts
- **Interactive installation** prompts
- **Platform-specific instructions** (macOS, Linux, Windows)
- **Graceful fallbacks** when auto-install fails

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

### Dependency Issues
```bash
# Check what's missing
npm run check-deps

# Common fixes
brew install imagemagick ffmpeg jq  # macOS
sudo apt install imagemagick ffmpeg jq  # Ubuntu
```

### Photo Processing
- **No files found**: Check files are in `process_photos/` directory
- **Permission denied**: Run `chmod +x process_photos/run_me.sh`
- **ImageMagick errors**: Verify installation with `magick --version`

### Video Processing
- **FFmpeg not found**: Install with `brew install ffmpeg`
- **JSON errors**: Validate your JSON format
- **File not found**: Check files are in `process_video/` directory

### Deployment
- **API key missing**: Set `NEOCITIES_API_KEY` environment variable
- **Upload failures**: Check network connection and API rate limits
- **Large files**: Use `--dry-run` first to check file sizes

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

This is a personal website builder, but the system is designed to be reusable. Feel free to adapt any part for your own Neocities projects.

## 📄 License

MIT License - see package.json for details.

---

**Built with ❤️ for the Neocities community**
