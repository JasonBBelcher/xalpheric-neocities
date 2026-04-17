# XALPHERIC · xalpheric.neocities.org
## Claude Code Project Instructions

---

## What This Project Is

Static website for Xalpheric — Birmingham-based electronic music producer, co-founder of MIDI Mob Collective. Hosted on Neocities (static files only).

This project has an **existing CLI build system** with media processing, deployment, and blog pipelines already in place. We are adding **Eleventy (11ty) with Handlebars** as the template layer. Do not break or replace existing CLI functionality — integrate alongside it.

**Primary purpose:** Artist identity is the hero. Music releases are the core content. Everything serves that.

---

## Existing System — Know Before Touching Anything

### Current Tech Stack
```
CLI:          Node.js, Commander.js — entry point at cli/index.js
Blog:         markdown-it / marked — markdown → HTML pipeline
Media:        ImageMagick, FFmpeg — photo resize, video/audio transcoding
Deployment:   Neocities API via node-fetch + form-data
Watching:     chokidar — file watch for photos/videos
Testing:      Jest — 409 tests, 86% coverage
Local server: http-server — serves public/ on :8080
```

### Existing npm Scripts — Do Not Remove or Break
```json
"build"                → node cli/index.js build musings
"build:all"            → node cli/index.js build all
"media:sync"           → node cli/index.js media sync-images
"deploy"               → node cli/index.js deploy musings
"deploy:all"           → node cli/index.js deploy all
"deploy:full"          → node cli/index.js deploy full
"deploy:music"         → node cli/index.js deploy music
"deploy:config"        → node cli/index.js deploy config
"deploy:recent"        → node cli/index.js deploy recent
"media:photos"         → node cli/index.js media photos
"media:videos"         → node cli/index.js media videos
"media:list-presets"   → node cli/index.js media list-video-presets
"process-blog-photos"  → ./cli/process-photos-enhanced.sh blog 512 jpg
"process-asset-photos" → ./cli/process-photos-enhanced.sh assets 512 jpg
"watch:photos"         → ./cli/watch-photos.sh
"watch:photos-simple"  → node cli/commands/watch/watch-photos-applescript.js
"watch:photos-advanced"→ node cli/commands/watch/watch-photos.js
"watch:videos"         → node cli/commands/watch/watch-videos.js
"check:deps"           → node cli/index.js check deps
"check:storage"        → node cli/index.js check storage
"cleanup"              → node cli/index.js cleanup
"serve"                → http-server public -p 8080
```

### Existing Directory Structure
```
xalpheric-neocities/
├── cli/                          # Unified CLI — do not restructure
│   ├── index.js                  # CLI entry point
│   ├── commands/
│   │   ├── deploy/               # musings, music, config, recent, full, all
│   │   ├── check/                # deps, storage
│   │   ├── watch/                # photos, videos
│   │   └── cleanup.js
│   ├── lib/                      # api, git, logger
│   └── __tests__/
├── process_photos/               # Photo processing workspace
│   ├── input/                    # Drop photos here
│   └── output/                   # Processed photos land here
├── process_video/                # Video processing workspace
│   ├── input/
│   └── output/
├── public/                       # Deployed to Neocities — final output
│   ├── css/
│   ├── js/
│   ├── images/
│   ├── music/
│   ├── config/
│   │   └── releases.json         # Music catalog — source of truth for releases
│   └── thoughts-and-musings/     # Built blog posts land here
├── thoughts-and-musings/         # Source markdown blog posts
├── coverage/
├── .github/
├── jest.config.js
├── package.json
└── .env                          # NEOCITIES_API_KEY lives here
```

---

## Eleventy Integration

### Approach
Eleventy sits **between** the source templates and `public/`. It compiles Handlebars templates into static HTML that lands in `public/`. The existing CLI then deploys `public/` to Neocities exactly as before. The media processing pipeline and CLI are untouched.

```
src/                    ← NEW: Eleventy source
  _data/                ← Global data files (JSON/JS)
  _includes/            ← Handlebars partials and layouts
  *.hbs                 ← Page templates
        ↓  eleventy build
public/                 ← EXISTING: deployed to Neocities by CLI
```

