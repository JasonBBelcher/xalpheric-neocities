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
  
  // Navigation event handlers
  $(".nav.left").click(navigateLeft);
  $(".nav.right").click(navigateRight);
  
  // Keyboard navigation
  $(document).keydown((e) => {
    switch(e.key) {
      case 'ArrowLeft':
        navigateLeft();
        break;
      case 'ArrowRight':
        navigateRight();
        break;
      case ' ': // Spacebar for play/pause
        e.preventDefault();
        const player = $("#player")[0];
        if (player.paused) {
          player.play();
        } else {
          player.pause();
        }
        break;
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
