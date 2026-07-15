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