### New Directories (additions only — nothing existing moves)
```
xalpheric-neocities/
├── src/                          # NEW — Eleventy source root
│   ├── _data/
│   │   ├── releases.js           # Reads from public/config/releases.json
│   │   ├── collective.json       # MIDI Mob member data
│   │   ├── site.json             # Global site metadata
│   │   └── gallery.js            # Reads processed images from public/images/
│   ├── _includes/
│   │   ├── layouts/
│   │   │   └── base.hbs          # Base HTML shell — head, grain, fonts, nav, footer
│   │   └── partials/
│   │       ├── nav.hbs
│   │       ├── hero.hbs
│   │       ├── release-strip.hbs
│   │       ├── member-card.hbs
│   │       ├── tag.hbs
│   │       └── footer.hbs
│   ├── index.hbs                 # Home page (single scroll)
│   ├── releases.hbs              # Full catalog sub-page
│   ├── gallery.hbs               # Photo grid sub-page
│   ├── collective.hbs            # MIDI Mob members
│   └── drum-machine.hbs          # Interactive feature
├── .eleventy.js                  # NEW — Eleventy config
└── [all existing files unchanged]
```

### .eleventy.js
```javascript
module.exports = function(eleventyConfig) {
  // Passthrough — don't let Eleventy process these, just copy
  eleventyConfig.addPassthroughCopy("src/assets");

  // Watch CSS for rebuilds
  eleventyConfig.addWatchTarget("src/assets/css/");

  // Handlebars helpers
  eleventyConfig.addHandlebarsHelper("upper", function(str) {
    return str ? str.toUpperCase() : "";
  });

  eleventyConfig.addHandlebarsHelper("currentYear", function() {
    return new Date().getFullYear();
  });

  eleventyConfig.addHandlebarsHelper("formatDuration", function(seconds) {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  });

  return {
    dir: {
      input: "src",
      output: "public",     // Eleventy writes into existing public/
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["hbs", "md", "html"],
    htmlTemplateEngine: "handlebars",
    markdownTemplateEngine: "handlebars"
  };
};
```

### New npm Scripts to Add to package.json
Add only — do not remove existing scripts:
```json
"eleventy":       "@11ty/eleventy",
"eleventy:watch": "@11ty/eleventy --watch",
"eleventy:serve": "@11ty/eleventy --serve --port 8080",
"build:site":     "@11ty/eleventy",
"build:full":     "@11ty/eleventy && node cli/index.js build musings"
```

### New Dev Dependencies to Add
```bash
npm install --save-dev @11ty/eleventy handlebars
```

Verify Eleventy's current Handlebars support before installing — check the Eleventy docs for the version in use. Eleventy 2.x supports Handlebars natively without a separate plugin.

---

## Data Layer

### releases.js — reads existing releases.json, do not duplicate data
```javascript
// src/_data/releases.js
const fs = require("fs");
const path = require("path");

module.exports = function() {
  const filePath = path.resolve(__dirname, "../../public/config/releases.json");
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw).releases;
};
```

`public/config/releases.json` remains the **single source of truth**. Eleventy reads it at build time. The existing `deploy:config` CLI command still manages it. Never duplicate release data into `src/_data/`.

### site.json
```json
{
  "title": "Xalpheric",
  "tagline": "Downtempo · Psyhop · Chillhop · Ambient",
  "location": "Birmingham, Alabama",
  "collective": "MIDI Mob Collective",
  "email": "xalpheric@proton.me",
  "url": "xalpheric.neocities.org"
}
```

---

## Handlebars Template Conventions

### Frontmatter on every page
```yaml
---
layout: layouts/base.hbs
title: Releases
description: Full catalog of Xalpheric releases
---
```

### Partial usage
```handlebars
{{> partials/nav site=site}}
{{> partials/release-strip release=this}}
{{> partials/tag label="DOWNTEMPO"}}
```

### Iterating releases
```handlebars
{{#each releases}}
  {{> partials/release-strip release=this index=@index}}
{{/each}}
```

### Conditionals
```handlebars
{{#if release.isNew}}
  <span class="tag tag--alert">NEW</span>
{{/if}}
```

### Content slot in base.hbs
```handlebars
{{{content}}}
```
Triple braces — Eleventy passes compiled HTML, must not be escaped.

---

## Workflow After Integration

### Daily development
```bash
npm run eleventy:watch    # Rebuilds src/ → public/ on changes
# Separate terminal:
npm run watch:photos      # Existing photo watcher unchanged
```

### Adding a new release
1. Add entry to `public/config/releases.json`
2. `npm run build:site` — Eleventy picks up new data, rebuilds HTML
3. `npm run deploy:config` — deploys releases.json
4. `npm run deploy:recent` — deploys rebuilt HTML

### Adding new gallery photos
```bash
# Drop originals into process_photos/input/
npm run process-blog-photos    # or process-asset-photos
# Move output to public/images/
npm run build:site             # Eleventy rebuilds gallery page
npm run deploy:recent          # Deploy
```

### Full rebuild and deploy
```bash
npm run build:full    # Eleventy + blog posts
npm run deploy:full   # Deploy everything to Neocities
```

