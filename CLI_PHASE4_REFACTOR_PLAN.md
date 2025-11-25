# CLI Phase 4: Root Scripts Refactoring Plan

**Goal**: Migrate all root-level scripts into the unified CLI structure

**Status**: Planning Phase  
**Target Completion**: Phase 4  
**Current State**: 7 deploy commands migrated, 13 root scripts remaining

---

## 📊 Current State Analysis

### ✅ Already Migrated (Phase 1-3)
```
cli/commands/deploy/
├── music.js           (was: deploy-music.js)
├── musings.js         (was: deploy-musings.js)
├── config.js          (was: deploy-config.js)
├── drum-machine.js    (was: deploy-drum-machine.js)
├── recent.js          (NEW - Git integration)
├── full.js            (NEW - Full site deploy)
└── all.js             (NEW - Orchestration)
```

### 🔄 To Be Migrated (13 scripts)

#### Category 1: Build Commands (2 scripts)
- `build-musings.js` - Markdown → HTML converter for blog
- `obsidian-to-blog.js` - Orchestrates sync + build workflow

#### Category 2: Content Processing (3 scripts)
- `sync-obsidian-images.js` - Copy images from Obsidian vault
- `process-photos.js` - Interactive photo processing with sharp/imagemagick
- `process-video.js` - Video processing with ffmpeg

#### Category 3: File Watchers (3 scripts)
- `watch-photos.js` - Advanced photo watcher with chokidar
- `watch-photos-applescript.js` - Simple AppleScript-based watcher
- `watch-videos.js` - Video file watcher

#### Category 4: Utilities (5 scripts)
- `check-deps.js` - Check system dependencies
- `check-storage.js` - Check Neocities storage usage (partially in CLI)
- `cleanup-unwanted-files.js` - Clean remote files (partially in CLI)
- `upload-asset.js` - One-off asset uploader
- `restore-ogg-files.js` - One-off restore utility

---

## 🏗️ Proposed CLI Structure

```
cli/
├── index.js                    # Main entry point
├── commands/
│   ├── deploy/                 # ✅ DONE (Phase 1-3)
│   │   ├── music.js
│   │   ├── musings.js
│   │   ├── config.js
│   │   ├── drum-machine.js
│   │   ├── recent.js
│   │   ├── full.js
│   │   └── all.js
│   ├── build/                  # 🔄 NEW (Phase 4)
│   │   ├── musings.js          # From build-musings.js
│   │   └── all.js              # From obsidian-to-blog.js
│   ├── media/                  # 🔄 NEW (Phase 4)
│   │   ├── photos.js           # From process-photos.js
│   │   ├── videos.js           # From process-video.js
│   │   └── sync-images.js      # From sync-obsidian-images.js
│   ├── watch/                  # 🔄 NEW (Phase 4)
│   │   ├── photos.js           # From watch-photos*.js
│   │   └── videos.js           # From watch-videos.js
│   └── utils/                  # 🔄 NEW (Phase 4)
│       ├── upload-asset.js     # From upload-asset.js
│       └── restore.js          # From restore-ogg-files.js
├── lib/
│   ├── api/                    # ✅ DONE
│   ├── utils/                  # ✅ DONE
│   └── media/                  # 🔄 NEW (Phase 4) - shared media processing
└── __tests__/                  # ✅ DONE (195 tests)
```

---

## 📋 Detailed Migration Plan

### Phase 4A: Build Commands

#### Task 1: `neocities build musings`
**Source**: `build-musings.js` (279 lines)  
**Target**: `cli/commands/build/musings.js`

**Functionality**:
- Convert Markdown to HTML
- Process frontmatter
- Apply templates
- Generate index pages
- Copy images

**CLI Interface**:
```bash
neocities build musings [options]

Options:
  --source <dir>      Source directory (default: thoughts-and-musings)
  --output <dir>      Output directory (default: public/musings)
  --watch             Watch for changes and rebuild
  --verbose           Verbose output
```

