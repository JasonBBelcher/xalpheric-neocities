# CLI Data Directory

This directory contains runtime data files used by watch scripts to track processed media.

## Files

### processed-photos.json
Tracking database for `watch-photos-applescript.js` and `watch-photos.js`

**Format**:
```json
{
  "UUID/L0/001": {
    "filename": "IMG_1234.HEIC",
    "status": "copied" | "failed",
    "date": "2025-11-25T12:00:00.000Z",
    "category": "photo" | "video"
  }
}
```

### processed-videos.json
Tracking database for `watch-videos.js`

**Format**: Same as processed-photos.json

## Purpose

These files prevent duplicate exports by tracking:
- Photos Library UUIDs that have been processed
- Export status (successful or failed)
- Timestamp of processing
- Media category

## Maintenance

**Reset tracking** (to re-export everything):
```bash
rm cli/data/processed-*.json
```

**Check status**:
```bash
cat cli/data/processed-photos.json | jq 'to_entries | map(select(.value.status == "failed")) | length'
```

**Clear failed items** (to retry):
```bash
# Backup first
cp cli/data/processed-photos.json cli/data/processed-photos.json.backup

# Remove failed entries (requires jq)
jq 'with_entries(select(.value.status != "failed"))' cli/data/processed-photos.json > temp.json
mv temp.json cli/data/processed-photos.json
```

## Git

These files are ignored by git (see `.gitignore`) as they contain user-specific runtime data.

**First run**: Files will be created automatically when you run any watch script for the first time.
