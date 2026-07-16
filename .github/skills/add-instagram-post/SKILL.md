---
name: add-instagram-post
description: 'Add or update an Instagram post/reel in src/_data/light_bleeder_posts.json. USE FOR: adding a new Vee/Light-Bleeder visual work, refreshing the order of existing posts, or fixing a single post''s title/meta/id. Validates the entry shape (id, type, title, meta), enforces the existing 26-post convention, and reuses the instagram-embed.njk macro — do NOT create a new partial. Do NOT use for: editing a post already on Instagram (you can''t — Instagram is read-only here), or for Xalpheric''s own posts (he has none on the site, only Vee does).'
---

# Add an Instagram Post to Vee's Page

Inserts a new Instagram entry into the Light-Bleeder page (`src/light-bleeder.njk`)
via the `light_bleeder_posts.json` data file. The Eleventy build iterates this
array and the existing `igEmbed(post)` macro renders each entry. **No template
changes required.**

## When to Use

- The user gives you an Instagram URL or shortcode for a Vee post
- "Add this reel to my page", "queue this for the IG section", "update the
  caption on the June 22 spiral post"
- A post's metadata (title, meta, or shortcode) needs to change

## What It Does

1. Parses the Instagram shortcode from any IG URL (reel, p, or tv)
2. Validates the entry shape — refuses to write if fields are missing
3. Inserts the new post at the **front** of the array (newest-first, matching
   the existing convention) or replaces an existing one if the shortcode
   already exists
4. Bumps no other file — the macro at
   [`src/_includes/partials/instagram-embed.njk`](../../_includes/partials/instagram-embed.njk)
   handles the rendering, the lazy-loader at
   [`src/assets/js/ig-lazy.js`](../../assets/js/ig-lazy.js) handles the click-to-load
5. Tells the user to run `npm run build:site` and then `node cli/index.js deploy recent`
   to push the rebuilt HTML

## Inputs

- `ig_url` (required) — full Instagram URL, e.g.
  `https://www.instagram.com/reel/DaCQvI5CwNK/`
- `title` (required) — short heading for the card. ≤ 50 chars recommended;
  the existing posts all use Title Case
- `meta` (required) — single line shown under the title. The existing posts
  follow a pattern: `<date> · <visual description> · [contact hint]`. The
  `meta` line is plain text, not markdown.
- `type` (optional, default `reel`) — `reel` for IG Reels, `p` for static posts.
  Use `reel` unless the user says otherwise.
- `position` (optional, default `front`) — `front` (newest-first) or `end`
  (append at bottom). Existing posts are newest-first; default matches.

## Procedure

### 1. Extract the shortcode

```bash
# From any IG URL like https://www.instagram.com/reel/DaCQvI5CwNK/?ig=...
SHORTCODE=$(echo "$IG_URL" | sed -E 's@.*/(reel|p|tv)/([A-Za-z0-9_-]+).*@\2@')
```

The shortcode is the 11-char token after `reel/`, `p/`, or `tv/`. Validate:
`[[ "$SHORTCODE" =~ ^[A-Za-z0-9_-]{11}$ ]]`.

### 2. Build the entry

```json
{
  "id": "<SHORTCODE>",
  "type": "reel",
  "title": "<title>",
  "meta": "<meta>"
}
```

### 3. Edit `src/_data/light_bleeder_posts.json`

Use Python to do a structured edit (avoids hand-typed JSON mistakes):

```python
import json, pathlib
p = pathlib.Path("src/_data/light_bleeder_posts.json")
data = json.loads(p.read_text())

new_post = {
  "id": SHORTCODE,
  "type": "reel",
  "title": TITLE,
  "meta": META,
}

# Replace if id exists, else insert at front
posts = data["posts"]
existing = next((i for i, p in enumerate(posts) if p["id"] == SHORTCODE), None)
if existing is not None:
    posts[existing] = new_post
    print("REPLACED existing post at index", existing)
else:
    posts.insert(0, new_post)
    print("INSERTED new post at index 0 (newest-first)")

p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
```

Then validate:

```bash
node -e "JSON.parse(require('fs').readFileSync('src/_data/light_bleeder_posts.json'))"
```

### 4. Verify the build picks it up

```bash
npm run build:site
# Confirm the new card HTML is in public/light-bleeder.html
grep -c "ig-embed__title" public/light-bleeder.html
```

Expected: previous count + 1 (or unchanged if you replaced).

### 5. Hand back to the user

After the build succeeds, the change is in `public/`. The user decides when to
run `node cli/index.js deploy recent`. The skill should not auto-deploy.

## Conventions

- **Newest first.** Insert at index 0 unless the user says otherwise.
- **Title case.** `Scale Pattern Formations`, not `Scale pattern formations`.
- **`meta` is one line.** ≤ 140 chars is the soft target; existing posts
  range 60–120 chars. Format: `<date> · <visual cue> · [contact]`.
  Example: `June 25 · Purple/magenta hexagonal honeycomb glitch — open for collabs, lightbleed@gmail.com`.
- **No HTML in `title` or `meta`.** Both fields render through Nunjucks
  `{{ }}` (auto-escaped). Plain text only.
- **Shortcode is canonical.** Don't store the full URL — only the 11-char
  shortcode. The macro builds the permalink from `id` + `type`.
- **Don't reorder existing posts unless asked.** New posts always go to the
  front. If a user wants to pin an older post, do it explicitly.

## Field Reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | 11-char IG shortcode. Regex `^[A-Za-z0-9_-]{11}$`. |
| `type` | enum | yes | `reel`, `p`, or `tv`. Default `reel`. |
| `title` | string | yes | ≤ 50 chars recommended. Title Case. |
| `meta` | string | yes | One line. Pattern: `<date> · <description>`. |

## What This Skill Does NOT Do

- Doesn't fetch IG data — Instagram's API requires auth; we just store
  shortcodes and let the lazy-loader fetch the embed on click
- Doesn't modify `instagram-embed.njk` — the macro is already generic
- Doesn't change `light-bleeder.njk` template — it iterates the JSON
- Doesn't deploy — user runs `node cli/index.js deploy recent` when ready
