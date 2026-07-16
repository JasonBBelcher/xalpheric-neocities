#!/usr/bin/env node
/* ============================================================================
   sync-playlist.js
   ----------------------------------------------------------------------------
   Bundled script for the sync-youtube-playlist skill. Diffs a YouTube
   playlist (fetched via Invidious) against an Eleventy `<artist>-videos.njk`
   template, then applies the diff: removes stale member-card blocks, appends
   new ones in playlist order at the end of the grid.

   Flags:
     --template <path>      Path to the .njk file. Required.
     --playlist <path>      Path to the playlist JSON (from invidious).
                            Default: /tmp/playlist.json
     --apply                Apply the diff. Default: dry-run only (print summary).
     --verify-only          Don't apply; just print the diff vs the rendered
                            public/<artist>-videos.html after a build.
     --no-roles             Skip the auto-role heuristic; every new card is
                            title-only.

   Exit code 0 on success, 1 on any failure.

   Run from repo root:
     node .github/skills/sync-youtube-playlist/scripts/sync-playlist.js \
       --template src/xalpheric-videos.njk --apply
   ============================================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {
    template: null,
    playlist: '/tmp/playlist.json',
    apply: false,
    verifyOnly: false,
    noRoles: false
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--template') out.template = argv[++i];
    else if (a === '--playlist') out.playlist = argv[++i];
    else if (a === '--apply') out.apply = true;
    else if (a === '--verify-only') out.verifyOnly = true;
    else if (a === '--no-roles') out.noRoles = true;
    else if (a === '--help' || a === '-h') {
      console.log(fs.readFileSync(__filename, 'utf8').split('*/')[1].split('/*')[0]);
      process.exit(0);
    } else {
      console.error('Unknown flag:', a);
      process.exit(1);
    }
  }
  if (!out.template) {
    console.error('ERROR: --template <path> is required');
    process.exit(1);
  }
  return out;
}

function extractIdsFromNjk(text) {
  const matches = text.match(/youtube\.com\/embed\/[A-Za-z0-9_-]+/g) || [];
  return [...new Set(matches.map((m) => m.replace('youtube.com/embed/', '')))];
}

function extractIdsFromHtml(text) {
  return extractIdsFromNjk(text); // same pattern
}

function loadPlaylist(path) {
  if (!fs.existsSync(path)) {
    console.error('ERROR: playlist file not found at', path);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (!raw.videos || !Array.isArray(raw.videos)) {
    console.error('ERROR: playlist file does not have a .videos array');
    process.exit(1);
  }
  return raw.videos.map((v) => ({
    id: v.videoId,
    title: (v.title || '').trim()
  }));
}

/**
 * Heuristic for the optional <p class="member-card__role"> sub-label.
 * Keeps the role line consistent with what the existing template already
 * does for entries like 'Xalpheric Remix', 'Live at Cha House', 'Alt Version'.
 */
