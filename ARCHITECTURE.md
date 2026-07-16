# Xalpheric Neocities — Architecture

> A senior-engineer guide to the codebase. Read this first.
> The point: understand *what runs where, who calls what, and what data flows through* — without having to spelunk through every file.
>
> For visual design rules, see [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).
> For agent workflow rules (hard constraints, data-layer conventions, "don't do X"), see [AGENTS.md](AGENTS.md).
> For end-user CLI usage, see [README.md](README.md).

---

## 1. What This Is

A static site for an artist site (xalpheric.neocities.org) hosted on Neocities, plus everything needed to author, transform, build, and deploy it from a single repo.

The site itself is plain HTML/CSS/JS — Neocities is a static host, there is no runtime. The interesting part is the **build pipeline that produces `public/`**:

```
thoughts-and-musings/   process_photos/   process_video/   public/music/
        (markdown)         (raw JPGs)        (raw videos)     (loose MP3s)
              \                |                |                /
               \               v                v               /
                +---> cli/ (markdown→HTML, photo resize, video→audio) --+
                |                                                       |
                +---> src/ (Eleventy templates + data + JS) ---+        |
                |                                               |        |
                v                                               v        v
                          scripts/sync-releases.js
                                   |
                                   v
                              public/   <-- final deployable artifact
                                   |
                                   v
                          cli/ (Neocities API)
                                   |
                                   v
                       https://xalpheric.neocities.org
```

Three loosely-coupled subsystems:

1. **CLI** (`cli/`) — local Node.js process. Markdown→HTML, photo/video processing, git-aware change detection, Neocities deploys.
2. **Eleventy site build** (`src/`, `.eleventy.js`) — Nunjucks templates + JSON/JS data → HTML/CSS/JS, written into `public/`.
3. **Pre-deploy sync** (`scripts/`) — bridges the two: mirrors canonical data from `src/_data/` into `public/config/` so the CLI and runtime browser code find them at expected paths.

The end state is that `public/` is the whole site; `node cli/index.js deploy` ships it. Nothing in `public/` is hand-edited except the legacy `.html` files in `public/js/` which predate Eleventy and ship as-is.

---

## 2. Top-Level Layout

```
.
├── cli/                     Unified CLI (Node + Commander)
├── src/                     Eleventy source: templates, data, partials, JS
│   ├── _data/               Global data files (JSON or function exports)
│   ├── _includes/
│   │   ├── layouts/         Page shells
│   │   └── partials/        Reusable Nunjucks components
│   ├── assets/
│   │   ├── css/main.css     Single global stylesheet
│   │   └── js/              Eleventy-built JS modules
│   └── *.njk                One file per page
├── scripts/                 Build bridges (sync-releases, check-public-sync, build-safe)
├── public/                  Build output + legacy assets + deployable content
│   ├── config/              JSON mirrored from src/_data/ at build time
│   ├── music/, images/      Source media (raw or processed)
│   ├── js/                  Legacy JS (pre-Eleventy, hand-maintained, not built)
│   └── *.html               Eleventy output OR hand-written legacy pages
├── thoughts-and-musings/    Markdown blog source
├── process_photos/          Image processing workspace
├── process_video/           Video processing workspace
├── .eleventy.js             Eleventy config
├── cli/index.js             CLI entry point
└── package.json
```

---

## 3. Subsystem: CLI (`cli/`)

A single `commander` program registered in `cli/index.js`. One `neocities` command with subcommands grouped by verb.

### 3.1 Entry point

`cli/index.js` — registers all subcommands. Loads `.env` at startup via `loadEnvFile()`.

### 3.2 Deploy commands (`cli/commands/deploy/`)

Each one is a standalone async function that takes `(apiKey, options)`.

