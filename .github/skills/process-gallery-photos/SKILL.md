---
name: process-gallery-photos
description: 'Add a new batch of photos to the gallery (or any image-bearing page) by running the ImageMagick-based processor. USE FOR: any time the user says "process these photos", "I dropped some new pics in process_photos", "prep these for the site", "add to the gallery". Covers the full workflow: drop into process_photos/input/ → run the right processor script (blog vs assets) → verify output dimensions → move to public/images/ → rebuild → deploy. Catches the two most common mistakes: putting 4K originals straight into public/images/ (blows the Neocities 1GB cap) and forgetting to rebuild Eleventy after the move. Do NOT use for: video processing (use `media:videos`), GIF generation (use `media:gif`), or for photos that go into the main artist page (process-blog-photos handles those; for the gallery.njk page itself, use process-asset-photos).'
---

# Process Photos for the Gallery

End-to-end workflow for adding a new batch of photos to the site. The
project already has the ImageMagick-based processor at
[`cli/process-photos-enhanced.sh`](../../../../cli/process-photos-enhanced.sh) —
this skill just makes sure you call the right variant and follow the
right move/rebuild sequence.

## When to Use

- The user drops photos into `process_photos/input/` and says "process
  these" or "add to the gallery"
- A blog post (`thoughts-and-musings/<slug>.md`) needs a hero image
- A new gallery page (`src/gallery.njk`) needs more photos
- A `public/images/` directory has files > 1MB that need resizing

## What It Does

1. Confirms the source folder (`process_photos/input/` or the
   user-named folder) has JPGs/PNGs
2. Picks the right processor — `blog` for blog post heroes, `assets` for
   anything in the gallery/asset directory
3. Runs the processor with size 512 (the project standard) and JPG
   output (smaller than PNG, fine for web)
4. Verifies the output: file exists, dimensions ≤ 512px, size ≤ 500KB
5. Tells the user where the files landed and how to move them
6. Reminds to run `npm run build:site` after the move

## Inputs

- `mode` (required) — `blog` or `assets`
  - `blog` → outputs to `public/assets/blog-images/`. For images
    embedded in `thoughts-and-musings/*.md` posts
  - `assets` → outputs to `public/assets/`. For the gallery page and
    other asset directories
- `size` (optional, default `512`) — target max dimension in pixels.
  `512` is the project standard. Larger (1024, 2048) is fine for hero
  images that need more detail, but be aware of the Neocities 1GB cap.
- `format` (optional, default `jpg`) — output format. `jpg` is preferred
  for photographic content; `png` only for graphics with transparency;
  `webp` for maximum compression (Neocities serves it fine).
- `naming` (optional, default `original`) — naming pattern. Leave
  blank to keep original filenames. Use `photo{increment}` to
  normalize names.

## Procedure

### 1. Verify input

```bash
ls -la process_photos/input/  # user should have dropped files here
```

If empty, stop and ask the user. The processor will silently do nothing
on an empty directory.

### 2. Run the processor

For the **gallery** page (`src/gallery.njk`), use `assets` mode:

```bash
npm run process-asset-photos
# Equivalent to: ./cli/process-photos-enhanced.sh assets 512 jpg
```

For **blog post heroes** in `thoughts-and-musings/`, use `blog` mode:

```bash
npm run process-blog-photos
# Equivalent to: ./cli/process-photos-enhanced.sh blog 512 jpg
```

If the user needs a different size or format:

```bash
./cli/process-photos-enhanced.sh assets 1024 webp
./cli/process-photos-enhanced.sh blog 512 jpg photo{increment}
```

### 3. Verify the output

```bash
# The script writes to process_photos/output/ — confirm files are there
ls -la process_photos/output/

# Spot-check: dimensions and size
file process_photos/output/*.jpg
# Should show "512 x NNN" or "NNN x 512" or smaller

du -sh process_photos/output/
# Should be < 1MB per file, total depends on count
```

### 4. Move to public/

```bash
# For gallery assets
mv process_photos/output/*.jpg public/images/

# For blog post heroes
mv process_photos/output/*.jpg public/assets/blog-images/
```

Adjust the destination if the user has a custom folder. The default
gallery uses `public/images/`, blog heroes use
`public/assets/blog-images/`.

### 5. Rebuild and verify

```bash
npm run build:site
```

The build is required because `gallery.njk` iterates a data file that
reads from `public/images/`. The build picks up the new files.

To verify a new file made it into the rendered HTML:

```bash
grep -c "<your-new-filename>" public/gallery.html
# Expected: 1 or more
```

### 6. Hand back to the user

After the build, the change is in `public/`. The user runs the deploy:

```bash
node cli/index.js deploy recent
```

The skill does not auto-deploy.

## Conventions

- **512px is the default.** Don't go higher unless the user asks. A
  1024px or 2048px image on a 480px-wide gallery card wastes bandwidth.
- **JPG, not PNG, for photos.** The processor defaults to JPG. Only
  override to PNG if the user has images with transparency (logos,
  icons). For photographic content, JPG is 5–10× smaller.
- **Don't put 4K originals in `public/`.** The Neocities 1GB cap is
  real. The processor scales down so 4K originals stay in
  `process_photos/input/` (or get moved out of the repo entirely once
  processed).
- **Clean up `process_photos/output/`** after a successful move. Don't
  let it accumulate — the next run will overwrite matching filenames,
  but the directory itself grows.
- **Filename normalization is optional.** For a small batch (≤ 10
  files), keeping original names is fine. For larger batches, the
  `photo{increment}` pattern produces nicer gallery grids.

## Common Mistakes

1. **Forgetting to move the output.** The processor writes to
   `process_photos/output/`, NOT to `public/`. The user has to
   `mv` the files. The skill should remind them.
2. **Putting raw photos straight into `public/`.** This is the #1
   cause of the 1GB cap being blown. Always run them through
   the processor first.
3. **Wrong mode.** `process-blog-photos` outputs to
   `public/assets/blog-images/`, not `public/images/`. If a photo
   doesn't show up on the gallery page, it's in the wrong folder.
4. **Forgetting `npm run build:site`.** The gallery page reads from
   `public/images/` only at build time. New files won't appear until
   the next build.

## See Also

- [README.md](../../../../README.md) — full media pipeline overview
- [ARCHITECTURE.md §3.4](../../../../ARCHITECTURE.md) — media commands
- [process_photos/run_me.sh](../../../../process_photos/run_me.sh) — older
  photo processor (still works, just less featureful than the enhanced
  one)
- `src/gallery.njk` and `src/_data/event_photos.js` — how the gallery
  page reads from `public/images/`
