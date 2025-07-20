# Photo Processing Documentation

## Overview

The `process-photos` script is a powerful tool for batch processing images using ImageMagick. It resizes photos to web-friendly dimensions and can optionally rename them with custom patterns.

## Prerequisites

- **ImageMagick** must be installed (the script will check and offer to install it)
- Photos should be placed in the `process_photos/` directory

## Basic Usage

```bash
npm run process-photos -- <size> <format> [naming_pattern]
```

### Parameters

1. **`<size>`** (required): Target dimensions in WIDTHxHEIGHT format
2. **`<format>`** (required): Output format (jpg, png, webp)
3. **`[naming_pattern]`** (optional): Custom naming pattern

## Examples

### Basic Usage (Keep Original Names)
```bash
# Resize to 512x512 pixels, output as JPEG
npm run process-photos -- 512x512 jpg

# Resize to 1024x768 pixels, output as PNG
npm run process-photos -- 1024x768 png
```

### Custom Naming Patterns
```bash
# Rename files to studio1.jpg, studio2.jpg, etc.
npm run process-photos -- 512x512 jpg studio{increment}

# Rename files to photo1.png, photo2.png, etc.
npm run process-photos -- 512x512 png photo{increment}

# Rename files to gallery1.webp, gallery2.webp, etc.
npm run process-photos -- 800x600 webp gallery{increment}
```

## Supported Input Formats

- JPEG (.jpg, .jpeg, .JPG, .JPEG)
- PNG (.png, .PNG)
- HEIC (.heic, .HEIC) - Apple's format from iOS devices
- Other ImageMagick-supported formats

## Output

- **Location**: Processed images are saved to `public/assets/`
- **Format**: Converted to your specified format (jpg, png, webp)
- **Size**: Resized to exact dimensions specified
- **Quality**: Optimized for web use

## Workflow

1. **Place source images** in the `process_photos/` directory
2. **Run the script** with your desired parameters
3. **Find processed images** in `public/assets/`
4. **Source files are cleaned up** automatically after processing

## Dependency Management

The script automatically checks for ImageMagick and will:
- ✅ Detect if ImageMagick is installed
- 🛠️ Offer to install it automatically on macOS/Linux
- 📖 Provide installation instructions for your platform
- ❌ Exit gracefully if dependencies are missing

### Manual ImageMagick Installation

If automatic installation fails:

**macOS:**
```bash
brew install imagemagick
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install imagemagick
```

**RHEL/CentOS:**
```bash
sudo yum install ImageMagick
```

**Windows:**
Download from https://imagemagick.org/script/download.php

## Common Use Cases

### Studio Photos for Gallery
```bash
# Place studio photos in process_photos/
npm run process-photos -- 512x512 jpg studio{increment}
# Results: studio1.jpg, studio2.jpg, studio3.jpg in public/assets/
```

### Screenshots for Blog Posts
```bash
# Place screenshots in process_photos/
npm run process-photos -- 800x600 png screenshot{increment}
# Results: screenshot1.png, screenshot2.png in public/assets/
```

### iPhone Photos (HEIC to JPEG)
```bash
# AirDrop HEIC files to process_photos/
npm run process-photos -- 1024x768 jpg photo{increment}
# Converts HEIC to JPEG and resizes
```

## Tips

1. **Batch Processing**: Put multiple images in `process_photos/` to process them all at once
2. **Aspect Ratio**: The script maintains aspect ratio while fitting within your specified dimensions
3. **File Cleanup**: Source files are automatically moved to a cleanup folder after processing
4. **Web Optimization**: Output images are optimized for web use with reasonable file sizes

## Troubleshooting

### "No files found"
- Check that images are in the `process_photos/` directory
- Verify file extensions are supported
- Make sure files aren't hidden (don't start with .)

### "ImageMagick not found"
- Run the script and choose 'y' for automatic installation
- Or install manually using the commands above

### "Permission denied"
- Make sure the script has execute permissions
- On macOS/Linux: `chmod +x process_photos/run_me.sh`

### "Command not found"
- Make sure you're in the project root directory
- Use `npm run process-photos` not `node process-photos.js` directly

## Integration with Website

Processed images in `public/assets/` are automatically included when you:
- Deploy your site with `npm run deploy`
- Use full site refresh with `npm run deploy-full-refresh`
- Reference them in your gallery or blog posts

The gallery system can automatically pick up new images and display them with lightbox functionality.
