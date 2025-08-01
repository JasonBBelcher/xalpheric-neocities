// Shared utilities for the Xalpheric website

/**
 * Determines the correct path prefix based on current location
 * @returns {string} The path prefix to use for asset loading
 */
function getPathPrefix() {
  const isInSubfolder = window.location.pathname.includes('/musings/') || 
                       window.location.pathname.includes('/gallery/') ||
                       window.location.pathname.includes('/links/');
  return isInSubfolder ? '../' : '';
}

/**
 * Loads releases configuration from JSON file
 * @param {string} pathPrefix - The path prefix to use
 * @returns {Promise<Array>} Array of release objects
 */
async function loadReleasesConfig(pathPrefix = '') {
  try {
    const response = await fetch(`${pathPrefix}config/releases.json`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const config = await response.json();
    
    if (!config.releases || !Array.isArray(config.releases) || config.releases.length === 0) {
      throw new Error('No releases found in configuration');
    }
    
    return config.releases;
  } catch (error) {
    console.error('Error loading releases configuration:', error);
    return getFallbackReleases(pathPrefix);
  }
}

/**
 * Returns fallback releases data when config loading fails
 * @param {string} pathPrefix - The path prefix to use for assets
 * @returns {Array} Array of fallback release objects
 */
function getFallbackReleases(pathPrefix = '') {
  return [
    { 
      id: "face_the_shadow",
      title: "Face The Shadow", 
      cover: `${pathPrefix}assets/release1.png`, 
      audio: `${pathPrefix}music/face_the_shadow.mp3`,
      description: "Dark ambient electronic piece",
      year: "2024",
      duration: "4:32"
    },
    { 
      id: "contemplate",
      title: "Contemplate", 
      cover: `${pathPrefix}assets/release2.jpg`, 
      audio: `${pathPrefix}music/contemplate.mp3`,
      description: "Meditative soundscape",
      year: "2024", 
      duration: "5:18"
    },
    { 
      id: "hitchcrackpot",
      title: "Hitch Crack Pot", 
      cover: `${pathPrefix}assets/release3.png`, 
      audio: `${pathPrefix}music/hitchcrackpot.mp3`,
      description: "Experimental glitch composition",
      year: "2024",
      duration: "3:45"
    },
    { 
      id: "dogs_in_the_street",
      title: "Dogs in the Street", 
      cover: `${pathPrefix}assets/release4.png`, 
      audio: `${pathPrefix}music/dogs_in_the_street.mp3`,
      description: "Urban soundscape",
      year: "2024",
      duration: "4:12"
    },
    { 
      id: "Arrival_on_Ganymede",
      title: "Arrival on Ganymede", 
      cover: `${pathPrefix}assets/release5.png`, 
      audio: `${pathPrefix}music/Arrival_on_Ganymede.mp3`,
      description: "Progressive House track with spacey vibe",
      year: "2024",
      duration: "5:30"
    }
  ];
}

/**
 * Formats release data for radio player use
 * @param {Array} releases - Raw release data
 * @param {string} pathPrefix - The path prefix to use
 * @returns {Array} Formatted playlist objects
 */
function formatReleasesForRadio(releases, pathPrefix = '') {
  return releases.map(release => ({
    id: release.id,
    title: release.title,
    cover: release.cover.startsWith('http') ? release.cover : `${pathPrefix}${release.cover}`,
    audio: release.audio.startsWith('http') ? release.audio : `${pathPrefix}${release.audio}`,
    description: release.description || '',
    year: release.year || '',
    duration: release.duration || ''
  }));
}

/**
 * Formats release data for main page use (simpler format)
 * @param {Array} releases - Raw release data
 * @returns {Array} Simplified release objects for main page
 */
function formatReleasesForMain(releases) {
  return releases.map(release => ({
    title: release.title,
    cover: release.cover,
    audio: release.audio,
    description: release.description,
    year: release.year,
    duration: release.duration
  }));
}
