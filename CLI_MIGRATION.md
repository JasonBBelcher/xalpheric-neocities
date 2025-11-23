# CLI Migration Guide

**Date**: November 23, 2025  
**Status**: Legacy scripts deprecated, unified CLI is the standard

---

## Overview

All deployment scripts have been consolidated into the unified CLI at `cli/index.js`. The old root-level `deploy-*.js` scripts are now deprecated and will be removed.

---

## Migration Table

### Deployment Commands

| Old Command | New CLI Command | Notes |
|-------------|-----------------|-------|
| `node deploy-config.js` | `node cli/index.js deploy config` | ✅ Full feature parity |
| `node deploy-music.js` | `node cli/index.js deploy music` | ✅ Full feature parity |
| `node deploy-drum-machine.js` | `node cli/index.js deploy drum-machine` | ✅ Full feature parity |
| `node .github/scripts/deploy-musings.js` | `node cli/index.js deploy musings` | ✅ Full feature parity |
| `node .github/scripts/deploy-recent-commit.js` | `node cli/index.js deploy recent` | ✅ Git-based with improved filtering |
| `node .github/scripts/deploy-full-refresh.js` | `node cli/index.js deploy full` | ✅ With safety confirmation |
| N/A | `node cli/index.js deploy all` | 🆕 New orchestration command |

### NPM Scripts (Updated in package.json)

| Script | Command | Notes |
|--------|---------|-------|
| `npm run deploy` | Deploys musings/blog | Updated to use CLI |
| `npm run deploy-full` | Deploys entire site | Updated to use CLI |
| `npm run deploy-music` | Deploys music files | Updated to use CLI |
| `npm run deploy-config` | Deploys config files | Updated to use CLI |
| `npm run deploy-recent` | Deploys recent changes | Updated to use CLI |

---

## New CLI Features

### 1. Better Help System
```bash
node cli/index.js --help
node cli/index.js deploy --help
node cli/index.js deploy music --help
```

### 2. Consistent Options
All deploy commands support:
- `--dry-run` - Simulate without uploading
- `--verbose` or `-v` - Detailed output
- `--force` or `-f` - Skip confirmations (where applicable)

### 3. Git Integration
```bash
# Deploy files changed in last 24 hours
node cli/index.js deploy recent

# Deploy files changed since specific commit
node cli/index.js deploy recent --commit abc123

# Deploy files changed in last week
node cli/index.js deploy recent --since "1 week ago"

# Filter by pattern
node cli/index.js deploy recent --pattern "public/music/*"
```

### 4. Orchestration
```bash
# Deploy all components in sequence
node cli/index.js deploy all

# Skip specific deployments
node cli/index.js deploy all --skip drum-machine

# Stop on first error (default: continue on error)
node cli/index.js deploy all --no-continue-on-error
```

---

## Environment Variables

Both old and new systems use `.env` file:

```bash
# .env
NEOCITIES_API_KEY=your_api_key_here
```

The CLI automatically loads this file via `dotenv`.

---

## Removed Scripts

The following legacy scripts have been **removed** (backed up in git history):

- ✅ `deploy-config.js` - Replaced by CLI
- ✅ `deploy-music.js` - Replaced by CLI
- ✅ `deploy-drum-machine.js` - Replaced by CLI
- ✅ `deploy-meta-updates.js` - One-off script, no longer needed

The following are **kept** (not yet migrated to CLI):

- 🔄 `build-musings.js` - Build system (Phase 4)
- 🔄 `obsidian-to-blog.js` - Content pipeline (Phase 4)
- 🔄 `process-photos.js` - Media processing (Phase 4)
- 🔄 `process-video.js` - Media processing (Phase 4)
- 🔄 `check-deps.js` - Dependency checking (Phase 5)
- 🔄 `check-storage.js` - Storage monitoring (Phase 5)
- 🔄 `cleanup-unwanted-files.js` - File cleanup (Phase 5)
- 🔄 `watch-*.js` - Development watchers (Keep as standalone)

---

## Testing

The CLI has comprehensive test coverage:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Test Stats:**
- 176 total tests
- 83.47% statement coverage
- 83.08% branch coverage
- 1.168s execution time

---

## Rollback Plan

If you need to use the old scripts temporarily, they're available in git history:

```bash
# Restore a specific old script
git show HEAD~1:deploy-music.js > deploy-music.js.backup
```

However, the CLI is production-ready and recommended for all deployments.

---

## Future Phases

### Phase 4: Build & Media Commands (Planned)
- `neocities build musings` - Markdown to HTML conversion
- `neocities media process-photos` - Photo processing
- `neocities media process-video` - Video processing

### Phase 5: Utility Commands (Planned)
- `neocities check storage` - Storage usage reporting
- `neocities check deps` - Dependency verification
- `neocities cleanup` - Remove unwanted files

### Phase 6: Polish (Planned)
- Complete documentation
- CI/CD integration
- Performance optimization

---

## Support

For issues or questions:
1. Check `PHASE3_COMPLETE.md` for detailed command documentation
2. Run `node cli/index.js <command> --help` for command-specific help
3. Review test files in `cli/__tests__/` for usage examples

---

**Migration Complete** ✅ - All deployment functionality now uses unified CLI