| File | Function | Purpose |
|---|---|---|
| `music.js` | `deployMusic(apiKey, options)` | Uploads audio referenced by a `releases.json`-shaped config. Default config path: `public/config/releases.json`. Override with `--config` to deploy a different artist's catalog (e.g. `public/config/light_bleeder_releases.json`). |
| `musings.js` | `deployMusings(apiKey, options)` | Uploads blog posts. |
| `config.js` | `deployConfig(apiKey, options)` | Uploads site config files (releases.json + default album art). |
| `recent.js` | `deployRecent(apiKey, options)` | Git-aware: only files changed since `--since <time>` (default 24h ago). |
| `full.js` | `deployFull(apiKey, options)` | Uploads everything in `public/`. Confirms unless `--force`. |
| `all.js` | `deployAll(apiKey, options)` | Orchestrates the others in order. |
| `drum-machine.js` | `deployDrumMachine(apiKey, options)` | Uploads the drum-machine sub-app bundle from a Vite build. |

Common option pattern across all: `--dry-run`, `--verbose`, `--force`. All return a `{ uploaded, skipped, errors, ... }` summary object.

### 3.3 Build commands (`cli/commands/build/`)

| File | Function | Purpose |
|---|---|---|
| `musings.js` | `buildMusings(options)` | markdown-it pipeline: `thoughts-and-musings/*.md` → `public/musings/*.html` with frontmatter, image processing, lightbox support. |
| `all.js` | `buildAll(options)` | Convenience: runs `build musings` plus any other build steps. |

### 3.4 Media commands (`cli/commands/media/`)

ImageMagick and FFmpeg wrappers.

| File | Function | Purpose |
|---|---|---|
| `photos.js` | `processPhotos(options)` | Resize/convert images in `process_photos/input/` → `process_photos/output/`. |
| `gif.js` | `processGifs(options)` | Generate mid-quality animated GIFs from source videos in `public/assets/videos/`. |
| `videos.js` | `processVideos(options)` | Transcode videos in `process_video/input/` → `process_video/output/`. |
| `sync-images.js` | `syncImages(options)` | Move processed images into `public/images/`. |
| `organize-event-photos.js` | `organizeEventPhotos(options)` | Group WhatsApp-style event photos into `public/assets/events/<event>/photo-NN.jpg`. |

### 3.5 Watch commands (`cli/commands/watch/`)

`chokidar` watchers that auto-run photo/video processing on file drops.

| File | Purpose |
|---|---|
| `watch-photos.js` | Full-featured photo watcher (chokidar). |
| `watch-photos-applescript.js` | macOS-specific AppleScript-driven variant. |
| `watch-videos.js` | Video watcher. |

### 3.6 Other commands

| File | Function | Purpose |
|---|---|---|
| `check/deps.js` | `checkDeps()` | Verify ImageMagick, FFmpeg, jq, Node deps. |
| `check/storage.js` | `checkStorage()` | Show Neocities storage usage breakdown. |
| `cleanup.js` | `cleanup(options)` | Remove orphan/temp files in `public/`. |

### 3.7 CLI library (`cli/lib/`)

The library all commands depend on. Treat as private API.

#### `cli/lib/api/` — Neocities HTTP client

| File | Exports | Signature |
|---|---|---|
| `client.js` | `makeAPICall(options, data?)`, `delay(ms)` | Promise-wrapped `https.request` to `neocities.org`. Adds `Authorization: Bearer <apiKey>` from env. Always resolves with a parsed JSON body (or `{ result: 'error', message }` on failure — never throws on HTTP errors). |
| `upload.js` | `uploadFile(local, remote, apiKey)`, `uploadWithRetry(local, remote, apiKey, options?)` | `uploadFile` posts a single file via `multipart/form-data` to `/api/upload`. `uploadWithRetry` retries `uploadFile` up to `options.maxRetries` (default 3) with `options.retryDelay` ms backoff (default 1000). |
| `delete.js` | `deleteFile(remote, apiKey)`, `deleteWithRetry(remote, apiKey, options?)` | Same shape for `DELETE /api/delete`. |
| `list.js` | `listFiles(apiKey)`, `listRemote(apiKey)`, `filterRemoteFiles(remote, predicate)` | `listFiles` returns `[{ filename, size, ... }]` for everything on the site. |

#### `cli/lib/media/` — FFmpeg / ImageMagick wrappers

