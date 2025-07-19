$(document).ready(function() {
  // Define gallery images - this will be the source of truth for which images to show
  // For local development: IMG_* files, for live site: studio* files
  const galleryImages = [
    'IMG_1876.jpg',
    'IMG_1877.jpg', 
    'IMG_1879.jpg',
    'IMG_1882.jpg',
    'IMG_1884.jpg'
    // When deployed to live site with studio files, update this to:
    // 'studio1.png', 'studio2.jpg', 'studio3.png', 'studio4.jpg', 'studio5.png'
  ];

  // Function to create gallery item
  function createGalleryItem(imagePath) {
    // Extract number from filename for alt text and caption
    const numberMatch = imagePath.match(/\d+/);
    const imageNumber = numberMatch ? numberMatch[0] : '';
    const baseName = imagePath.replace(/\.[^/.]+$/, ""); // Remove extension
    
    // Create display name for caption
    const displayName = baseName.includes('studio') ? 
      `Studio ${imageNumber}` : 
      `Image ${imageNumber}`;
    
    return `
      <div class="gallery-item">
        <img src="assets/${imagePath}" 
             alt="${displayName}" 
             class="gallery-image"
             loading="lazy"
             onclick="openLightbox('assets/${imagePath}', '${displayName}')">
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
  window.openLightbox = function(imageSrc, caption) {
    const imageName = imageSrc.split('/').pop();
    currentImageIndex = galleryImages.indexOf(imageName);
    
    $('#lightbox-image').attr('src', imageSrc);
    $('#lightbox-caption').text(caption);
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
    
    const newImage = galleryImages[currentImageIndex];
    const numberMatch = newImage.match(/\d+/);
    const imageNumber = numberMatch ? numberMatch[0] : '';
    const displayName = newImage.includes('studio') ? 
      `Studio ${imageNumber}` : 
      `Image ${imageNumber}`;
    
    $('#lightbox-image').attr('src', `assets/${newImage}`);
    $('#lightbox-caption').text(displayName);
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
