const fs = require('fs');
const path = require('path');

module.exports = function() {
  const configPath = path.join(__dirname, '../../public/config/gallery.json');
  const gifsDir = path.join(__dirname, '../../public/assets/gifs');

  let galleryConfig = {
    title: 'Xalpheric Studio Gallery',
    description: 'Behind the scenes photos from the electronic music studio and live performances',
    images: [],
    categories: {
      studio: 'Studio Environment',
      equipment: 'Hardware & Equipment',
      live: 'Live Performances',
      midimob: 'MIDI Mob Collective',
      gifs: 'Animated GIFs'
    }
  };

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.gallery) {
      galleryConfig = {
        ...galleryConfig,
        ...parsed.gallery,
        categories: {
          ...galleryConfig.categories,
          ...(parsed.gallery.categories || {})
        }
      };
    }
  } catch (error) {
    console.warn('Could not read gallery config, using defaults:', error.message);
  }

  const existingFilenames = new Set(
    (galleryConfig.images || []).map((image) => image.filename).filter(Boolean)
  );

  let gifFiles = [];
  if (fs.existsSync(gifsDir)) {
    gifFiles = fs
      .readdirSync(gifsDir)
      .filter((file) => file.toLowerCase().endsWith('.gif'))
      .sort();
  }

  const gifEntries = gifFiles
    .filter((file) => !existingFilenames.has(`gifs/${file}`))
    .map((file, index) => {
      const name = path.basename(file, '.gif');
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      return {
        id: `gif-${slug || index}`,
        filename: `gifs/${file}`,
        path: `assets/gifs/${file}`,
        title: `Animated GIF · ${name}`,
        description: 'Mid-quality animated capture from a recent session',
        category: 'gifs',
        year: 2026
      };
    });

  return {
    ...galleryConfig,
    images: [...(galleryConfig.images || []), ...gifEntries]
  };
};
