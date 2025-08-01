let releases = [];
let current = 0;

// Load releases configuration from JSON
// Use shared releases loading utility
async function loadReleases() {
  try {
    const releasesData = await loadReleasesConfig();
    releases = formatReleasesForMain(releasesData);
    showRelease(current);
    updateNavigationState();
  } catch (error) {
    console.error('Failed to load releases:', error);
    // Fallback is already handled in utility
    showRelease(current);
    updateNavigationState();
  }
}

function showRelease(index) {
  if (!releases || releases.length === 0) return;
  
  const r = releases[index];
  $("#cover").attr("src", r.cover);
  $("#title").text(r.title);
  $("#player").attr("src", r.audio);
  $("#download").attr("href", r.audio);
  
  // Update additional metadata if available
  if (r.description) {
    $("#description").text(r.description);
  }
  if (r.year) {
    $("#year").text(r.year);
  }
  if (r.duration) {
    $("#duration").text(r.duration);
  }
  
  // Update track counter
  $("#track-counter").text(`${index + 1} / ${releases.length}`);
}

// Release Lightbox functionality
function createReleaseLightbox() {
  const lightboxHTML = `
    <div id="release-lightbox" class="release-lightbox" onclick="closeReleaseLightbox()">
      <div class="release-lightbox-content" onclick="event.stopPropagation()">
        <span class="release-lightbox-close" onclick="closeReleaseLightbox()">&times;</span>
        <img id="release-lightbox-image" src="" alt="" class="release-lightbox-album">
        <div class="release-lightbox-info">
          <h3 id="release-lightbox-title"></h3>
          <div class="release-lightbox-meta">
            <span id="release-lightbox-year"></span>
            <span id="release-lightbox-duration"></span>
          </div>
          <p id="release-lightbox-description"></p>
        </div>
      </div>
    </div>
  `;
  
  $('body').append(lightboxHTML);
}

function openReleaseLightbox(releaseIndex) {
  if (!releases || releases.length === 0) return;
  
  const release = releases[releaseIndex];
  
  // Update lightbox content
  $('#release-lightbox-image').attr('src', release.cover);
  $('#release-lightbox-title').text(release.title);
  $('#release-lightbox-year').text(release.year || '');
  $('#release-lightbox-duration').text(release.duration || '');
  $('#release-lightbox-description').text(release.description || '');
  
  // Show/hide description based on content
  if (release.description) {
    $('#release-lightbox-description').show();
  } else {
    $('#release-lightbox-description').hide();
  }
  
  // Fade in lightbox
  $('#release-lightbox').fadeIn(300);
}

function closeReleaseLightbox() {
  $('#release-lightbox').fadeOut(300);
}

function updateNavigationState() {
  // Disable/enable navigation buttons based on current position
  $(".nav.left").toggleClass('disabled', current === 0);
  $(".nav.right").toggleClass('disabled', current === releases.length - 1);
}

function navigateLeft() {
  if (current > 0) {
    current = (current - 1 + releases.length) % releases.length;
    showRelease(current);
    updateNavigationState();
  }
}

function navigateRight() {
  if (current < releases.length - 1) {
    current = (current + 1) % releases.length;
    showRelease(current);
    updateNavigationState();
  }
}

