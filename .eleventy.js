module.exports = function(eleventyConfig) {
  // Copy static assets
  eleventyConfig.addPassthroughCopy('public/assets');
  eleventyConfig.addPassthroughCopy('public/js');
  eleventyConfig.addPassthroughCopy('public/css');
  eleventyConfig.addPassthroughCopy('public/music');
  eleventyConfig.addPassthroughCopy('src/assets');

  // Register Handlebars helpers
  eleventyConfig.addNunjucksFilter('zeroPad', function(index) {
    return String(index + 1).padStart(3, '0');
  });

  eleventyConfig.addHandlebarsHelper('zeroPad', function(index) {
    return String(index + 1).padStart(3, '0');
  });

  eleventyConfig.addHandlebarsHelper('currentYear', function() {
    return new Date().getFullYear();
  });

  eleventyConfig.addHandlebarsHelper('eq', function(a, b) {
    return a === b;
  });

  // Set template formats and directory structure
  return {
    dir: {
      input: 'src',
      output: 'public',
      includes: '_includes',
      data: '_data'
    },
    templateFormats: ['hbs', 'md', 'html'],
    htmlTemplateEngine: 'hbs',
    markdownTemplateEngine: 'hbs'
  };
};
