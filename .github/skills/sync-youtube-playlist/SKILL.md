---
name: sync-youtube-playlist
description: 'Sync a YouTube playlist into an artist''s `<artist>-videos.njk` Eleventy page. USE FOR: updating the xalpheric-videos.njk or any other per-artist video grid page from a YouTube playlist URL. Detects missing and stale videos, diffs against the current template, and inserts/removes the right `<div class="member-card">` blocks in one pass. Preserves the existing card HTML pattern (iframe + member-card__name + optional member-card__role) and the order of remaining cards. Do NOT use for editing individual videos, fixing typos in titles, or playlist URLs that aren''t publicly viewable (private, age-restricted, or sign-in-only playlists).'
---

# Sync a YouTube Playlist to an Artist Video Page

Reconciles a YouTube playlist against an artist's per-artist Eleventy video page
in this repo (e.g. `src/xalpheric-videos.njk`). One pass: add what's missing, remove
what's stale, leave the rest in place.

## When to Use

- The user gives you a YouTube playlist URL and says "sync", "update", "add the
  missing ones", or "is out of date"
- The page in question follows the `<div class="member-card">` grid pattern (see
  [ARCHITECTURE.md §4.4](../../../../ARCHITECTURE.md) for the partials and
  layout conventions)
- The playlist is public. (Private, age-restricted, or sign-in-only playlists
  can't be fetched by the workaround used here — fall back to asking the user
  to paste a manual list of `{id, title, role?}` objects)

## What It Does

1. Fetches the full playlist as JSON via Invidious (no auth, no YouTube key)
2. Parses each video's `videoId` and `title`
3. Reads the current `*.njk` file and extracts every `youtube.com/embed/<id>`
4. Computes the diff: missing (in playlist, not in template) and stale (in
   template, not in playlist)
5. Reports a summary to the user and asks whether to add / remove / both
6. Applies the changes using [scripts/sync-playlist.js](./scripts/sync-playlist.js):
   - Removes each stale card by matching its video ID's full member-card block
   - Appends the new cards right before the closing of the `<div class="members-grid">`
   - Each new card follows the existing pattern: title-only for plain tracks,
     `<p class="member-card__role">sub</p>` for collabs/live sets/remixes
7. Runs `npm run build:site` to regenerate `public/<artist>-videos.html`
8. Verifies the rendered page has zero drift from the playlist
9. Reports commit/push/deploy status (user decides)

## Inputs

- `playlist_url` (required) — public YouTube playlist URL, including the `?list=PL…`
  parameter. The `si=…` query param is ignored.
- `template_path` (optional, default `src/xalpheric-videos.njk`) — the Eleventy
  template to update. Must contain a `<div class="members-grid">` with
  `<div class="member-card">` children.
- `confirm` (optional, default `true` after a dry-run diff) — set to `false` to
  dry-run only (diff + report, no edits)

## Procedure

### 1. Fetch the playlist

```bash
# Extract the playlist ID from any YouTube playlist URL
PLAYLIST_ID="PLxxxxxxxxxxxxxx"

# Invidious is the workaround for YouTube requiring sign-in for
# unauthenticated playlist fetches. Try these mirrors in order:
for host in inv.nadeko.net y.com.sb inv.tux.pizza invidious.privacydev.net; do
  curl -sL --max-time 10 "https://$host/api/v1/playlists/$PLAYLIST_ID" -o /tmp/playlist.json
  if jq -e '.videos' /tmp/playlist.json >/dev/null 2>&1; then break; fi
done
```

If all mirrors fail, the playlist isn't publicly fetchable. Stop and ask the
user for a manual list of `{id, title, role?}` objects.

### 2. Read the current template

Extract every video ID:

```bash
grep -oE 'youtube\.com/embed/[A-Za-z0-9_-]+' "$TEMPLATE" | sort -u
```

### 3. Compute the diff

```bash
node -e "
  const fs = require('fs');
  const pl = require('/tmp/playlist.json').videos;
  const plIds = new Set(pl.map(v => v.videoId));
  const tmpl = new Set(fs.readFileSync('$TEMPLATE', 'utf8')
    .match(/youtube\\.com\\/embed\\/[A-Za-z0-9_-]+/g)
    .map(s => s.replace('youtube.com/embed/','')));
  console.log('+ missing:', pl.filter(v => !tmpl.has(v.videoId)).map(v => v.videoId + ' | ' + v.title.trim()));
  console.log('- stale:  ', [...tmpl].filter(id => !plIds.has(id)));
"
```

Report the diff to the user and confirm before continuing.

### 4. Apply the changes

Run the bundled script:

```bash
node .github/skills/sync-youtube-playlist/scripts/sync-playlist.js \
  --template "$TEMPLATE" \
  --playlist /tmp/playlist.json
```

The script:
- Removes each stale video's full `<div class="member-card">` block
- Appends each new card right before the `</div>` that closes the
  `<div class="members-grid">`
- Formats titles: trimmed, with embedded double-quotes escaped to `&quot;`
  for the iframe `title=` attribute
- Uses `<p class="member-card__role">sub</p>` only for cards with a meaningful
  sub-label (collab partner, mix name, "Live Set" venue, "Royalty Free", etc.)

For each missing video, decide whether it needs a role:
- Plain tracks (single-author): no role
- Collaborations: `ft. <partner>` or `<partner> Remix`
- Live sets: `Live Set · <venue> · <date>`
- Remixes: `<subject> Remix`
- Special: anything the playlist title suggests

### 5. Verify

```bash
npm run build:site
npm test
```

The script's `--verify` flag re-runs the same diff logic against the rendered
HTML in `public/<artist>-videos.html` to confirm zero drift:

```bash
node .github/skills/sync-youtube-playlist/scripts/sync-playlist.js \
  --template "$TEMPLATE" --playlist /tmp/playlist.json --verify-only
```

Expected output: `Missing: 0, Extra: 0`.

### 6. Commit and deploy

After user approval, commit the template + regenerated HTML, push, and run
`node cli/index.js deploy recent`. The user typically asks for these steps
explicitly rather than the skill doing them unprompted.

## Conventions

- **Title case for display names**: `Stolen Vibes 2`, `Kaleidoscope Hard`. Don't
  preserve the playlist's all-lowercase or all-caps form when the existing
  template uses title case.
- **Don't reorder existing cards.** The user may have intentionally arranged
  them. Only insert new cards at the end of the grid.
- **Don't touch the hero or the rest of the page.** Edits are scoped to the
  `<div class="members-grid">` block and its `member-card` children.
- **Preserve the existing card pattern verbatim.** The card structure is shared
  with the collective page and the project spec, so changing it here would
  require updating the partial at `src/_includes/partials/member-card.njk`
  too. Don't do that as part of a sync.
- **`<title>` attribute on the iframe matches the visible title.** Embedded
  double-quotes become `&quot;`.

## See Also

- [ARCHITECTURE.md §4.4](../../../../ARCHITECTURE.md) — Eleventy page and
  partial conventions
- [AGENTS.md](../../../../AGENTS.md) — project hard rules
- [ARCHITECTURE.md §6](../../../../ARCHITECTURE.md) — what's legacy vs. built
- Invidious API: `https://<host>/api/v1/playlists/<PLAYLIST_ID>` returns
  `{ videos: [{ videoId, title, ... }] }`
