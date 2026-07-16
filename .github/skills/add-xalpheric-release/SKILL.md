---
name: add-xalpheric-release
description: 'Add or update a music release in src/_data/releases.json. USE FOR: adding a new Xalpheric track to the catalog, fixing a track''s title/description/audio path, or syncing the public/config/releases.json mirror. Validates the entry shape (id, title, cover, audio, description, year, duration), regenerates the public/config mirror via scripts/sync-releases.js, and reminds about the deploy:config + deploy:recent sequence. Do NOT use for: Light-Bleeder releases (those live in src/_data/light_bleeder_releases.json, separate file), or for editing the public/config/releases.json file directly — that file is overwritten on every build. The canonical edit is always on src/_data/releases.json.'
---

# Add a Xalpheric Music Release

Adds (or updates) one entry in `src/_data/releases.json`. The catalog
powers the home-page release strip, the dedicated `/releases` page, and the
music player UI. The build process mirrors the file to
`public/config/releases.json` so the CLI's `deploy:config` command can find
it.

## When to Use

- "Add this new track to the site", "publish the July 5 single"
- A track's title, description, or audio file path needs fixing
- The user gives a fresh `music/<file>.mp3` and asks to register it

## What It Does

1. Validates the entry shape — refuses to write if any required field is
   missing, or if `audio` / `cover` paths point to files that don't exist
   in `public/`
2. Inserts at the **front** of the array (newest-first, matching the
   existing convention)
3. Warns if the same `id` already exists and asks before replacing
4. Runs `node scripts/sync-releases.js` to mirror the change to
   `public/config/releases.json` (the build does this automatically too,
   but the skill runs it eagerly so the user can verify the mirror
   immediately)
5. Tells the user to run `npm run build:site` and then
   `node cli/index.js deploy config` and `node cli/index.js deploy recent`
   to ship the changes

## Inputs

- `id` (required) — kebab-case slug, unique. Convention:
  `<track-name-with-dashes>`. Examples: `good_mood_geometry`,
  `i_believe_in_music`. **Snake_case is the convention**, not kebab-case
  (despite the bash style of this README). Look at the existing entries —
  `good_mood_geometry` is snake_case, the audio file `Good-mood-geometry.mp3`
  is kebab-case. Both forms coexist intentionally.
- `title` (required) — display title, Title Case. E.g. `Good Mood Geometry`.
- `cover` (required) — relative path to cover art, prefixed `assets/...`.
  Reuse `assets/koala-album-art-default.jpg` for tracks without dedicated
  art. Always prefix with `assets/`.
- `audio` (required) — relative path to MP3, prefixed `music/...`.
  Convention: `music/<Title-with-dashes>.mp3`. Verify the file exists
  in `public/music/` before saving.
- `description` (required) — one paragraph, ≤ 280 chars. Existing
  descriptions are 1–2 sentences in the voice of "A Koala Sampler sketch..."
- `year` (required) — 4-digit year as a number, not a string. e.g. `2025`.
- `duration` (required) — string, `m:ss` format. e.g. `"2:32"`, `"3:05"`.

## Procedure

### 1. Validate the audio file exists

```bash
test -f "public/$AUDIO_PATH" || echo "MISSING: public/$AUDIO_PATH"
```

If the audio file isn't there yet, the skill **stops** and asks the user to
drop it in `public/music/` first. Never reference a non-existent file in
the data layer.

### 2. Validate the cover art exists (unless it's the default)

```bash
if [ "$COVER" != "assets/koala-album-art-default.jpg" ]; then
  test -f "public/$COVER" || echo "MISSING: public/$COVER"
fi
```

### 3. Build the entry

```json
{
  "id": "good_mood_geometry",
  "title": "Good Mood Geometry",
  "cover": "assets/koala-album-art-default.jpg",
  "audio": "music/Good-mood-geometry.mp3",
  "description": "A Koala Sampler sketch consisting of playful rhythms and melodic shapes combine to create an uplifting sonic architecture.",
  "year": 2025,
  "duration": "2:32"
}
```

