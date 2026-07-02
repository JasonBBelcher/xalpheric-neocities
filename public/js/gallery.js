$(document).ready(function() {
  let galleryImages = [];
  let galleryConfig = {};
  let currentImageIndex = 0;

  // Load gallery configuration
  async function loadGallery() {
    // Categories are emitted into a <script id="gallery-data"> tag by
    // the Eleventy template. This is the source of truth for labels.
    let templateCategories = {};
    const $dataEl = $('#gallery-data');
    if ($dataEl.length > 0) {
      try {
        templateCategories = JSON.parse($dataEl.text());
      } catch (e) {
        templateCategories = {};
      }
    }

    // If the template already rendered gallery items into #gallery-grid,
    // use those as the source of truth and skip the JSON fetch entirely.
    // The JSON is only a fallback for legacy pages that have no template data.
    const preRenderedItems = $('#gallery-grid .gallery-item');
    if (preRenderedItems.length > 0) {
      galleryImages = preRenderedItems.map(function() {
        const $item = $(this);
        const $img = $item.find('img.gallery-image');
        const $title = $item.find('.gallery-item-title');
        const $desc = $item.find('.gallery-item-description');
        // Strip leading "assets/" so filename matches the JSON shape.
        const src = $img.attr('src') || '';
        const filename = src.replace(/^.*assets\//, '');
        return {
          filename,
          title: $title.text(),
          description: $desc.text(),
          category: $item.data('category') || 'general'
        };
      }).get();

      galleryConfig = { categories: templateCategories };
      createCategoryFilters();
      return;
    }
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
    // Strip a leading slash and "assets/" so the filename matches the
    // shape stored in the gallery data (e.g. "/assets/gifs/IMG_3654.gif"
    // → "gifs/IMG_3654.gif", and "assets/studio1.jpg" → "studio1.jpg").
    const imageName = imageSrc.replace(/^\/?assets\//, '');
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

  // Delegated click handler for template-rendered gallery items
  // (the JSON-built items use an inline onclick; this catches both cases).
  $(document).on('click', '#gallery-grid .gallery-image', function(e) {
    e.preventDefault();
    const src = $(this).attr('src') || '';
    const $item = $(this).closest('.gallery-item');
    const title = $item.find('.gallery-item-title').text() || '';
    const description = $item.find('.gallery-item-description').text() || '';
    openLightbox(src, title, description);
  });

  // Initialize gallery
  loadGallery();
  createLightbox();
});
