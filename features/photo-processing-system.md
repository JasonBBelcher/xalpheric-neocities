# Photo Processing System

## Overview
The photo processing system provides automated image optimization and management for both blog content and general assets. It supports dual workflows with intelligent image conversion, path resolution, and seamless integration with the blog build system.

## Architecture

### Core Components
- **`process-photos-enhanced.sh`**: Main photo processing script with dual-mode support
- **`build-musings.js`**: Automatic image processing integration during blog builds
- **ImageMagick Integration**: Professional-grade image processing and optimization
- **Smart Path Resolution**: Automatic handling of relative paths, Obsidian syntax, and file discovery

### Processing Modes

#### Blog Mode (`blog`)
- **Source**: `thoughts-and-musings/` folder
- **Destination**: `public/assets/blog-images/`
- **Behavior**: 
  - Processes images alongside markdown files
  - Automatically removes originals after processing
  - Optimized for blog workflow integration
  - Handles Obsidian-style `![[filename]]` syntax

#### Assets Mode (`assets`)
- **Source**: `process_photos/` folder  
- **Destination**: `public/assets/`
- **Behavior**:
  - Preserves original workflow behavior
  - Maintains source images (except HEIC/AVIF cleanup)
  - Supports custom naming patterns
  - Compatible with existing photo management workflows

## Usage

### Direct Script Usage
```bash
# Blog image processing
./process-photos-enhanced.sh blog 512 jpg

# Asset processing with custom naming
./process-photos-enhanced.sh assets 1024 png studio{increment}

# Exact dimensions
./process-photos-enhanced.sh blog 512x512 jpg
```

### NPM Scripts
```bash
# Process blog images manually
npm run process-blog-photos

# Process asset images manually  
npm run process-asset-photos

# Build musings (includes automatic photo processing)
npm run build-musings
```

## Automatic Integration

### Blog Build Process
The `build-musings.js` script provides seamless integration:

1. **🖼️ Auto-Detection**: Scans `thoughts-and-musings/` for images
2. **📐 Processing**: Resizes images proportionally to 512px max dimension
3. **📁 Organization**: Copies processed images to `public/assets/blog-images/`
4. **🔄 Path Updates**: Automatically updates markdown image references
5. **✅ HTML Generation**: Builds blog posts with correctly linked images

### Supported Image Formats
- **Input**: JPG, JPEG, PNG, HEIC, AVIF, GIF, WEBP (case insensitive)
- **Output**: Configurable (JPG, PNG, WEBP)
- **Processing**: Smart format conversion and optimization

## Image Syntax Support

### Standard Markdown
```markdown
![Alt text](./image.jpg)
![Studio Setup](../assets/studio1.jpg)
```

### Obsidian-Style (Auto-Converted)
```markdown
![[image.jpg]]
![[studio-photo.png]]
```

### Processing Behavior
- Obsidian syntax is automatically converted to standard markdown
- Image paths are resolved relative to source file or project root
- Processed images get updated paths pointing to `blog-images/` directory
- Invalid HTML structure (divs in paragraphs) is automatically fixed

## Configuration Options

### Size Parameters
- **Proportional**: `512` (scales to fit within 512px, maintains aspect ratio)
- **Exact**: `512x512` (resizes to exact dimensions)
- **Custom**: Any valid ImageMagick size specification

### Output Formats
- **JPG**: Best for photos, smaller file sizes
- **PNG**: Best for graphics with transparency
- **WEBP**: Modern format, excellent compression

### Naming Patterns
- **Default**: Preserves original filenames
- **Incremental**: `studio{increment}` → `studio1.jpg`, `studio2.jpg`, etc.
- **Custom**: Any pattern with `{increment}` placeholder

## File Organization

### Directory Structure
```
project-root/
├── thoughts-and-musings/          # Blog content + images
├── process_photos/                # Asset processing queue
├── public/assets/                 # General assets
├── public/assets/blog-images/     # Processed blog images
└── process-photos-enhanced.sh     # Main processing script
```

### Path Resolution Logic
1. **`../assets/`** → Resolves to `public/assets/`
2. **`./relative`** → Relative to source file directory
3. **`filename`** → Search in source directory, then project root
4. **Smart Extension Matching** → Finds `.jpg` when looking for `.png`, etc.

## Workflow Examples

### Blog Post with Images
1. Create markdown file in `thoughts-and-musings/`
2. Add images to same folder
3. Reference in markdown: `![[my-photo.jpg]]` or `![Caption](./my-photo.jpg)`
4. Run `npm run build-musings`
5. Images automatically processed and blog built

### Asset Processing Batch
1. Place images in `process_photos/` folder
2. Run `./process-photos-enhanced.sh assets 1024 jpg studio{increment}`
3. Processed images appear in `public/assets/` with sequential naming

### Manual Blog Image Processing
1. Place images in `thoughts-and-musings/`
2. Run `npm run process-blog-photos`
3. Images processed to `public/assets/blog-images/`
4. Run `npm run build-musings` to update blog posts

## Migration from Legacy System

### Original Script Compatibility
- `process_photos/run_me.sh` functionality preserved in "assets" mode
- All original command-line parameters supported
- Path references updated for root-level execution
- Existing workflows continue to function

### New Capabilities Added
- Dual-mode processing (blog vs assets)
- Obsidian syntax support
- Automatic build integration
- Smart image discovery and path resolution
- HTML structure validation and correction

## Dependencies
- **ImageMagick**: `brew install imagemagick` (macOS)
- **Node.js**: For build system integration
- **Zsh**: Default shell support (macOS/Linux)

## Troubleshooting

### Common Issues
- **"magick command not found"**: Install ImageMagick
- **"Image not found"**: Check file paths and extensions
- **Invalid HTML**: Automatic correction applied during build
- **Permission denied**: Run `chmod +x process-photos-enhanced.sh`

### Debugging
- **Verbose Output**: Script provides detailed processing logs
- **Path Resolution**: Shows resolved paths during processing
- **Format Detection**: Lists supported formats when no files found
- **Build Integration**: Separate logging for photo processing vs blog building

## Performance Notes
- **Batch Processing**: Efficient handling of multiple images
- **Smart Caching**: Skips already-processed images
- **Format Optimization**: Automatic format selection for web delivery
- **Size Optimization**: Proportional scaling preserves quality while reducing file size
