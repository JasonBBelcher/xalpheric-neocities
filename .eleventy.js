module.exports = function(eleventyConfig) {
  // Nunjucks filters (built-in to Eleventy 3.x)
  eleventyConfig.addFilter("zeroPad", function(index) {
    return String(Number(index) + 1).padStart(3, "0");
  });

  // Custom filter for padding numbers to 2 digits
  eleventyConfig.addFilter("pad2", function(number) {
    return String(number).padStart(2, "0");
  });

  eleventyConfig.addFilter("currentYear", function() {
    return new Date().getFullYear();
  });

  eleventyConfig.addFilter("formatDuration", function(seconds) {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  });

  // Shortcode for currentYear (used in footer with {% currentYear %})
  eleventyConfig.addShortcode("currentYear", function() {
    return new Date().getFullYear();
  });

  // ─────────────────────────────────────────────────────────────────────
  // cacheBust filter
  // ─────────────────────────────────────────────────────────────────────
  // Appends a content-hash query string to a local asset path so the
  // browser is forced to re-fetch the asset after a content change. We
  // do NOT physically rename the file — the URL stays
  // "/assets/css/main.css" but the version string changes per build.
  //
  //   {{ "/assets/css/main.css" | cacheBust }}
  //   → "/assets/css/main.css?v=a3f8b21"
  //
  // The hash is computed from the file's content at build time. Hashes
  // are memoized per build, so multiple references to the same asset
  // produce the same query string. Remote URLs (http://, https://, //)
  // are returned unchanged.
  // ─────────────────────────────────────────────────────────────────────
  const hashCache = new Map();
  const crypto = require('crypto');
  const fsLocal = require('fs');
  const pathLocal = require('path');

  eleventyConfig.addFilter("cacheBust", function(assetPath) {
    if (typeof assetPath !== 'string' || !assetPath) return assetPath;
    // Don't touch external URLs, anchors, or query-stringed URLs
    if (/^(https?:)?\/\//i.test(assetPath)) return assetPath;
    if (assetPath.startsWith('#')) return assetPath;
    if (assetPath.includes('?')) return assetPath; // already versioned

    // Resolve the file. The project has a slightly inconsistent layout
    // (some JS in src/js/, some in src/assets/js/, both end up in
    // public/js/ after the build). We try every reasonable location
    // so the filter works no matter which path the template uses.
    const rel = assetPath.replace(/^\//, '');
    const candidates = [
      pathLocal.join(__dirname, 'src', rel),
      pathLocal.join(__dirname, 'public', rel),
      pathLocal.join(__dirname, rel) // repo-root fallback
    ];
    let absPath = null;
    for (const c of candidates) {
      if (fsLocal.existsSync(c)) { absPath = c; break; }
    }
    if (!absPath) {
      // Asset not found — return unchanged rather than break the build
      return assetPath;
    }

    // Hash the file's content. Memoize so re-renders are cheap.
    if (!hashCache.has(absPath)) {
      const bytes = fsLocal.readFileSync(absPath);
      const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 7);
      hashCache.set(absPath, hash);
    }
    const hash = hashCache.get(absPath);
    return `${assetPath}?v=${hash}`;
  });

  // Expose the build timestamp as a global data value (used by the
  // build-timestamp <meta> tag in base.njk)
  eleventyConfig.addGlobalData("buildTimestamp", function() {
    return new Date().toISOString();
  });

  // Copy src/assets → public/assets (CSS, fonts, etc.)
  eleventyConfig.addPassthroughCopy("src/assets");

  // Watch CSS for rebuilds
  eleventyConfig.addWatchTarget("src/assets/css/");

  // Watch JS for rebuilds (e.g. ig-lazy.js)
  eleventyConfig.addWatchTarget("src/assets/js/");

  return {
    dir: {
      input: "src",
      output: "public",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
