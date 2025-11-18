// Generic Lightbox utility for image galleries
// Supports navigation, keyboard controls, and responsive design

class ImageLightbox {
  constructor() {
    this.currentIndex = 0;
    this.images = [];
    this.isOpen = false;
    this.createLightbox();
    this.bindEvents();
  }

  createLightbox() {
    const lightboxHTML = `
      <div id="image-lightbox" class="lightbox">
        <span class="lightbox-close">&times;</span>
        <span class="lightbox-prev">&#10094;</span>
        <span class="lightbox-next">&#10095;</span>
        <img class="lightbox-content" id="lightbox-img">
        <div class="lightbox-caption"></div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', lightboxHTML);
    
    this.lightbox = document.getElementById('image-lightbox');
    this.lightboxImg = document.getElementById('lightbox-img');
    this.caption = this.lightbox.querySelector('.lightbox-caption');
    this.closeBtn = this.lightbox.querySelector('.lightbox-close');
    this.prevBtn = this.lightbox.querySelector('.lightbox-prev');
    this.nextBtn = this.lightbox.querySelector('.lightbox-next');
  }

  bindEvents() {
    // Close button
    this.closeBtn.addEventListener('click', () => this.close());
    
    // Navigation buttons
    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());
    
    // Close on background click
    this.lightbox.addEventListener('click', (e) => {
      if (e.target === this.lightbox) {
        this.close();
      }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowRight') this.next();
      if (e.key === 'ArrowLeft') this.prev();
    });
  }

  initGallery(selector) {
    const galleries = document.querySelectorAll(selector);
    
    galleries.forEach(gallery => {
      const galleryImages = Array.from(gallery.querySelectorAll('img'));
      
      galleryImages.forEach((img, index) => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
          this.images = galleryImages;
          this.currentIndex = index;
          this.open();
        });
      });
    });
  }

  open() {
    this.isOpen = true;
    this.lightbox.style.display = 'flex';
    this.updateImage();
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen = false;
    this.lightbox.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  updateImage() {
    const img = this.images[this.currentIndex];
    
    // Support both DOM images and custom data objects
    if (img instanceof HTMLImageElement) {
      this.lightboxImg.src = img.src;
      this.caption.textContent = img.alt || '';
    } else if (typeof img === 'object') {
      this.lightboxImg.src = img.src || '';
      this.caption.textContent = img.caption || img.alt || '';
    }
    
    // Show/hide navigation based on gallery size
    if (this.images.length <= 1) {
      this.prevBtn.style.display = 'none';
      this.nextBtn.style.display = 'none';
    } else {
      this.prevBtn.style.display = 'flex';
      this.nextBtn.style.display = 'flex';
    }
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.updateImage();
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updateImage();
  }
}

// Initialize lightbox when DOM is ready
let imageLightbox;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    imageLightbox = new ImageLightbox();
  });
} else {
  imageLightbox = new ImageLightbox();
}