$(document).ready(() => {
  // Load releases configuration
  loadReleases();
  
  // Create release lightbox
  createReleaseLightbox();
  
  // Navigation event handlers
  $(".nav.left").click(navigateLeft);
  $(".nav.right").click(navigateRight);
  
  // Album cover click handler for lightbox
  $(document).on('click', '#cover', function() {
    openReleaseLightbox(current);
  });
  
  // Keyboard navigation
  $(document).keydown((e) => {
    // Close lightbox with ESC key
    if ($('#release-lightbox').is(':visible') && e.key === 'Escape') {
      closeReleaseLightbox();
      return;
    }
    
    // Regular navigation (only when lightbox is closed)
    if (!$('#release-lightbox').is(':visible')) {
      switch(e.key) {
        case 'ArrowLeft':
          navigateLeft();
          break;
        case 'ArrowRight':
          navigateRight();
          break;
        case ' ': // Spacebar for play/pause
          // Don't intercept spacebar if user is typing in form fields
          if ($(e.target).is('input, textarea, [contenteditable]')) {
            return; // Allow normal spacebar behavior in form fields
          }
          e.preventDefault();
          const player = $("#player")[0];
          if (player.paused) {
            player.play();
          } else {
            player.pause();
          }
          break;
      }
    }
  });
  
  // Audio player event handlers
  $("#player").on('loadstart', () => {
    $("#loading").show();
  });
  
  $("#player").on('canplay', () => {
    $("#loading").hide();
  });
  
  $("#player").on('error', (e) => {
    console.error('Audio playback error:', e);
    $("#error-message").text('Error loading audio file').show();
  });

  // Hamburger Menu Functionality
  const hamburger = $('.hamburger-menu');
  const nav = $('.top-nav');
  const header = $('.site-header');
  const body = $('body');
  
  // Toggle hamburger menu
  hamburger.on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    hamburger.toggleClass('active');
    nav.toggleClass('active');
    header.toggleClass('menu-open'); // Add header expansion
    
    // Prevent body scroll when menu is open
    if (hamburger.hasClass('active')) {
      body.css('overflow', 'hidden');
    } else {
      body.css('overflow', 'auto');
    }
  });
  
  // Close menu when clicking nav links
  $('.nav-link').on('click', function() {
    hamburger.removeClass('active');
    nav.removeClass('active');
    header.removeClass('menu-open'); // Remove header expansion
    body.css('overflow', 'auto');
  });
  
  // Close menu when clicking outside
  $(document).on('click', function(e) {
    if (!hamburger.is(e.target) && 
        !hamburger.has(e.target).length && 
        !nav.is(e.target) && 
        !nav.has(e.target).length) {
      hamburger.removeClass('active');
      nav.removeClass('active');
      header.removeClass('menu-open'); // Remove header expansion
      body.css('overflow', 'auto');
    }
  });
  
  // Close menu on escape key
  $(document).on('keydown', function(e) {
    if (e.key === 'Escape') {
      hamburger.removeClass('active');
      nav.removeClass('active');
      header.removeClass('menu-open'); // Remove header expansion
      body.css('overflow', 'auto');
    }
  });
  
  // Handle window resize - close menu and reset overflow on desktop
  $(window).on('resize', function() {
    if ($(window).width() > 768) {
      hamburger.removeClass('active');
      nav.removeClass('active');
      body.css('overflow', 'auto');
    }
  });

  // Auto-hiding header functionality
  let lastScrollTop = 0;
  let headerTimeout = null;
  let isHeaderVisible = true;
  let scrollThreshold = 30; // Reduced threshold - more sensitive to small scrolls
  
  // Add header peek indicator to the DOM
  if (!$('.header-peek-indicator').length) {
    $('body').prepend('<div class="header-peek-indicator" title="Click to show header for 30 seconds"></div>');
  }
  
  const peekIndicator = $('.header-peek-indicator');
  
  // Show header temporarily (30 seconds)
  function showHeaderTemporarily() {
    header.removeClass('header-hidden').addClass('header-peek');
    peekIndicator.addClass('active');
    isHeaderVisible = true;
    
    // Clear any existing timeout
    if (headerTimeout) {
      clearTimeout(headerTimeout);
    }
    
    // Hide header after 30 seconds
    headerTimeout = setTimeout(() => {
      if (!hamburger.hasClass('active')) { // Don't hide if mobile menu is open
        header.addClass('header-hidden').removeClass('header-peek');
        peekIndicator.removeClass('active');
        isHeaderVisible = false;
      }
    }, 30000); // 30 seconds
  }
  
  // Click handler for peek indicator
  peekIndicator.on('click', function() {
    showHeaderTemporarily();
  });
  
  // Scroll handler for auto-hiding header with aggressive throttling
  let scrollTimeout = null;
  let isProcessingScroll = false;
  
  $(window).on('scroll', function() {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    
    // Skip if already processing a scroll event
    if (isProcessingScroll) {
      return;
    }
    
    scrollTimeout = setTimeout(() => {
      isProcessingScroll = true;
      const scrollTop = $(window).scrollTop();
      
      // Don't hide header if mobile menu is open
      if (hamburger.hasClass('active')) {
        isProcessingScroll = false;
        return;
      }
    
    // Show header when at top of page
    if (scrollTop <= scrollThreshold) {
      header.removeClass('header-hidden').addClass('header-peek');
      peekIndicator.removeClass('active');
      isHeaderVisible = true;
      
      // Clear timeout when back at top
      if (headerTimeout) {
        clearTimeout(headerTimeout);
        headerTimeout = null;
      }
    } 
    // Hide header when scrolling down past threshold
    else if (scrollTop > lastScrollTop && scrollTop > scrollThreshold && isHeaderVisible) {
      header.addClass('header-hidden').removeClass('header-peek');
      peekIndicator.removeClass('active');
      isHeaderVisible = false;
      
      // Clear timeout
      if (headerTimeout) {
        clearTimeout(headerTimeout);
        headerTimeout = null;
      }
    }
    // Show header when scrolling up
    else if (scrollTop < lastScrollTop && !isHeaderVisible) {
      showHeaderTemporarily();
    }
    
    lastScrollTop = scrollTop;
    isProcessingScroll = false; // Reset processing flag
    }, 50); // Increased throttle delay for stability
  });
  
  // Show header initially for 5 seconds to let user see it
  setTimeout(() => {
    if ($(window).scrollTop() > scrollThreshold) {
      showHeaderTemporarily();
    }
  }, 1000);
});