| File | Exports | Signature |
|---|---|---|
| `dependencies.js` | `checkImageMagick()`, `checkFFmpeg()`, `checkFFprobe()`, `checkJq()` | Each returns `{ available: bool, version: string, path: string }`. |
| `ffmpeg.js` | `transcode(input, output, options)`, `extractAudio(input, output)`, `probeDuration(path)` | Promise-wrapped `child_process.spawn` calls. `probeDuration` returns seconds or `null`. |

#### `cli/lib/utils/` — Generic helpers

| File | Exports | Signature |
|---|---|---|
| `config.js` | `loadEnvFile()`, `getApiKey(throwOnMissing = true)`, `validateApiKey()`, `loadJsonConfig(path)` | `loadEnvFile` reads `.env` into `process.env` (no dotenv dep required). `loadJsonConfig` reads + parses + returns; throws on missing file. |
| `files.js` | `normalizePath(p)`, `getRelativePath(base, file)`, `shouldIgnoreFile(name)`, `getLocalFiles(dir)`, `filterFiles(files, opts)` | Path utilities + filesystem walkers. `getLocalFiles(dir)` recurses and returns absolute paths. `filterFiles` filters by extension list in `opts.extensions`. |
| `git.js` | `isGitRepository(cwd?)`, `getChangedFiles(opts)`, `getChangedFilesSinceCommit(from, to='HEAD', cwd?)`, `getLastCommitHash(cwd?)`, `parseGitStatus(output)` | Wraps `git diff`/`git ls-files`. `getChangedFiles` accepts `{ since, commit, pattern, includeUntracked, includeStatus, cwd }` and returns an array of paths. |
| `logger.js` | `logger.info(msg, color?)`, `logger.warn(msg, color?)`, `logger.error(msg, color?)`, `logger.success(msg)`, `logger.verbose(msg, color?)`, `logger.setVerbose(bool)`, `logger.colors` | ANSI-colored stdout logger. `verbose` is a no-op unless `--verbose` was passed. |

### 3.8 CLI conventions

- **Every command returns a structured result**, not just a `process.exit` code. The CLI wrappers in `cli/index.js` print a summary.
- **All file paths are Unix-style** (`normalizePath` is called at the entry of any function that deals with paths).
- **All deploys support `--dry-run`**. Use it freely.
- **All async work uses Promises**, no callbacks.

---

## 4. Subsystem: Eleventy Site Build (`src/` + `.eleventy.js`)

### 4.1 Build pipeline

`npm run build:site` runs:
1. `node scripts/sync-releases.js` — mirrors canonical data from `src/_data/` into `public/config/`.
2. `./node_modules/.bin/eleventy` — reads `src/`, writes `public/`.

Eleventy is configured in `.eleventy.js`:
- Input: `src/`, output: `public/`
- Includes: `_includes/`, data: `_data/`
- Template engines: `hbs` (Handlebars) for HTML/MD, plus Nunjucks (bundled with Eleventy 3.x) for `.njk` files
- Passthrough copy: `src/assets/` (so `src/assets/css/main.css` becomes `public/assets/css/main.css`)
- Watch targets: `src/assets/css/` and `src/assets/js/`

### 4.2 Pages (`src/*.njk`)

Each `.njk` is one HTML page. Frontmatter declares layout, title, description, and `permalink`. Nunjucks `{{ }}` and `{% %}` blocks render against Eleventy's data cascade.

| File | Output | Notes |
|---|---|---|
| `index.njk` | `public/index.html` | Single-scroll home. Sections: hero → identity → releases → collective → contact. |
| `releases.njk` (legacy; embedded in `index.njk` as catalog) | — | The home page catalog is the canonical releases list. |
| `collective.njk` | `public/collective.html` | MIDI Mob member cards. |
| `light-bleeder.njk` | `public/light-bleeder.html` | Vee / Light-Bleeder's page. Two sections: 01 MUSIC (data-driven player) and 02 VISUAL FEED (Instagram reels). |
| `gallery.njk` | `public/gallery.html` | Photo grid driven by `src/_data/gallery.js`. |
| `koala-songs.njk` | `public/koala-songs.html` | Downloadable Koala Sampler project files. |
| `musings.njk` | `public/musings.html` | Blog post index. |
| `links.njk` | `public/links.html` | Outbound links directory. |
| `carbilicon.njk` | `public/carbilicon.html` | Per-member subpages (Carbilicon, Joseph Deese, Lower Hybrid). |
| `joseph-deese.njk`, `lower-hybrid.njk`, `xalpheric-videos.njk`, `drum-machine.njk` | …html | More per-member/per-feature pages. |
| `*.md` (none in src/ — blog posts are in `thoughts-and-musings/` and built by the CLI) | | |

