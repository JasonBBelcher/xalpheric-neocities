const fs = require('fs');
const path = require('path');

/**
 * Gallery data layer for Eleventy.
 *
 * Source of truth for the /gallery page. Two sections:
 *  - images: the static photo collection (studio, live, midimob)
 *  - gifs: every .gif file in public/assets/gifs/ is auto-discovered
 *
 * Add new static photos by extending the PHOTOS array below.
 * Add new animated GIFs by dropping them in public/assets/gifs/.
 */

const PHOTOS = [
  // Studio
  {
    id: 'studio1',
    filename: 'studio1.jpg',
    path: 'assets/studio1.jpg',
    title: 'Main Production Setup',
    description: 'Primary workstation with DAW and hardware synthesizers',
    category: 'studio',
    year: 2024
  },
  {
    id: 'studio4',
    filename: 'studio4.png',
    path: 'assets/studio4.png',
    title: 'Studio Angle 2',
    description: 'Analog synthesizer collection and equipment',
    category: 'studio',
    year: 2024
  },
  {
    id: 'studio6',
    filename: 'studio6.png',
    path: 'assets/studio6.png',
    title: 'My battle station and cup a joe',
    description: 'Creative workspace with coffee companion',
    category: 'studio',
    year: 2024
  },
  {
    id: 'studio9',
    filename: 'studio9.jpg',
    path: 'assets/studio9.jpg',
    title: 'Studio Overview',
    description: 'Prophet Rev 2 Synthesizer',
    category: 'equipment',
    year: 2024
  },
  // Live — Saturn Birmingham, Oscillations 2025
  {
    id: 'saturn-oscillations11',
    filename: 'saturn-oscillations11.jpg',
    path: 'assets/saturn-oscillations11.jpg',
    title: 'Xalpheric Live',
    description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025',
    category: 'live',
    year: 2025
  },
  {
    id: 'saturn-oscillations10',
    filename: 'saturn-oscillations10.jpg',
    path: 'assets/saturn-oscillations10.jpg',
    title: 'Xalpheric Live',
    description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025',
    category: 'live',
    year: 2025
  },
  {
    id: 'saturn-oscillations9',
    filename: 'saturn-oscillations9.jpg',
    path: 'assets/saturn-oscillations9.jpg',
    title: 'Xalpheric Live',
    description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025',
    category: 'live',
    year: 2025
  },
  {
    id: 'saturn-oscillations8',
    filename: 'saturn-oscillations8.jpg',
    path: 'assets/saturn-oscillations8.jpg',
    title: 'Paul Mathews Live',
    description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025',
    category: 'live',
    year: 2025
  },
  {
    id: 'saturn-oscillations7',
    filename: 'saturn-oscillations7.jpg',
    path: 'assets/saturn-oscillations7.jpg',
    title: 'Paul Mathews Live',
    description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025',
    category: 'live',
    year: 2025
  },
  {
    id: 'saturn-oscillations6',
    filename: 'saturn-oscillations6.jpg',
    path: 'assets/saturn-oscillations6.jpg',
    title: 'Paul Mathews Live',
    description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025',
    category: 'live',
    year: 2025
  },
  {
    id: 'saturn-oscillations5',
    filename: 'saturn-oscillations5.jpg',
    path: 'assets/saturn-oscillations5.jpg',
    title: 'Noah Richardson Live',
    description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025',
    category: 'live',
    year: 2025
  },
  {
    id: 'saturn-oscillations4',
    filename: 'saturn-oscillations4.jpg',
    path: 'assets/saturn-oscillations4.jpg',
    title: 'Noah Richardson Live',
    description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025',
    category: 'live',
    year: 2025
  },
  {
    id: 'saturn-oscillations3',
    filename: 'saturn-oscillations3.jpg',
    path: 'assets/saturn-oscillations3.jpg',
    title: 'Noah Richardson Live',
    description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025',
    category: 'live',
    year: 2025
  },
  {
    id: 'saturn-oscillations2',
    filename: 'saturn-oscillations2.jpg',
    path: 'assets/saturn-oscillations2.jpg',
    title: 'Noah Richardson Live',
    description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025',
    category: 'live',
    year: 2025
  },
  {
    id: 'saturn-oscillations1',
    filename: 'saturn-oscillations1.jpg',
    path: 'assets/saturn-oscillations1.jpg',
    title: 'Noah Richardson Live',
    description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025',
    category: 'live',
    year: 2025
  },
  // MIDI Mob Collective
  {
    id: 'midimob-1',
    filename: 'midimob-1.jpg',
    path: 'assets/midimob-1.jpg',
    title: 'MIDI Mob',
    description: 'MIDI Mob Collective — Birmingham AL',
    category: 'midimob',
    year: 2025
  },
  {
    id: 'midimob-2',
    filename: 'midimob-2.jpg',
    path: 'assets/midimob-2.jpg',
    title: 'MIDI Mob',
    description: 'MIDI Mob Collective — Birmingham AL',
    category: 'midimob',
    year: 2025
  },
  {
    id: 'midimob-3',
    filename: 'midimob-3.jpg',
    path: 'assets/midimob-3.jpg',
    title: 'MIDI Mob',
    description: 'MIDI Mob Collective — Birmingham AL',
    category: 'midimob',
    year: 2025
  },
  {
    id: 'midimob-4',
    filename: 'midimob-4.png',
    path: 'assets/midimob-4.png',
    title: 'MIDI Mob',
    description: 'MIDI Mob Collective — Birmingham AL',
    category: 'midimob',
    year: 2025
  },
  {
    id: 'midimob-5',
    filename: 'midimob-5.jpeg',
    path: 'assets/midimob-5.jpeg',
    title: 'MIDI Mob',
    description: 'MIDI Mob Collective — Birmingham AL',
    category: 'midimob',
    year: 2025
  },
  {
    id: 'midimob-7',
    filename: 'midimob-7.jpg',
    path: 'assets/midimob-7.jpg',
    title: 'MIDI Mob',
    description: 'MIDI Mob Collective — Birmingham AL',
    category: 'midimob',
    year: 2025
  },
  {
    id: 'midimob-8',
    filename: 'midimob-8.jpg',
    path: 'assets/midimob-8.jpg',
    title: 'MIDI Mob',
    description: 'MIDI Mob Collective — Birmingham AL',
    category: 'midimob',
    year: 2025
  },
  {
    id: 'midimob-9',
    filename: 'midimob-9.jpg',
    path: 'assets/midimob-9.jpg',
    title: 'MIDI Mob',
    description: 'MIDI Mob Collective — Birmingham AL',
    category: 'midimob',
    year: 2025
  },
  {
    id: 'midimob-10',
    filename: 'midimob-10.jpg',
    path: 'assets/midimob-10.jpg',
    title: 'MIDI Mob',
    description: 'MIDI Mob Collective — Birmingham AL',
    category: 'midimob',
    year: 2025
  }
];

const CATEGORIES = {
  studio: 'Studio Environment',
  equipment: 'Hardware & Equipment',
  live: 'Live Performances',
  midimob: 'MIDI Mob Collective',
  gifs: 'Animated GIFs'
};

module.exports = function() {
  const gifsDir = path.join(__dirname, '../../public/assets/gifs');

  const gifFiles = fs.existsSync(gifsDir)
    ? fs.readdirSync(gifsDir)
        .filter((file) => file.toLowerCase().endsWith('.gif'))
        .sort()
    : [];

  const gifEntries = gifFiles.map((file, index) => {
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
    title: 'Xalpheric Studio Gallery',
    description: 'Behind the scenes photos from the electronic music studio and live performances',
    images: [...PHOTOS, ...gifEntries],
    categories: CATEGORIES
  };
};
