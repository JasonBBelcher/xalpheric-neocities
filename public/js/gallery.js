$(document).ready(function() {
  // Define gallery images - this will be the source of truth for which images to show
  // Each image can have: filename (required), displayName (optional), description (optional)
  const galleryImages = [
    { 
      filename: 'studio1.jpg', 
      displayName: 'Studio Setup', 
      description: 'Studio Angle 1' 
    },
    { 
      filename: 'studio4.png', 
      displayName: 'Studio Angle 2' 
    },
    { 
      filename: 'studio6.png', 
      displayName: 'My battle station and cup a joe' 
    },
    { 
      filename: 'studio9.jpg', 
      displayName: 'Studio Overview', 
      description: 'Prophet Rev 2 Synthesizer' 
    },
  ];

  // Function to create gallery item
  function createGalleryItem(imageObj) {
    // Support both string (backward compatibility) and object formats
    let filename, displayName, description;
    
    if (typeof imageObj === 'string') {
      filename = imageObj;
      // Extract number from filename for fallback display name
      const numberMatch = filename.match(/\d+/);
      const imageNumber = numberMatch ? numberMatch[0] : '';
      const baseName = filename.replace(/\.[^/.]+$/, ""); // Remove extension
      displayName = baseName.includes('studio') ? 
        `Studio ${imageNumber}` : 
        `Image ${imageNumber}`;
      description = '';
    } else {
      filename = imageObj.filename;
      displayName = imageObj.displayName || filename;
      description = imageObj.description || '';
    }
    
    return `
      <div class="gallery-item">
        <img src="assets/${filename}" 
             alt="${displayName}" 
             class="gallery-image"
             loading="lazy"
             onclick="openLightbox('assets/${filename}', '${displayName}', '${description}')">
      </div>
    `;
  }

  // Populate gallery
  function populateGallery() {
    const galleryGrid = $('#gallery-grid');
    
    if (galleryImages.length === 0) {
      galleryGrid.html('<p class="no-images">No images available in the gallery yet.</p>');
      return;
    }
    
    galleryImages.forEach(image => {
      galleryGrid.append(createGalleryItem(image));
    });
  }

  // Lightbox functionality
  function createLightbox() {
    const lightboxHTML = `
      <div id="lightbox" class="lightbox" onclick="closeLightbox()">
        <div class="lightbox-content" onclick="event.stopPropagation()">
          <span class="lightbox-close" onclick="closeLightbox()">&times;</span>
          <img id="lightbox-image" src="" alt="">
          <div class="lightbox-caption" id="lightbox-caption"></div>
          <div class="lightbox-description" id="lightbox-description"></div>
          <div class="lightbox-nav">
            <button class="lightbox-prev" onclick="navigateImage(-1)">❮ Previous</button>
            <button class="lightbox-next" onclick="navigateImage(1)">Next ❯</button>
          </div>
        </div>
      </div>
    `;
    $('body').append(lightboxHTML);
  }

  // Global variables for lightbox navigation
  let currentImageIndex = 0;

  // Global functions for lightbox
  window.openLightbox = function(imageSrc, caption, description = '') {
    const imageName = imageSrc.split('/').pop();
    // Find the index by comparing filenames
    currentImageIndex = galleryImages.findIndex(img => {
      const filename = typeof img === 'string' ? img : img.filename;
      return filename === imageName;
    });
    
    $('#lightbox-image').attr('src', imageSrc);
    $('#lightbox-caption').text(caption);
    $('#lightbox-description').text(description);
    
    // Show/hide description based on whether it exists
    if (description) {
      $('#lightbox-description').show();
    } else {
      $('#lightbox-description').hide();
    }
    
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
    
    const imageObj = galleryImages[currentImageIndex];
    let filename, displayName, description;
    
    if (typeof imageObj === 'string') {
      filename = imageObj;
      // Extract number from filename for fallback display name
      const numberMatch = filename.match(/\d+/);
      const imageNumber = numberMatch ? numberMatch[0] : '';
      displayName = filename.includes('studio') ? 
        `Studio ${imageNumber}` : 
        `Image ${imageNumber}`;
      description = '';
    } else {
      filename = imageObj.filename;
      displayName = imageObj.displayName || filename;
      description = imageObj.description || '';
    }
    
    $('#lightbox-image').attr('src', `assets/${filename}`);
    $('#lightbox-caption').text(displayName);
    $('#lightbox-description').text(description);
    
    // Show/hide description based on whether it exists
    if (description) {
      $('#lightbox-description').show();
    } else {
      $('#lightbox-description').hide();
    }
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
  populateGallery();
  createLightbox();
});