### 4.3 Data layer (`src/_data/`)

Two shapes:

- **JSON files** — Eleventy exposes the wrapper object directly. Iterate the inner array via `wrapper.arrayName`.
- **JS files exporting `module.exports = function()`** — Eleventy calls the function and exposes the return value. Use these for filesystem reads, computed values, or anything dynamic.

| File | Shape | Used in template as | Notes |
|---|---|---|---|
| `site.json` | `{ title, tagline, location, … }` | `site.*` | Global site metadata. |
| `collective.json` | `{ members: [...] }` | `collective.members` | MIDI Mob member cards. |
| `releases.json` | `{ releases: [...] }` | `releases.releases` | Canonical music catalog (Xalpheric). |
| `light_bleeder_releases.json` | `{ releases: [...] }` | `light_bleeder_releases.releases` | Vee's music catalog. |
| `light_bleeder_posts.json` | `{ posts: [...] }` | `light_bleeder_posts.posts` | Instagram reels for Vee's page. |
| `koala_songs.json` | `[ … ]` (top-level array) | `koala_songs` | Downloadable project files. |
| `gallery.js` | `function()` → `[{ id, path, title, category, ... }, ...]` | `gallery` | Static photos + auto-discovered `.gif` files. |
| `musings.js` | `function()` → `[{ slug, title }, ...]` | `musings` | Reads `thoughts-and-musings/*.md` filenames + first `# heading`. |
| `event_photos.js` | `function()` → `{ event: [{ file, description }] }` | `event_photos` | Reads `public/assets/events/<event>/photo-NN.jpg` + `public/config/event-photos.json` for captions. |

#### Release entry shape

```json
{
  "id": "snake_case_id",
  "title": "Title Case Display Name",
  "cover": "assets/<filename>",
  "audio": "music/<filename>",
  "description": "One- or two-sentence prose description.",
  "year": 2025,
  "duration": "M:SS"
}
```

Same shape for `releases.json` and `light_bleeder_releases.json`. The deploy command (`deploy:music --config ...`) only reads `audio` paths; the rest is for the page UI.

### 4.4 Layouts and partials

- **Layouts** (`src/_includes/layouts/`): `base.njk` — the HTML shell. Renders `<head>`, nav, footer, and `{{ content | safe }}` slot.
- **Partials** (`src/_includes/partials/`):
  - `nav.njk` — top fixed navigation
  - `hero.njk` — home hero with star-map background
  - `footer.njk` — site footer
  - `tag.njk` — uppercase tag chip
  - `release-strip.njk` — one row of the catalog grid (used by both pages and the home catalog)
  - `member-card.njk` — one collective member card
  - `instagram-embed.njk` — Nunjucks **macro** that renders a single click-to-load Instagram embed card. Imported via `{% from "partials/instagram-embed.njk" import igEmbed %}` and called as `{{ igEmbed(post) }}`.

### 4.5 Browser JS (`src/assets/js/`)

Three small modules. Eleventy copies them as-is to `public/assets/js/`.