---

## Design System

**All visual decisions are in `DESIGN-SYSTEM.md`. It is the source of truth. Do not deviate without being told to. If a visual decision isn't covered, ask before guessing.**

### CSS Variables (define in base.hbs linked stylesheet or `<style>` block)
```css
:root {
  --bg-base:        #1a1208;
  --bg-mid:         #231a0a;
  --bg-card:        #2e2210;
  --bg-dark:        #0e0c08;
  --accent-primary: #c47a2a;   /* Amber — dominant warm accent */
  --accent-cold:    #2a8a9c;   /* Cyan — single cold accent */
  --accent-red:     #b83228;   /* Signal red — once per page max */
  --text-primary:   #e4d9bc;
  --text-secondary: #8a7d62;
  --text-faint:     #4a4030;
  --border-warm:    rgba(196,122,42,0.2);
  --border-cold:    rgba(42,138,156,0.2);
  --border-subtle:  rgba(228,217,188,0.07);
  --font-display:   'Josefin Sans', sans-serif;
  --font-body:      'Courier Prime', monospace;
  --font-data:      'Share Tech Mono', monospace;
}
```

### Google Fonts (in base.hbs `<head>`)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;700&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Share+Tech+Mono&display=swap" rel="stylesheet">
```

### Grain overlay (in base.hbs — always present)
```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
  opacity: 0.055;
}
```

### Typography rules
- Never center body copy — always `text-align: left`
- Josefin Sans: `font-weight: 300` default, `700` for emphasis, `letter-spacing: 0.14em+`, uppercase
- Courier Prime: `line-height: 1.7`, `max-width: 58ch` on body text blocks
- Share Tech Mono: tags, nav, coordinates, metadata, `letter-spacing: 0.1em+`
- `--accent-red` used once per page maximum

### Interaction
Glide only: `transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
No flicker. No snap. No glow effects except subtle `text-shadow` on cyan data readouts.

### Texture
Grain only (see above). No scan lines. No halftone. Nothing else.

### Motifs
Star maps / coordinates + reel tape imagery. Hero background and one section accent. Never repeated, never cluttered.

### Section color map (index.hbs scroll order)
```
01 HERO         → --bg-base + --text-primary headlines + star map bg
02 IDENTITY     → --bg-mid  + --accent-primary headlines
03 RELEASES     → --bg-base + --accent-primary headlines
04 COLLECTIVE   → --bg-dark + --accent-cold headlines
05 CONTACT      → --bg-mid  + --accent-primary
```

---

## Known Bugs — Fix Before Building New Features

1. **Heading line break** — "Welcome to Xalpheria" wraps mid-word on mobile. Fix: `word-break: keep-all` or reduce `font-size` at mobile breakpoint.
2. **Centered body copy** — bio text has `text-align: center`. Change to `text-align: left`.
3. **Cyan overload** — everything glows cyan. Amber is the dominant accent in the new system; cyan is secondary and cold.

---

## Hardware / Music Context

- **Live rig:** Roland SP-404 sampler, iPad with Koala Sampler, Yamaha MG10XU mixer, guitar
- **Bandmate rig:** Korg Electribe EMX-1
- **Collective:** MIDI Mob Collective, Birmingham AL
- **Band name:** Xalphericon (live performance project)
- **Genres:** Downtempo, psyhop, chillhop, ambient, jazz-blues
- **Vinyl sampling** is central — dusty crate-digger identity alongside electronic dancefloor energy

---

## Hard Rules

- Do not remove or break any existing CLI commands or npm scripts
- Do not move, rename, or restructure `public/` — CLI deploys from there
- Do not move `public/config/releases.json` — it is the music data source of truth
- Do not duplicate release data into `src/_data/` as static JSON — always read from releases.json
- Do not use Tailwind, Bootstrap, or any CSS framework
- Do not use React, Vue, or any JS framework in templates — vanilla JS only
- Do not introduce colors outside the palette without asking
- Do not add texture beyond grain
- Do not center body copy
- Do not use Inter, Roboto, Arial, or system fonts
- Do not add purple — considered and rejected
- Do not use `!important`
- Do not inline styles except for dynamic/data-driven values
- Run `npm test` after any changes to CLI code — 409 tests must stay green

---

## Reference Files (in repo root)

- `DESIGN-SYSTEM.md` — full visual spec: CSS, components, layout rules
- `xalpheric-design-ref-v2.html` — living visual reference, open in browser to verify against

---

*MIDI MOB COLLECTIVE · BIRMINGHAM AL · Design System v2.0 · Eleventy + Handlebars*