**Dependencies**:
- Existing: marked, gray-matter, fs/promises
- Keep: All markdown processing logic
- Refactor: File I/O to use lib/utils/files.js

**Tests Needed**:
- Markdown → HTML conversion
- Frontmatter parsing
- Template application
- Image copying
- Error handling

---

#### Task 2: `neocities build all`
**Source**: `obsidian-to-blog.js` (57 lines)  
**Target**: `cli/commands/build/all.js`

**Functionality**:
- Run sync-obsidian-images
- Run build-musings
- Orchestration with error handling

**CLI Interface**:
```bash
neocities build all [options]

Options:
  --verbose    Verbose output
```

**Dependencies**:
- Internal: Calls other CLI commands
- Pattern: Similar to deploy/all.js

**Tests Needed**:
- Orchestration flow
- Error propagation
- Success/failure reporting

---

### Phase 4B: Media Processing Commands

#### Task 3: `neocities media sync-images`
**Source**: `sync-obsidian-images.js` (173 lines)  
**Target**: `cli/commands/media/sync-images.js`

**Functionality**:
- Find images in Obsidian vault
- Copy to blog-images directory
- Maintain directory structure
- Skip already processed files

**CLI Interface**:
```bash
neocities media sync-images [options]

Options:
  --source <dir>    Source directory (default: thoughts-and-musings)
  --dest <dir>      Destination directory (default: public/assets/blog-images)
  --force           Force re-copy all images
  --verbose         Verbose output
```

**Dependencies**:
- Existing: fs/promises
- Share: lib/utils/files.js

**Tests Needed**:
- Image discovery
- Copy operations
- Skip logic
- Error handling

---

#### Task 4: `neocities media process-photos`
**Source**: `process-photos.js` (248 lines)  
**Target**: `cli/commands/media/photos.js`

**Functionality**:
- Interactive photo processing
- Resize with sharp/imagemagick
- Convert formats (JPEG, WebP)
- Quality settings
- Dependency checking

**CLI Interface**:
```bash
neocities media process-photos [options]

Options:
  --input <file>      Input photo file (required)
  --output <file>     Output file path
  --width <px>        Target width
  --height <px>       Target height
  --quality <0-100>   Quality setting (default: 85)
  --format <fmt>      Output format (jpeg, webp, png)
  --interactive       Interactive mode (default)
```

**Dependencies**:
- sharp or imagemagick (check both)
- readline for interactive mode
- Move to lib/media/photo-processor.js

**Tests Needed**:
- Dependency detection
- Image processing
- Format conversion
- Interactive prompts (mocked)

---

#### Task 5: `neocities media process-videos`
**Source**: `process-video.js` (330 lines)  
**Target**: `cli/commands/media/videos.js`

**Functionality**:
- Interactive video processing
- Compress with ffmpeg
- Extract audio
- Generate thumbnails
- Dependency checking

**CLI Interface**:
```bash
neocities media process-videos [options]

Options:
  --input <file>      Input video file (required)
  --output <file>     Output file path
  --compress          Compress video
  --extract-audio     Extract audio track
  --thumbnail         Generate thumbnail
  --quality <preset>  Quality preset (low, medium, high)
  --interactive       Interactive mode (default)
```

**Dependencies**:
- ffmpeg (required)
- Move to lib/media/video-processor.js

**Tests Needed**:
- ffmpeg detection
- Video processing commands
- Audio extraction
- Thumbnail generation

---

### Phase 4C: File Watchers

#### Task 6: `neocities watch photos`
**Source**: `watch-photos.js` + `watch-photos-applescript.js`  
**Target**: `cli/commands/watch/photos.js`

**Functionality**:
- Watch directory for new photos
- Auto-process on detection
- Two modes: chokidar (advanced) or AppleScript (simple)
- Category detection (blog vs assets)