function inferRole(title) {
  const t = title;
  // Collaborations
  const ftMatch = t.match(/^(.*?)\s+(?:ft\.?|feat\.?|featuring)\s+(.+)$/i);
  if (ftMatch) return `ft. ${ftMatch[2].trim()}`;

  // Remixes
  if (/\b(?:remix|rework|re-edit)\b/i.test(t)) {
    const m = t.match(/^(.*?)\s+remix$/i);
    if (m && !/\bremix of\b/i.test(t)) return 'Remix';
  }

  // Live sets — pulled out of the main title into the role
  if (/\blive\b/i.test(t) && /set|performance|session|jam/i.test(t)) {
    return t.replace(/^.*?(live\s+(?:set|performance|session|jam).*)$/i, '$1');
  }

  // Generic 'Mix' suffix
  const mixMatch = t.match(/^(.*?)\s+mix$/i);
  if (mixMatch) return `${mixMatch[1].trim()} Mix`;

  return null;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function buildCardHtml({ id, title, role, useRoles }) {
  const roleHtml =
    useRoles && role
      ? `<h3 class="member-card__name">${escapeAttr(title)}</h3><p class="member-card__role">${escapeAttr(role)}</p>`
      : `<h3 class="member-card__name">${escapeAttr(title)}</h3>`;
  return (
    `      <div class="member-card">\n` +
    `        <div class="member-card__media"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/${id}" title="${escapeAttr(title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>\n` +
    `        <div class="member-card__info">${roleHtml}</div>\n` +
    `      </div>`
  );
}

function removeStaleCards(text, staleIds) {
  let out = text;
  for (const id of staleIds) {
    const re = new RegExp(
      '\\n[ \\t]*<div class="member-card">[ \\t]*\\n' +
        '[ \\t]*<div class="member-card__media"><iframe[^>]*youtube\\.com/embed/' +
        id +
        '[\\s\\S]*?</div>[ \\t]*\\n' +
        '[ \\t]*</div>[ \\t]*\\n',
      'g'
    );
    out = out.replace(re, '');
  }
  return out;
}

function appendNewCards(text, newCards) {
  if (newCards.length === 0) return text;
  const block = '\n' + newCards.map((c) => buildCardHtml(c)).join('\n') + '\n';
  // Insert before the closing of <div class="members-grid">. Pattern:
  //   \n    </div>\n  </div>\n</section>\s*$
  const re = /(\n    <\/div>\n  <\/div>\n<\/section>\s*)$/;
  const m = text.match(re);
  if (!m) {
    console.error('ERROR: could not find the grid closing pattern in the template.');
    console.error('       Looking for: \\n    </div>\\n  </div>\\n</section>');
    process.exit(1);
  }
  return text.replace(re, block + m[1]);
}

function main() {
  const args = parseArgs(process.argv);

  if (!fs.existsSync(args.template)) {
    console.error('ERROR: template not found at', args.template);
    process.exit(1);
  }

  const playlist = loadPlaylist(args.playlist);
  const playlistIds = new Set(playlist.map((v) => v.id));

  // Decide which file to read for the diff:
  //  - --verify-only: read the rendered public HTML if it exists
  //  - else: read the .njk template
  const sourcePath = args.verifyOnly
    ? args.template.replace(/^src\//, 'public/').replace(/\.njk$/, '.html')
    : args.template;

  if (!fs.existsSync(sourcePath)) {
    console.error('ERROR: source not found at', sourcePath);
    if (args.verifyOnly) {
      console.error('       Run `npm run build:site` first.');
    }
    process.exit(1);
  }

  const sourceText = fs.readFileSync(sourcePath, 'utf8');
  const sourceIds = new Set(extractIdsFromHtml(sourceText));

  const missing = playlist.filter((v) => !sourceIds.has(v.id));
  const stale = [...sourceIds].filter((id) => !playlistIds.has(id));

  console.log('=== Playlist sync summary ===');
  console.log('Playlist size :', playlist.length);
  console.log('Source size    :', sourceIds.size);
  console.log('Missing (+ add):', missing.length);
  missing.forEach((v) => console.log('  +', v.id, '|', v.title));
  console.log('Stale  (- rm)  :', stale.length);
  stale.forEach((id) => console.log('  -', id));
  console.log('==============================');

  if (args.verifyOnly) {
    process.exit(missing.length === 0 && stale.length === 0 ? 0 : 1);
  }

  if (!args.apply) {
    console.log('\nDry run only. Re-run with --apply to write changes.');
    return;
  }

  let text = fs.readFileSync(args.template, 'utf8');
  text = removeStaleCards(text, stale);
  const useRoles = !args.noRoles;
  const newCards = missing.map((v) => ({
    id: v.id,
    title: v.title,
    role: inferRole(v.title)
  }));
  text = appendNewCards(text, newCards);
  fs.writeFileSync(args.template, text);
  console.log('\nWrote', args.template);
  console.log('  removed:', stale.length, 'card(s)');
  console.log('  added  :', newCards.length, 'card(s)');
}

main();