### 4. Edit `src/_data/releases.json`

Use Python — never hand-edit JSON:

```python
import json, pathlib
p = pathlib.Path("src/_data/releases.json")
data = json.loads(p.read_text())

new_release = {
  "id": ID,
  "title": TITLE,
  "cover": COVER,
  "audio": AUDIO,
  "description": DESCRIPTION,
  "year": int(YEAR),
  "duration": DURATION,
}

# Validate required fields
required = {"id", "title", "cover", "audio", "description", "year", "duration"}
missing = required - set(new_release)
if missing:
    raise SystemExit(f"ERROR: missing fields: {missing}")

releases = data["releases"]
existing = next((i for i, r in enumerate(releases) if r["id"] == ID), None)
if existing is not None:
    confirm = input(f"id '{ID}' already exists at index {existing}. Replace? [y/N] ")
    if confirm.lower() != "y":
        raise SystemExit("Aborted.")
    releases[existing] = new_release
    print(f"REPLACED at index {existing}")
else:
    releases.insert(0, new_release)
    print("INSERTED at index 0 (newest-first)")

p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
```

### 5. Run the mirror

```bash
node scripts/sync-releases.js
```

This rewrites `public/config/releases.json` to match. Verify:

```bash
diff <(jq -S . src/_data/releases.json) <(jq -S . public/config/releases.json) && echo "MIRROR OK"
```

Expected: no diff.

### 6. Build

```bash
npm run build:site
# Confirm the new track appears in public/index.html and public/releases.html
grep -c "$ID" public/releases.html
```

### 7. Hand back to the user

After the build, the change is in `public/`. The user runs the deploy
sequence:

```bash
node cli/index.js deploy config   # pushes public/config/releases.json
node cli/index.js deploy recent   # pushes rebuilt HTML
```

The skill should not auto-deploy.

## Field Reference

| Field | Type | Required | Example |
|---|---|---|---|
| `id` | string | yes | `"good_mood_geometry"` (snake_case) |
| `title` | string | yes | `"Good Mood Geometry"` |
| `cover` | string | yes | `"assets/koala-album-art-default.jpg"` |
| `audio` | string | yes | `"music/Good-mood-geometry.mp3"` |
| `description` | string | yes | One paragraph, ≤ 280 chars |
| `year` | number | yes | `2025` (not `"2025"`) |
| `duration` | string | yes | `"2:32"` (m:ss format) |

## Conventions

- **snake_case `id`, kebab-case file names.** `id: "good_mood_geometry"` →
  file `Good-mood-geometry.mp3`. Look at existing entries to confirm.
- **Newest first.** Insert at index 0.
- **`year` is a JSON number, not a string.** Existing entries use bare
  integers (`2025`, not `"2025"`).
- **`duration` is a string in `m:ss` format.** Even for tracks under a
  minute, the leading `0:` is kept: `"0:42"`.
- **Default cover is `assets/koala-album-art-default.jpg`.** Only swap
  this if the user provides dedicated cover art.
- **Description voice is consistent.** "A Koala Sampler sketch..." is the
  established pattern. Keep new descriptions in the same voice unless the
  user asks otherwise.
- **Don't reorder existing releases** unless explicitly asked.

## What This Skill Does NOT Do

- Doesn't generate cover art
- Doesn't process audio (the `media:videos` and `media:photos` commands
  in `cli/index.js` handle that, but they don't transcode MP3s — that
  pipeline is separate)
- Doesn't deploy — user runs `deploy config` and `deploy recent` when ready
- Doesn't edit `public/config/releases.json` directly — that file is
  generated and gets overwritten on every build

## See Also

- [ARCHITECTURE.md §7.1](../../../../ARCHITECTURE.md) — full data flow for
  adding a release
- [ARCHITECTURE.md §4.3](../../../../ARCHITECTURE.md) — data layer conventions
- [scripts/sync-releases.js](../../../../scripts/sync-releases.js) — the
  mirror script
