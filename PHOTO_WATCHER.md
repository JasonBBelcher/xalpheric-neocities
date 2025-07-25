# 📸 Xalpheric Photos Watcher

Automatically monitor your macOS Photos library for images and videos tagged with `xalpheric` and copy them to your project directories for processing.

## 🎯 Overview

This system provides two methods to automatically detect and copy media from your Photos app:

1. **AppleScript Method** (Recommended) - Uses Photos app keywords/albums
2. **Database Method** (Advanced) - Direct database access for captions

## 🚀 Quick Start

```bash
# Interactive mode with method selection
npm run watch-photos

# Or run specific methods directly:
npm run watch-photos-simple    # AppleScript method
npm run watch-photos-advanced  # Database method
```

## 📋 Setup Instructions

### Method 1: Keywords (Recommended)

1. **Tag your photos in Photos app:**
   - Select photos/videos you want to process
   - Open Info panel (`Cmd+I`)
   - Add `xalpheric` as a keyword

2. **Run the watcher:**
   ```bash
   npm run watch-photos-simple
   ```

3. **Choose your mode:**
   - Scan once and exit
   - Watch for changes continuously

### Method 2: Album-based

1. **Create an album:**
   - Create a new album named `xalpheric` in Photos app
   - Add photos/videos to this album

2. **Run the watcher** (same as Method 1)

### Method 3: Caption-based (Advanced)

1. **Add captions to photos:**
   - Select photos/videos in Photos app
   - Add `#xalpheric` to the photo's caption or title

2. **Run the advanced watcher:**
   ```bash
   npm run watch-photos-advanced
   ```

## 📁 File Organization

The system automatically sorts media into appropriate directories:

```
├── process_photos/          # Images (.jpg, .png, .heic, etc.)
├── process_video/           # Videos (.mov, .mp4, .m4v, etc.)
└── .processed-photos.json   # Tracking file (auto-generated)
```

## ⚙️ Configuration

You can customize the behavior by editing the scripts:

### `watch-photos-applescript.js` (Simple method):
```javascript
const CONFIG = {
  targetKeyword: 'xalpheric',           // Keyword to search for
  photosOutputDir: './process_photos',   // Photo destination
  videosOutputDir: './process_video',    // Video destination
  watchInterval: 10000,                  // Check every 10 seconds
  maxFileSize: 100 * 1024 * 1024,      // 100MB file size limit
};
```

### `watch-photos.js` (Advanced method):
```javascript
const CONFIG = {
  targetCaption: '#xalpheric',          // Caption text to search for
  watchInterval: 5000,                  // Check every 5 seconds
  maxFileSize: 100 * 1024 * 1024,      // 100MB file size limit
};
```

## 🛠️ Features

- **Smart Deduplication**: Tracks processed files to avoid duplicates
- **File Size Limits**: Configurable maximum file size (default: 100MB)
- **Format Support**: 
  - Images: JPG, PNG, HEIC, TIFF, GIF
  - Videos: MOV, MP4, M4V, AVI
- **Watch Mode**: Continuous monitoring for new tagged media
- **One-time Scan**: Process existing tagged media once
- **Graceful Shutdown**: Clean exit with Ctrl+C

## 🔧 Troubleshooting

### Photos App Permissions
If you get permission errors:
1. Open **System Preferences** → **Security & Privacy** → **Privacy**
2. Grant permissions for **Photos** and **Full Disk Access** to Terminal/iTerm
3. Restart the script

### Large Photo Libraries
For libraries with thousands of photos:
- Use the **AppleScript method** (more efficient)
- The script automatically falls back to album-based search for large libraries
- Consider processing in smaller batches

### Common Issues

**"Photos app not available"**
- Make sure Photos app is installed and has been opened at least once
- Check that your Photos library is initialized

**"No media found"**
- Verify your tagging method (keywords vs captions vs albums)
- Check that the keyword/caption matches exactly
- Try the alternative method

**Export failures**
- Ensure you have enough disk space
- Check file permissions in destination directories
- Some cloud-stored photos may need to download first

## 🔄 Integration with Existing Workflow

The photo watcher integrates seamlessly with your existing processing pipeline:

1. **Photos automatically copied** → `process_photos/` and `process_video/`
2. **Run photo processing** → `npm run process-photos`
3. **Run video processing** → `npm run process-video`
4. **Deploy changes** → `npm run deploy`

## 🎮 Usage Examples

### Watch continuously in background:
```bash
# Start watching and let it run
npm run watch-photos-simple

# In another terminal, continue with other work
npm run build-musings
npm run deploy
```

### One-time batch processing:
```bash
# Process all tagged photos once
npm run watch-photos-simple
# Choose option 1 (scan once)
```

### Different tagging workflows:
```bash
# For keyword-based tagging
npm run watch-photos-simple

# For caption-based tagging  
npm run watch-photos-advanced
```

## 📊 Monitoring

The system provides detailed logging:
- ✅ Successful copies with file sizes
- ⚠️ Warnings for duplicates or oversized files
- ❌ Errors with specific failure reasons
- 📊 Summary statistics after each scan

## 🔒 Privacy & Security

- **Local Processing**: All operations happen on your local machine
- **No Cloud Access**: Direct access to local Photos library only
- **Permission-based**: Requires explicit macOS permissions
- **Tracking File**: Only stores file IDs and processing status locally

## 💡 Tips

1. **Batch Tagging**: Select multiple photos and tag them all at once
2. **Smart Albums**: Create smart albums with keyword criteria for automatic organization
3. **Background Running**: Use `screen` or `tmux` to run the watcher persistently
4. **Regular Cleanup**: Periodically clean the `.processed-photos.json` file if it gets large

---

*Part of the Xalpheric Neocities project - Automating creative workflows with technology*
