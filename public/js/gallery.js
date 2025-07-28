$(document).ready(function() {
  let galleryImages = [];
  let galleryConfig = {};
  let currentImageIndex = 0;

  // Load gallery configuration from JSON
  async function loadGallery() {
    try {
      const response = await fetch('config/gallery.json');
      const data = await response.json();
      galleryConfig = data.gallery;
      galleryImages = data.gallery.images;
      
      // Update page title and description if available
      if (galleryConfig.title) {
        document.title = galleryConfig.title + ' | Xalpheric';
      }
      if (galleryConfig.description) {
        $('#gallery-description').text(galleryConfig.description);
      }
      
      populateGallery();
    } catch (error) {
      console.error('Error loading gallery configuration:', error);
      // Fallback to hardcoded gallery images if JSON fails
      galleryImages = [
        { 
          filename: 'studio1.jpg', 
          title: 'Studio Setup', 
          description: 'Studio Angle 1' 
        },
        { 
          filename: 'studio4.png', 
          title: 'Studio Angle 2' 
        },
        { 
          filename: 'studio6.png', 
          title: 'My battle station and cup a joe' 
        },
        { 
          filename: 'studio9.jpg', 
          title: 'Studio Overview', 
          description: 'Prophet Rev 2 Synthesizer' 
        },
        { 
          filename: 'saturn-oscillations11.jpg', 
          title: 'Xalpheric Live', 
          description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025' 
        },
        { 
          filename: 'saturn-oscillations10.jpg', 
          title: 'Xalpheric Live', 
          description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025' 
        },
        { 
          filename: 'saturn-oscillations9.jpg', 
          title: 'Xalpheric Live', 
          description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025' 
        },
        { 
          filename: 'saturn-oscillations8.jpg', 
          title: 'Paul Mathews Live', 
          description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025' 
        },
        { 
          filename: 'saturn-oscillations7.jpg', 
          title: 'Paul Mathews Live', 
          description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025' 
        },
        { 
          filename: 'saturn-oscillations6.jpg', 
          title: 'Paul Mathews Live', 
          description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025' 
        },
        { 
          filename: 'saturn-oscillations5.jpg', 
          title: 'Noah Richardson Live', 
          description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025' 
        },
        { 
          filename: 'saturn-oscillations4.jpg', 
          title: 'Noah Richardson Live', 
          description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025' 
        },
        { 
          filename: 'saturn-oscillations3.jpg', 
          title: 'Noah Richardson Live', 
          description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025' 
        },
        { 
          filename: 'saturn-oscillations2.jpg', 
          title: 'Noah Richardson Live', 
          description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025' 
        },
        { 
          filename: 'saturn-oscillations1.jpg', 
          title: 'Noah Richardson Live', 
          description: 'Midi Mob Live at Saturn Birmingham - Oscillations 2025' 
        }
      ];
      populateGallery();
    }
  }

  // Function to create gallery item
  function createGalleryItem(imageObj) {
    const filename = imageObj.filename;
    const displayName = imageObj.title || imageObj.displayName || filename;
    const description = imageObj.description || '';
    const category = imageObj.category || 'general';
    
    return `
      <div class="gallery-item" data-category="${category}">
        <img src="assets/${filename}" 
             alt="${displayName}" 
             class="gallery-image"
             loading="lazy"
             onclick="openLightbox('assets/${filename}', '${displayName}', '${description}')">
        <div class="gallery-item-info">
          <h3 class="gallery-item-title">${displayName}</h3>
          ${description ? `<p class="gallery-item-description">${description}</p>` : ''}
        </div>
      </div>
    `;
  }

  // Create category filter buttons
  function createCategoryFilters() {
    if (!galleryConfig.categories) return;
    
    const filtersContainer = $('#category-filters');
    if (filtersContainer.length === 0) return;
    
    // Clear existing filters
    filtersContainer.empty();
    
    // Add "All" button
    filtersContainer.append(`
      <button class="filter-btn active" data-category="all">All Images</button>
    `);
    
    // Add category buttons
    Object.entries(galleryConfig.categories).forEach(([key, label]) => {
      filtersContainer.append(`
        <button class="filter-btn" data-category="${key}">${label}</button>
      `);
    });
    
    // Add click handlers
    $('.filter-btn').click(function() {
      const category = $(this).data('category');
      filterGalleryByCategory(category);
      
      // Update active state
      $('.filter-btn').removeClass('active');
      $(this).addClass('active');
    });
  }

  // Filter gallery by category
  function filterGalleryByCategory(category) {
    if (category === 'all') {
      $('.gallery-item').show();
    } else {
      $('.gallery-item').hide();
      $(`.gallery-item[data-category="${category}"]`).show();
    }
  }

  // Populate gallery
  function populateGallery() {
    const galleryGrid = $('#gallery-grid');
    
    if (galleryImages.length === 0) {
      galleryGrid.html('<p class="no-images">No images available in the gallery yet.</p>');
      return;
    }
    
    galleryGrid.empty();
    galleryImages.forEach(image => {
      galleryGrid.append(createGalleryItem(image));
    });
    
    // Create category filters if categories are defined
    createCategoryFilters();
  }

  // Lightbox functionality
  function createLightbox() {
    const lightboxHTML = `
      <div id="lightbox" class="lightbox" onclick="closeLightbox()">
        <div class="lightbox-content" onclick="event.stopPropagation()">
          <span class="lightbox-close" onclick="closeLightbox()">&times;</span>
          <img id="lightbox-image" src="" alt="">
          <div class="lightbox-info">
            <div class="lightbox-caption" id="lightbox-caption"></div>
            <div class="lightbox-description" id="lightbox-description"></div>
            <div class="lightbox-metadata" id="lightbox-metadata"></div>
          </div>
          <div class="lightbox-nav">
            <button class="lightbox-prev" onclick="navigateImage(-1)">❮ Previous</button>
            <span class="lightbox-counter" id="lightbox-counter"></span>
            <button class="lightbox-next" onclick="navigateImage(1)">Next ❯</button>
          </div>
        </div>
      </div>
    `;
    $('body').append(lightboxHTML);
  }

  // Update lightbox content
  function updateLightboxContent() {
    const imageObj = galleryImages[currentImageIndex];
    const filename = imageObj.filename;
    const displayName = imageObj.title || imageObj.displayName || filename;
    const description = imageObj.description || '';
    const category = imageObj.category || '';
    const year = imageObj.year || '';
    
    $('#lightbox-image').attr('src', `assets/${filename}`);
    $('#lightbox-caption').text(displayName);
    $('#lightbox-description').text(description);
    
    // Update metadata
    let metadata = [];
    if (category && galleryConfig.categories && galleryConfig.categories[category]) {
      metadata.push(`Category: ${galleryConfig.categories[category]}`);
    }
    if (year) {
      metadata.push(`Year: ${year}`);
    }
    $('#lightbox-metadata').text(metadata.join(' • '));
    
    // Update counter
    $('#lightbox-counter').text(`${currentImageIndex + 1} / ${galleryImages.length}`);
    
    // Show/hide description and metadata based on content
    $('#lightbox-description').toggle(!!description);
    $('#lightbox-metadata').toggle(metadata.length > 0);
  }

  // Global functions for lightbox
  window.openLightbox = function(imageSrc, caption, description = '') {
    const imageName = imageSrc.split('/').pop();
    // Find the index by comparing filenames
    currentImageIndex = galleryImages.findIndex(img => img.filename === imageName);
    
    if (currentImageIndex === -1) {
      currentImageIndex = 0; // Fallback to first image
    }
    
    updateLightboxContent();
    $('#lightbox').fadeIn(300);
  };

  window.closeLightbox = function() {
    $('#lightbox').fadeOut(300);
  };

  window.navigateImage = function(direction) {
    currentImageIndex += direction;
    
    if (currentImageIndex < 0) {
      currentImageIndex = galleryImages.length - 1;
    } else if (currentImageIndex >= galleryImages.length) {
      currentImageIndex = 0;
    }
    
    updateLightboxContent();
  };

  // Keyboard navigation for lightbox
  $(document).keydown(function(e) {
    if ($('#lightbox').is(':visible')) {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        navigateImage(-1);
      } else if (e.key === 'ArrowRight') {
        navigateImage(1);
      }
    }
  });

  // Initialize gallery
  loadGallery();
  createLightbox();
});
