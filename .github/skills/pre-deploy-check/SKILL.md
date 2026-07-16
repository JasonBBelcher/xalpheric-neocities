---
name: pre-deploy-check
description: 'Run a pre-deploy verification checklist before pushing anything to Neocities. USE FOR: any time the user says "deploy", "ship it", "push the new release", or any equivalent — BEFORE running the deploy commands. Validates: (1) public/ matches what Eleventy would build (no untracked source edits), (2) data-layer mirrors are in sync (src/_data/*.json === public/config/*.json), (3) the Jest suite is green (483 tests), (4) the new HTML has no broken YouTube IDs, broken IG shortcodes, or 4K images that would blow the Neocities storage cap. Catches drift before the user finds it on the live site. Do NOT use for: non-deploy tasks (edits, refactors, doc updates), or for the first-time scaffolding of a new project.'
---

# Pre-Deploy Verification Checklist

Runs the four checks the project already has but no agent remembers to
chain together. **Run this BEFORE every deploy** — even a small one.
The cost is ~10 seconds; the cost of shipping a broken page is a
public site with a missing card or a stale mirror.

## When to Use

- "Deploy this", "ship the update", "push to Neocities"
- Right before `node cli/index.js deploy config` or
  `node cli/index.js deploy recent` or any of the `deploy:*` scripts
- After any change to `src/` that hasn't been built yet

## What It Does

A bundled script runs all four checks in order and prints a final
go/no-go. If any check fails, the script exits non-zero. The skill
**does not auto-fix** — it surfaces the problem and asks the user.

Typical runtime: 5–10 seconds without tests, 15–25 seconds with the
full Jest run.

### Check 1: `public/` mirrors `src/`

For every change in `src/`, has `public/` been regenerated?

```bash
# Touch-test: any .njk / _data / assets newer than the corresponding public file?
node .github/skills/pre-deploy-check/scripts/check-staleness.js
```

The script walks `src/`, finds the corresponding `public/` file, and
flags any source newer than the build output. (Sentinel: if
`public/index.html` is older than `src/index.njk`, you need
`npm run build:site`.)

### Check 2: Data mirrors are in sync

```bash
diff <(jq -S . src/_data/releases.json) <(jq -S . public/config/releases.json)
diff <(jq -S . src/_data/light_bleeder_releases.json) \
     <(jq -S . public/config/light_bleeder_releases.json)
```

Expected: no output. If diff appears, the user ran
`add-xalpheric-release` or `add-instagram-post` without
`scripts/sync-releases.js`. Re-run it.

### Check 3: Jest suite green

```bash
npm test
```

27 suites, 483 tests. If any fail, the deploy is blocked — the failing
tests are usually a sign the CLI itself broke. Surface the failure to
the user; do not auto-skip.

### Check 4: HTML asset audit

Run on the rebuilt `public/` directory:

- **YouTube IDs**: every `youtube.com/embed/<id>` should match
  `^[A-Za-z0-9_-]{11}$`. Length 11, valid charset.
- **IG shortcodes**: every `instagram.com/p/<id>` and
  `instagram.com/reel/<id>` should match `^[A-Za-z0-9_-]{11}$`.
- **Image dimensions**: every `<img src=…>` and CSS `background-image`
  should resolve to a file under ~1MB. Anything bigger is likely a
  4K original that didn't go through `process-blog-photos` /
  `process-asset-photos`.

```bash
node .github/skills/pre-deploy-check/scripts/audit-public.js
```

The script flags oversized images, malformed IDs, and any orphan
references in `public/` (files that no template uses).

## Procedure

```bash
# Single command, runs all four checks:
node .github/skills/pre-deploy-check/scripts/pre-deploy.js
```

This is a **read-only** script. It edits nothing. Exit codes:
- `0` — all green, safe to deploy
- `1` — at least one check failed, surface to the user

If green, the user proceeds with the deploy sequence they asked for:

```bash
node cli/index.js deploy config   # if data changed
node cli/index.js deploy recent   # if HTML changed
node cli/index.js deploy music    # if music files changed
node cli/index.js deploy full     # nuke and re-push
```

The skill does not invoke these — the user chooses.

## What "Drift" Looks Like in Practice

The most common drift patterns the checklist catches:

1. **Stale build.** User edited `src/index.njk` but didn't run
   `npm run build:site`. `public/index.html` is older than the source.
   The deploy ships the OLD page. Fix: build.
2. **Stale mirror.** User added a release to `src/_data/releases.json`
   but `public/config/releases.json` wasn't regenerated. The CLI's
   `deploy:config` ships the OLD config. Fix: `node scripts/sync-releases.js`.
3. **Broken YouTube ID.** User copy-pasted a URL and missed a character,
   leaving an 8-char or 13-char embed ID. The iframe loads but shows
   "Video unavailable". Fix: re-fetch the playlist and re-sync.
4. **4K photo leak.** User dropped a 12MB raw photo into
   `public/images/` and skipped `process-asset-photos`. Neocities has a
   1GB total cap. Fix: process the photo, replace the file.

## Conventions

- **Run before every deploy.** Even "small" ones.
- **Read-only.** The script edits no files. It prints what it found
  and exits. The user decides.
- **No auto-fix.** Don't write back to `public/` from this skill. If
  a fix is needed, call the right skill: `add-xalpheric-release` for
  data, `process-gallery-photos` for images, etc.
- **No deploy on failure.** If exit 1, do NOT proceed with the deploy
  even if the user says "just push it anyway". Surface the failure.

## See Also

- [ARCHITECTURE.md §5](../../../../ARCHITECTURE.md) — the build bridge
  scripts (`sync-releases.js`, `check-public-sync.js`)
- [scripts/check-public-sync.js](../../../../scripts/check-public-sync.js)
  — directory-level drift detector (this skill wraps it for the
  src/ → public/ axis)
- [scripts/sync-releases.js](../../../../scripts/sync-releases.js) — the
  mirror script
