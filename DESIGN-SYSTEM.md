# XALPHERIC · Design System

> **Source of truth.** All visual decisions live here. If a visual choice is not covered, ask before guessing.
> The implementation lives in [`src/assets/css/main.css`](src/assets/css/main.css) (2158 lines).
> The full template pipeline is described in [`CLAUDE.md`](CLAUDE.md).

---

## 1. Template engine: Nunjucks

This project uses **Eleventy 3.x with Nunjucks** as the template engine. Nunjucks was selected over Handlebars for its filter and macro capabilities. Handlebars references in earlier docs are deprecated.

- Templates: `src/*.njk`
- Layouts: `src/_includes/layouts/*.njk`
- Partials: `src/_includes/partials/*.njk`
- Data files: `src/_data/*.js` or `*.json`
- Config: `.eleventy.js`
- Output: `public/`

---

## 2. CSS variables (defined in `src/assets/css/main.css`)

```css
:root {
  /* Surfaces */
  --bg-base:        #1a1208;  /* primary canvas */
  --bg-mid:         #231a0a;  /* raised canvas */
  --bg-card:        #2e2210;  /* card / panel */
  --bg-dark:        #0e0c08;  /* deepest section */

  /* Accents */
  --accent-primary: #c47a2a;  /* amber — dominant warm accent */
  --accent-cold:    #2a8a9c;  /* cyan — single cold accent */
  --accent-red:     #b83228;  /* signal red — once per page max */

  /* Text */
  --text-primary:   #e4d9bc;
  --text-secondary: #8a7d62;
  --text-faint:     #4a4030;

  /* Borders */
  --border-warm:    rgba(196, 122, 42, 0.2);
  --border-cold:    rgba(42, 138, 156, 0.2);
  --border-subtle:  rgba(228, 217, 188, 0.07);

  /* Type families */
  --font-display:   'Josefin Sans', 'Futura', sans-serif;
  --font-body:      'Courier Prime', 'Courier New', monospace;
  --font-data:      'Share Tech Mono', 'Courier New', monospace;

  /* Type scale */
  --type-hero:      clamp(42px, 7vw, 88px);
  --type-h1:        clamp(28px, 4vw, 48px);
  --type-h2:        clamp(20px, 2.5vw, 30px);
  --type-h3:        16px;
  --type-body:      15px;
  --type-label:     11px;
  --type-caption:   9px;

  /* Spacing */
  --space-section:  clamp(5rem, 10vw, 9rem);
  --space-block:    clamp(2rem, 4vw, 3.5rem);

  /* Motion */
  --transition-glide: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

---

## 3. Fonts (Google Fonts, loaded in `base.njk`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;700&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Share+Tech+Mono&display=swap" rel="stylesheet">
```

- **Josefin Sans** — display, headings, hero. Weight 300 default, 700 for emphasis. Letter-spacing 0.14em+, uppercase.
- **Courier Prime** — body copy. `line-height: 1.7`, `max-width: 58ch` on body blocks.
- **Share Tech Mono** — tags, nav, coordinates, metadata. Letter-spacing 0.1em+.

**Do not use:** Inter, Roboto, Arial, system fonts.

---

## 4. Color rules

- **Amber is dominant.** Cyan is secondary and cold. Don't invert this.
- **Red is signal.** `--accent-red` appears once per page maximum.
- **No purple.** Considered and rejected.
- **No other colors** without asking.

---

## 5. Grain overlay (always present, defined in `base.njk`)

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

- Grain only. No scan lines. No halftone. Nothing else.
- The overlay sits at `z-index: 9999` and must not block interaction.

---

## 6. Typography rules

- Never center body copy. `text-align: left` always.
- Josefin Sans: `font-weight: 300` default, `700` for emphasis, `letter-spacing: 0.14em+`, uppercase.
- Courier Prime: `line-height: 1.7`, `max-width: 58ch` on body text blocks.
- Share Tech Mono: tags, nav, coordinates, metadata, `letter-spacing: 0.1em+`.
- Red is used once per page maximum.

---

## 7. Interaction

- Glide only: `transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);`
- No flicker. No snap. No glow effects except subtle `text-shadow` on cyan data readouts.

---

## 8. Texture & motifs

- **Texture:** grain only (see §5).
- **Motifs:** star maps / coordinates + reel tape imagery. Hero background and one section accent. Never repeated, never cluttered.

---

## 9. Section color map (index scroll order)

```
01 HERO         → --bg-base  + --text-primary headlines + star map bg
02 IDENTITY     → --bg-mid   + --accent-primary headlines
03 RELEASES     → --bg-base  + --accent-primary headlines
04 COLLECTIVE   → --bg-dark  + --accent-cold headlines
05 CONTACT      → --bg-mid   + --accent-primary
```

---

## 10. Hard rules

- No Tailwind, Bootstrap, or any CSS framework.
- No React, Vue, or any JS framework in templates — vanilla JS only.
- No colors outside the palette without asking.
- No texture beyond grain.
- No centered body copy.
- No Inter, Roboto, Arial, or system fonts.
- No purple.
- No `!important`.
- No inline styles except for dynamic/data-driven values.
- No `glow` / `flicker` / `snap` effects — glide only.

---

## 11. Known bugs (fix before building new features)

1. **Heading line break** — "Welcome to Xalpheria" wraps mid-word on mobile. Fix: `word-break: keep-all` or reduce `font-size` at mobile breakpoint.
2. **Centered body copy** — bio text has `text-align: center`. Change to `text-align: left`.
3. **Cyan overload** — everything glows cyan. Amber is the dominant accent; cyan is secondary and cold.

---

## 12. Reference

- `xalpheric-design-ref-v2.html` — living visual reference, open in browser to verify against.