**CLI Interface**:
```bash
neocities watch photos [options]

Options:
  --dir <path>        Directory to watch (default: ~/Desktop)
  --mode <mode>       Watch mode (chokidar, applescript) (default: chokidar)
  --auto-process      Automatically process detected photos
  --category <cat>    Target category (blog, assets, gallery)
```

**Dependencies**:
- chokidar for file watching
- AppleScript for macOS alternative
- Calls media/photos.js for processing

**Tests Needed**:
- File detection
- Category determination
- Auto-processing trigger
- Both watch modes

---

#### Task 7: `neocities watch videos`
**Source**: `watch-videos.js` (85 lines)  
**Target**: `cli/commands/watch/videos.js`

**Functionality**:
- Watch directory for new videos
- Auto-process on detection
- Category detection

**CLI Interface**:
```bash
neocities watch videos [options]

Options:
  --dir <path>        Directory to watch (default: ~/Desktop)
  --auto-process      Automatically process detected videos
  --category <cat>    Target category
```

**Dependencies**:
- chokidar
- Calls media/videos.js for processing

**Tests Needed**:
- File detection
- Auto-processing
- Category logic

---

### Phase 4D: Utility Commands

#### Task 8: Enhance `neocities check`
**Current**: Partially implemented  
**Sources**: `check-deps.js`, `check-storage.js`  
**Target**: Enhance existing `cli/index.js check` command

**Current Implementation**:
```bash
neocities check storage    # ✅ Exists
neocities check deps       # ✅ Exists
```

**Enhancements Needed**:
- Migrate `check-deps.js` logic (currently separate script)
- More comprehensive dependency checking
- Check for: ffmpeg, sharp, imagemagick, chokidar

**CLI Interface** (enhanced):
```bash
neocities check <type> [options]

Types:
  storage             Check Neocities storage usage
  deps                Check all system dependencies
  deps-media          Check media processing dependencies only
  deps-build          Check build dependencies only

Options:
  --verbose           Show detailed information
  --fix               Suggest installation commands
```

---

#### Task 9: Enhance `neocities cleanup`
**Current**: Exists  
**Source**: `cleanup-unwanted-files.js`  
**Status**: Already in CLI, verify completeness

**Verify**:
- Compare `cleanup-unwanted-files.js` with CLI implementation
- Ensure all functionality migrated
- Remove old script if redundant

---

#### Task 10: `neocities upload`
**Source**: `upload-asset.js` (hardcoded one-off)  
**Target**: `cli/commands/upload.js`

**Functionality**:
- Upload single file or directory
- Ad-hoc uploads without full deploy
- Progress reporting

**CLI Interface**:
```bash
neocities upload <file> [remotePath] [options]

Arguments:
  file                Local file or directory path
  remotePath          Remote path on Neocities (optional)

Options:
  --recursive         Upload directory recursively
  --force             Overwrite existing files
  --dry-run           Show what would be uploaded
  --verbose           Verbose output
```

**Dependencies**:
- Use existing lib/api/upload.js
- Similar to deploy commands but simpler

**Tests Needed**:
- Single file upload
- Directory upload
- Path mapping
- Error handling

---

#### Task 11: `neocities restore`
**Source**: `restore-ogg-files.js` (one-off utility)  
**Decision**: **DON'T MIGRATE**

**Reasoning**:
- One-time utility script
- Specific to restoring .ogg files
- Not general-purpose enough for CLI
- Keep as standalone script in root
- Add to `.scripts/` directory for maintenance scripts

---

## 🎯 Implementation Order

### Priority 1: Core Functionality (High Value, High Use)
1. ✅ **build musings** - Used constantly for blog updates
2. ✅ **build all** - Orchestration command
3. ✅ **media sync-images** - Used with every blog post
4. ✅ **upload** - Useful ad-hoc command

### Priority 2: Media Processing (Medium Use)
5. **media process-photos** - Used occasionally
6. **media process-videos** - Used occasionally

### Priority 3: Watchers (Low Use, Nice to Have)
7. **watch photos** - Convenience feature
8. **watch videos** - Convenience feature

