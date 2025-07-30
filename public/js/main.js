let releases = [];
let current = 0;

// Load releases configuration from JSON
async function loadReleases() {
  try {
    const response = await fetch('config/releases.json');
    const data = await response.json();
    releases = data.releases;
    
    if (releases.length > 0) {
      showRelease(current);
      updateNavigationState();
    } else {
      console.warn('No releases found in configuration');
    }
  } catch (error) {
    console.error('Error loading releases configuration:', error);
    // Fallback to hardcoded releases if JSON fails
    releases = [
      { title: "Face The Shadow", cover: "assets/release1.png", audio: "music/face_the_shadow.mp3" },
      { title: "Contemplate", cover: "assets/release2.jpg", audio: "music/contemplate.mp3" },
      { title: "Hitch Crack Pot", cover: "assets/release3.png", audio: "music/hitchcrackpot.mp3" },
      { title: "Dogs in the Street", cover: "assets/release4.png", audio: "music/dogs_in_the_street.mp3" },
    ];
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
});