| File | Purpose | API |
|---|---|---|
| `audio-bus.js` | Cross-player switch event bus. Only one audio source plays at a time across the site. | `window.AudioBus = { CHANNELS: { XALPHERIC, LIGHT_BLEEDER }, requestPause(channel), onRequestPause(ownChannel, callback) → off() }` |
| `ig-lazy.js` | Click-to-load Instagram embeds. Each card has a `<template>`; on first click the template is cloned into the live slot and `embed.js` is injected exactly once per page. | No exports. Auto-runs via DOMContentLoaded. |
| `lb-player.js` | Light-Bleeder page music catalog click-to-play. One shared `<audio>` element; clicking a strip loads + plays that track. | No exports. Auto-runs via DOMContentLoaded. Fires `AudioBus.requestPause('light-bleeder')` before play. Listens for `AudioBus.onRequestPause('light-bleeder', …)` from the xalpheric channel. |

### 4.6 Cross-player switch (the AudioBus contract)

The site has two independent audio sources: the Xalpheric radio widget / home page player (channel `"xalpheric"`) and the Light-Bleeder page music catalog (channel `"light-bleeder"`). The bus enforces that only one plays at a time.

**Pattern:**

1. A player about to start calls `AudioBus.requestPause(<its own channel>)`. This dispatches a `CustomEvent('audio:request-pause', { detail: { channel } })` on `window`.
2. Every player registers a listener via `AudioBus.onRequestPause(<its own channel>, callback)`. The bus only invokes `callback` when the requesting channel **differs** from the listener's channel — so a player never pauses itself.
3. The bus is a **switch**, not a sync. Pausing one player does not auto-resume the other.

**Implementation: where each piece lives**

- Bus: `src/assets/js/audio-bus.js` (and a mirror in `public/js/audio-bus.js` for the legacy JS path; Eleventy passthrough copies it to `public/assets/js/audio-bus.js`).
- LB player (`src/assets/js/lb-player.js`): calls `requestPause('light-bleeder')` before each `play()`. Listens for `onRequestPause('light-bleeder', …)` from xalpheric and pauses.
- Radio widget (`public/js/radio-player.js`): helper `requestXalphericPause()` called at all 4 `.play()` sites (`togglePlayPause`, `playTrack` home branch, `playTrack` radio branch, `playCurrentTrack`, auto-resume). `setupAudioBus()` in `init()` subscribes to `onRequestPause('xalpheric', …)` and pauses both `this.audio` and the home page `<audio id="player">` if active.
- Home page spacebar handler (`public/js/main.js`): calls `requestPause('xalpheric')` before starting the home player.
- Load order: `src/_includes/layouts/base.njk` loads `/js/audio-bus.js` **before** `/js/main.js`, `/js/radio-player.js` so the bus is ready when the players register their listeners.

---

## 5. Subsystem: Build Bridge (`scripts/`)

The scripts that don't fit cleanly in either the CLI or Eleventy buckets.

| File | Purpose |
|---|---|
| `sync-releases.js` | Mirrors canonical data from `src/_data/*.json` to `public/config/*.json`. Idempotent: skips the copy if the destination already matches. Wired into `npm run build:site` and `build:full`. Standalone: `npm run sync:releases`. Currently syncs `releases.json` and `light_bleeder_releases.json`. To add another: append an entry to the `PAIRS` list at the top of the file. |
| `check-public-sync.js` | Walks `public/*.html` and the Eleventy-generated build, comparing which files come from Eleventy vs. which are hand-maintained. Reports drift. Exports `compareDirectories({ generatedDir, publicDir })` and `syncGeneratedOutput({ ... })` for programmatic use. |
| `build-safe.js` | Runs Eleventy into a temp dir first, compares the result against the current `public/`, and refuses to overwrite if it would lose hand-maintained files. Used to catch accidental deletions during Eleventy regenerations. |

The bridge design is what makes "Eleventy doesn't know about the legacy `public/js/`, `public/musings/`, and the deploy CLI doesn't know about Nunjucks" work cleanly. The build emits into `public/`; the CLI deploys from `public/`; the bridge keeps the data files in sync.

---

## 6. Legacy Code

The repo has some pre-Eleventy files that ship as-is:

- `public/js/audio-bus.js`, `public/js/main.js`, `public/js/radio-player.js`, `public/js/gallery.js`, `public/js/lightbox.js`, `public/js/utils.js`, `public/js/visualizer.js`, `public/js/drum-machine/` — hand-maintained JS, not part of the Eleventy build. Loaded directly via `<script>` tags in `base.njk` and various pages.
- `public/musings/*.html` — built by `cli/commands/build/musings.js`, not by Eleventy. Eleventy does not regenerate these.

When in doubt about a file: if it lives under `public/` and is hand-edited, it's legacy; if it's in `src/`, it's part of the Eleventy build.

---

## 7. Data Flow Examples

### 7.1 Adding a new Xalpheric release

1. Add an entry to `src/_data/releases.json` (the canonical file).
2. Drop the `.mp3` into `public/music/`.
3. `npm run build:site` — `sync-releases.js` mirrors the new entry into `public/config/releases.json`, then Eleventy rebuilds the home page with the new release strip.
4. `npm run deploy:config` — uploads the updated `releases.json`.
5. `npm run deploy:music` — uploads the new `.mp3`.
6. `npm run deploy:recent` — uploads the rebuilt `public/index.html` and any other recently-changed files.

### 7.2 Adding an Instagram reel to Vee's page

1. Note the shortcode and type from the Instagram post URL.
2. Append `{ id, type, title, meta }` to `src/_data/light_bleeder_posts.json`.
3. `npm run build:site` — Eleventy regenerates `public/light-bleeder.html` with the new card.
4. `npm run deploy:recent` — uploads the rebuilt page.

### 7.3 Adding a blog post (musings)

1. Drop a new `*.md` file into `thoughts-and-musings/`. Use frontmatter for title/date.
2. `npm run build` (or `npm run build:full`) — runs `cli/commands/build/musings.js`, which converts the markdown to HTML and writes to `public/musings/`. Also regenerates `src/_data/musings.js`-derived index.
3. `npm run deploy` (or `npm run deploy:recent`) — uploads the new HTML.

---

## 8. Conventions

- **Indentation**: 2 spaces, LF line endings.
- **JSON files are pretty-printed with 2-space indent** to match the auto-formatter; don't hand-edit to single-line objects.
- **Release IDs are unique across both `releases.json` and `light_bleeder_releases.json`** (collision would matter only if we ever merged them).
- **All audio paths in data files are relative to the deploy root** (`music/...` not `/music/...`). The runtime code prepends the path prefix at fetch time.
- **All cover paths in data files are relative to the deploy root** (`assets/...`).
- **The legacy JS in `public/js/` is intentionally not part of the Eleventy build.** Touching it requires a direct `deploy:recent` to ship changes.
- **The data layer is the single source of truth** for content. Templates iterate data; they don't hard-code lists. To add a release, a member, a post, a song — edit the data file, never the template.

---

## 9. How to Add a New Top-Level Page

1. Create `src/<name>.njk` with frontmatter:
   ```yaml
   ---
   layout: layouts/base.njk
   title: Page Title
   description: SEO description.
   permalink: /<name>.html
   ---
   ```
2. Add the page to `src/_includes/partials/nav.njk` so it appears in the nav.
3. `npm run build:site` to verify it renders.
4. `npm run deploy:recent` to push.

## 10. How to Add a New Data File

1. Create `src/_data/<name>.json` (or `.js` exporting `function()`).
2. The file's contents are exposed in templates as `<name>`.
3. If the data needs to be readable by the **runtime browser code** or the **CLI deploy commands**, also add it to `scripts/sync-releases.js`'s `PAIRS` array so it gets mirrored to `public/config/`.
4. `npm run build:site` to verify it loads in templates.

## 11. Testing

`npm test` runs Jest. As of the last cleanup, **27 suites, 483 tests, all passing**.

Layout: `cli/__tests__/` mirrors `cli/` — every command and lib module has a test file.

Conventions:
- Mock `child_process` (ffmpeg, git, etc.) at the module boundary, not at the function level.
- Use `fs.existsSync.mockReturnValueOnce(...)` for sequential file-existence checks.
- New code in `cli/` should come with tests in `cli/__tests__/`.

---

*End of ARCHITECTURE.md. Edit this when subsystems change, not on every feature commit.*
