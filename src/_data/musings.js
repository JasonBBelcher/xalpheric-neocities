const fs = require('fs');
const path = require('path');

/**
 * Lists musings (blog posts) for the /musings.html index page.
 *
 * Source: thoughts-and-musings/*.md (the project-level markdown folder)
 * Build: each individual post is built by the existing CLI `build musings`
 *         command, which uses markdown-it and handles image sync.
 *
 * This data file only needs slugs and titles to render the index — the
 * individual post pages are already produced and deployed.
 */
module.exports = function () {
  const sourceDir = path.join(__dirname, '..', '..', 'thoughts-and-musings');
  if (!fs.existsSync(sourceDir)) return [];

  return fs
    .readdirSync(sourceDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const slug = file.replace(/\.md$/, '');
      const raw = fs.readFileSync(path.join(sourceDir, file), 'utf8');
      // Use the first H1 in the markdown as the title; fall back to slug.
      const titleMatch = raw.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : slug;
      return {
        url: `/musings/${slug}.html`,
        fileSlug: slug,
        data: { title }
      };
    })
    .sort((a, b) => a.fileSlug.localeCompare(b.fileSlug));
};
