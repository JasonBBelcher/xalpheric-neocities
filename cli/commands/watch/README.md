# Watch Commands

Automated file watchers that monitor macOS Photos app and export media based on specific criteria.

## Commands

### watch-photos-applescript.js

**Purpose**: Simple photo watcher using AppleScript to query Photos app  
**Method**: AppleScript queries for keywords in photo metadata  
**Keywords**: `xalpheric`, `midimob`  
**Interval**: 10 seconds

**Usage**:
```bash
npm run watch:photos-simple
# or
node cli/commands/watch/watch-photos-applescript.js
```

**Features**:
- Searches for photos with specific keywords in descriptions/titles
- Exports photos to `process_photos/input/`
- Tracks processed items in `.processed-photos.json`
- Supports images and videos (up to 100MB)

**Supported Formats**:
- Images: `.jpg`, `.jpeg`, `.png`, `.heic`, `.tiff`, `.gif`
- Videos: `.mov`, `.mp4`, `.m4v`, `.avi`

---

### watch-photos.js

**Purpose**: Advanced photo watcher using Photos database direct access  
**Method**: Queries Photos SQLite database for caption hashtags  
**Target**: `#xalpheric` caption  
**Interval**: 5 seconds  
**Dependencies**: Requires `chokidar` package

**Usage**:
```bash
npm run watch:photos-advanced
# or
node cli/commands/watch/watch-photos.js
```

**Features**:
- Direct SQLite database access for faster queries
- Watches for `#xalpheric` hashtag in photo captions
- Real-time monitoring with `chokidar` file watcher
- Validates Photos Library path
- Dependency checking (sqlite3, osascript)

**Requires**:
- macOS Photos app
- Access to Photos Library: `~/Pictures/Photos Library.photoslibrary`
- SQLite3 command-line tool

---

### watch-videos.js

**Purpose**: Video watcher specifically for Koala Sampler and MidiMob sessions  
**Method**: AppleScript queries for specific keywords  
**Keywords**: `koala`, `midimob`  
**Interval**: 10 seconds  
**Search Window**: Last 90 days only

**Usage**:
```bash
npm run watch:videos
# or
node cli/commands/watch/watch-videos.js
```

**Features**:
- Focused on music production videos (Koala, MidiMob)
- Higher file size limit (500MB for videos)
- Exports to `process_video/input/`
- Tracks processed items in `.processed-videos.json`
- Only searches recent videos (last 3 months)

**Supported Formats**: `.mov`, `.mp4`, `.m4v`, `.avi`

---

## Shell Wrapper

### ../watch-photos.sh

**Purpose**: Shell script wrapper for the advanced photo watcher  
**Usage**: `./cli/watch-photos.sh`

Provides a convenient shell wrapper for running the advanced photo watcher with proper environment setup.

---

## Configuration

All watchers share common configuration patterns:

```javascript
const CONFIG = {
  targetCaption/Keywords: [...],        // Search criteria
  photosOutputDir: 'process_photos',    // Photo output directory
  videosOutputDir: 'process_video',     // Video output directory
  watchInterval: 5000-10000,            // Check interval (ms)
  processedListFile: '.processed-*.json', // Tracking file
  maxFileSize: 100-500 MB,              // Size limits
  supportedExtensions: [...],            // File types
};
```

## Output Directories

- **Photos**: `process_photos/input/` - Ready for `npm run media:photos`
- **Videos**: `process_video/input/` - Ready for `npm run media:videos`

## Processed Tracking

Each watcher maintains a JSON file to prevent re-processing:
- `.processed-photos.json` - Photo watcher tracking
- `.processed-videos.json` - Video watcher tracking

These files store UUIDs of already-exported media items.

---

## Workflow Integration

### Complete Photo Workflow

1. **Add hashtag**: Tag photos in Photos app with `#xalpheric`
2. **Watch**: `npm run watch:photos-advanced` (monitors and exports)
3. **Process**: `npm run media:photos -- 1920x1080 jpg photo{increment}`
4. **Deploy**: `npm run deploy:recent`

### Complete Video Workflow

1. **Tag videos**: Add `koala` or `midimob` keywords to video descriptions
2. **Watch**: `npm run watch:videos` (monitors and exports)
3. **Process**: `npm run media:videos -- '[{"inputName":"video.mov","outputName":"audio.mp3"}]'`
4. **Deploy**: `npm run deploy:music`

---

## Choosing a Watcher

### Use `watch-photos-applescript.js` when:
- You want simple keyword-based searching
- You need cross-compatibility (no direct DB access)
- Multiple keywords are needed
- Slower polling is acceptable

### Use `watch-photos.js` when:
- You need faster response times (5s vs 10s)
- Caption-based tagging (`#xalpheric`) is your workflow
- You have SQLite3 available
- Direct database access is acceptable

### Use `watch-videos.js` for:
- Music production video exports
- Koala Sampler recordings
- MidiMob sessions
- Large video files (up to 500MB)

---

## Technical Notes

### Photos Library Access

The advanced watcher (`watch-photos.js`) accesses:
```
~/Pictures/Photos Library.photoslibrary/database/photos.db
```

This is read-only and safe, but requires proper permissions.

### AppleScript Method

The simple watchers use AppleScript commands like:
```javascript
osascript -e 'tell application "Photos" to get every media item whose description contains "keyword"'
```

This is slower but more compatible and doesn't require direct database access.

### Performance

- **AppleScript**: ~2-3 seconds per query (slower, more compatible)
- **SQLite**: ~0.5 seconds per query (faster, requires access)

---

## Troubleshooting

**Photos app not found**:
- Ensure Photos.app is installed
- Grant terminal/node access to Photos in System Preferences

**No items found**:
- Verify keyword/caption spelling
- Check Photos app has items with target keywords
- Ensure items are not already in processed list

**Permission errors**:
- Grant Full Disk Access to Terminal in System Preferences
- Ensure Photos Library is not locked

**High CPU usage**:
- Increase `watchInterval` to reduce polling frequency
- Use AppleScript method instead of database polling

---

*For the unified CLI photo/video processing, see the media commands in `cli/commands/media/`.*
