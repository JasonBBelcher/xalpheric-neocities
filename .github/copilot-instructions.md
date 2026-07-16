# Xalpheric Neocities · Agent Onboarding

Static website for an electronic music producer. Hosted on Neocities (static
files only). The full picture is split across a few small docs. **Read this
file first**, then jump to whichever doc matches the task.

> Treat the docs below as the source of truth. If a doc contradicts chat
> context, the doc wins. If a doc seems wrong, ask the user before acting.

## The Docs (read by name, not by content)

| Doc | When to read | Why |
|---|---|---|
| [AGENTS.md](../../AGENTS.md) | **Always** before any non-trivial change. | Hard rules, data-layer conventions, what NOT to do, what scripts exist. |
| [ARCHITECTURE.md](../../ARCHITECTURE.md) | When touching the Eleventy build, the audio system, deploy, or data files. | Function-level map: how `src/ → public/`, what scripts run when, the audio bus, the release JSON mirror. |
| [DESIGN-SYSTEM.md](../../DESIGN-SYSTEM.md) | Any visual change. CSS, color, font, spacing, motion, layout. | The CSS variable contract, typography rules, texture rules, accent usage, "do not add purple / Inter / Roboto". |
| [README.md](../../README.md) | When the user asks how to build, test, deploy, or run the CLI. | npm scripts, CLI command list, deploy pipeline. |
| [`.github/skills/`](./skills/) | When the user names a specific workflow — e.g. "sync the YouTube playlist", "deploy", "update a release". | Reusable skills. Each has a SKILL.md and bundled scripts. |

## What the project is, in one paragraph

A static site for Xalpheric (Birmingham, AL electronic producer, co-founder of
MIDI Mob Collective) hosted on Neocities. Eleventy 3 with Nunjucks compiles
`src/` to `public/`. A custom Node.js CLI deploys `public/` to Neocities and
runs the media processing pipeline. The data layer is flat JSON files in
`src/_data/`, mirrored to `public/config/` at build time. Music is the core
content. There is no React, no Tailwind, no CSS framework. The design is a
strict CSS-variable contract (amber + cyan accents, Courier Prime + Josefin
Sans + Share Tech Mono).

## Things that will cost you time if you don't know them

1. **`releases.json` is the canonical music catalog.** It lives at
   `src/_data/releases.json`. The CLI's `deploy:config` reads from
   `public/config/releases.json` — that is a generated mirror. Edit only the
   source. The mirror is rebuilt on every `npm run build:site`.
2. **The CLI (`cli/index.js`) and the media pipeline are existing systems.**
   Do not refactor or replace them. The Eleventy build sits *between* the
   templates and `public/`, but the CLI still owns deployment. Both must
   stay working. There are 483 Jest tests; they must stay green.
3. **Color, font, and texture rules are non-negotiable.** See
   [DESIGN-SYSTEM.md](../../DESIGN-SYSTEM.md). The short version: amber is
   dominant, cyan is the single cold accent, no purple, no Inter/Roboto,
   grain only (no scan lines, no halftone).
4. **Use the skills, don't reinvent them.** Every routine workflow in this
   project has a bundled skill at [`.github/skills/`](./skills/):
   - `sync-youtube-playlist` — diff a YouTube playlist against any
     `<artist>-videos.njk` page
   - `add-instagram-post` — add a Vee/Light-Bleeder IG post to the data layer
   - `add-xalpheric-release` — add a music track to the canonical catalog
   - `pre-deploy-check` — run four drift/sanity checks before any deploy
   - `process-gallery-photos` — run the ImageMagick processor for new photos
   Read the SKILL.md before writing your own solution.
5. **The project is small, but the conventions are strict.** When in doubt,
   search for an existing example first (a similar artist page, a similar
   data file, a similar partial). New code that doesn't match an existing
   pattern will be wrong.

## How to approach a new task

1. Read this file (you're doing it).
2. Open the relevant doc from the table above.
3. Skim the matching `.github/skills/<name>/SKILL.md` if one exists.
4. If the task involves a new skill, end your turn by saying: "I'd put a
   skill for this at `.github/skills/<name>/SKILL.md` — want me to write
   it?" Most likely the answer is yes.
5. Run `npm test` after any CLI change.

## The five-minute version of the build pipeline

```
src/  (Nunjucks templates + JSON data + CSS + JS)
   ↓  @11ty/eleventy  →  scripts/sync-releases.js mirrors JSON to public/config/
public/  (built static site — deployed to Neocities)
   ↓  node cli/index.js deploy [recent | full | music | config]
Neocities
```

That's the whole pipeline. Everything else is around it.

## When to stop and ask

- The user wants a new color, font, texture, or accent that isn't in the
  design system. **Ask before introducing it.**
- The user wants to refactor the CLI or replace Eleventy. **Stop and confirm.**
- A test fails and the user didn't ask you to fix tests. **Report and stop.**
- A doc and a code comment disagree. **Surface the disagreement, don't pick.**