### Priority 4: Enhancements (Polish)
9. **Enhanced check deps** - Better dependency management
10. **Verify cleanup** - Ensure completeness

---

## 📝 Testing Strategy

### Unit Tests
- Each command function in isolation
- Mock external dependencies (fs, execSync, etc.)
- Test error handling
- Test option parsing

### Integration Tests
- Command → Library integration
- Real file operations (in temp directories)
- Process execution (with mocks)

### Coverage Goals
- Maintain >80% coverage
- All critical paths tested
- Edge cases covered

---

## 🔧 Shared Library Components

### New: `cli/lib/media/` Directory

#### `photo-processor.js`
- Dependency checking (sharp vs imagemagick)
- Resize operations
- Format conversion
- Quality settings
- Error handling

#### `video-processor.js`
- ffmpeg detection
- Compression operations
- Audio extraction
- Thumbnail generation
- Preset management

#### `file-watcher.js`
- chokidar wrapper
- File event handling
- Category detection
- Auto-processing logic

---

## 📦 Package.json Updates

### New Scripts (Phase 4)
```json
{
  "scripts": {
    "build": "node cli/index.js build musings",
    "build:all": "node cli/index.js build all",
    "media:sync": "node cli/index.js media sync-images",
    "media:photos": "node cli/index.js media process-photos",
    "media:videos": "node cli/index.js media process-videos",
    "watch:photos": "node cli/index.js watch photos",
    "watch:videos": "node cli/index.js watch videos",
    "upload": "node cli/index.js upload"
  }
}
```

### Deprecated Scripts (Remove After Migration)
```json
{
  "scripts": {
    "build-musings": "DEPRECATED - Use: npm run build",
    "obsidian-to-blog": "DEPRECATED - Use: npm run build:all",
    "sync-obsidian-images": "DEPRECATED - Use: npm run media:sync",
    "process-photos": "DEPRECATED - Use: npm run media:photos",
    "process-video": "DEPRECATED - Use: npm run media:videos",
    "watch-photos-advanced": "DEPRECATED - Use: npm run watch:photos",
    "watch-videos": "DEPRECATED - Use: npm run watch:videos"
  }
}
```

---

## 🗂️ File Cleanup Plan

### After Migration: Move to `.scripts/` directory
```
.scripts/
├── maintenance/
│   └── restore-ogg-files.js        # One-off restoration script
├── legacy/
│   ├── build-musings.js            # Keep for reference
│   ├── obsidian-to-blog.js
│   └── ... (other migrated scripts)
└── README.md                        # Documentation for maintenance scripts
```

### Benefits:
- Clean root directory
- Preserved for reference
- Clear deprecation path
- Easy to find if needed

---

## 📊 Success Metrics

### Completion Criteria
- ✅ All root scripts migrated or archived
- ✅ All npm scripts updated
- ✅ Documentation updated
- ✅ Tests passing (target: 250+ total tests)
- ✅ Coverage maintained (>80%)
- ✅ No breaking changes for existing workflows

### Performance Targets
- Build commands: <5s execution
- Media processing: Match current performance
- Watch commands: <100ms detection latency
- Test suite: <2s execution time

---

## 🚀 Next Steps

1. **Review this plan** - Get approval on structure and priorities
2. **Create Phase 4 tasks** - Break down into smaller tickets
3. **Start with Priority 1** - Build commands (highest value)
4. **Incremental migration** - One command at a time with tests
5. **Update documentation** - As each command is migrated
6. **Final cleanup** - Archive old scripts, update package.json

---

## 📚 References

- **Phase 1-3 Documentation**: See CLI_MIGRATION.md
- **Current CLI Structure**: `cli/` directory
- **Test Suite**: `cli/__tests__/` (195 tests currently)
- **API Documentation**: `cli/lib/api/` JSDoc comments

---

**Estimated Effort**: 3-4 days full-time work  
**Estimated Test Count**: +55 tests (250 total)  
**Risk Level**: Low (incremental, non-breaking migration)

