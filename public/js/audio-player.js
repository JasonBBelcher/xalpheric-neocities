class XalphericAudioPlayer {
    constructor(audioElement) {
        this.audio = audioElement;
        this.container = null;
        this.isPlaying = false;
        this.isDragging = false;
        
        this.init();
    }
    
    init() {
        // Hide the default controls and mark as custom
        this.audio.controls = false;
        this.audio.setAttribute('data-custom-player', 'true');
        
        // Create custom player container
        this.container = document.createElement('div');
        this.container.className = 'xalpheric-audio-player';
        
        // Insert the custom player after the audio element
        this.audio.parentNode.insertBefore(this.container, this.audio.nextSibling);
        
        // Build the player UI
        this.buildPlayerUI();
        
        // Bind events
        this.bindEvents();
        
        // Initialize volume display
        this.updateVolumeDisplay();
    }
    
    buildPlayerUI() {
        this.container.innerHTML = `
            <div class="player-controls">
                <button class="play-pause-btn" title="Play/Pause">
                    <span class="play-icon">▶</span>
                    <span class="pause-icon" style="display: none;">⏸</span>
                </button>
                
                <div class="time-display">
                    <span class="current-time">0:00</span>
                    <span class="time-separator">/</span>
                    <span class="total-time">0:00</span>
                </div>
                
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                        <div class="progress-handle"></div>
                    </div>
                </div>
                
                <div class="volume-container">
                    <button class="volume-btn" title="Mute/Unmute">
                        <span class="volume-icon">🔊</span>
                        <span class="mute-icon" style="display: none;">🔇</span>
                    </button>
                    <div class="volume-slider-container">
                        <div class="volume-slider">
                            <div class="volume-fill"></div>
                            <div class="volume-handle"></div>
                        </div>
                    </div>
                </div>
                
                <button class="menu-btn" title="Menu">
                    <span class="menu-icon">⋮</span>
                </button>
            </div>
        `;
        
        // Get references to UI elements
        this.playPauseBtn = this.container.querySelector('.play-pause-btn');
        this.playIcon = this.container.querySelector('.play-icon');
        this.pauseIcon = this.container.querySelector('.pause-icon');
        this.currentTimeDisplay = this.container.querySelector('.current-time');
        this.totalTimeDisplay = this.container.querySelector('.total-time');
        this.progressBar = this.container.querySelector('.progress-bar');
        this.progressFill = this.container.querySelector('.progress-fill');
        this.progressHandle = this.container.querySelector('.progress-handle');
        this.volumeBtn = this.container.querySelector('.volume-btn');
        this.volumeIcon = this.container.querySelector('.volume-icon');
        this.muteIcon = this.container.querySelector('.mute-icon');
        this.volumeSlider = this.container.querySelector('.volume-slider');
        this.volumeFill = this.container.querySelector('.volume-fill');
        this.volumeHandle = this.container.querySelector('.volume-handle');
        this.menuBtn = this.container.querySelector('.menu-btn');
    }
    
    bindEvents() {
        // Play/Pause button
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        
        // Audio events
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.onEnded());
        
        // Progress bar events
        this.progressBar.addEventListener('click', (e) => this.seekTo(e));
        this.progressHandle.addEventListener('mousedown', (e) => this.startDragging(e, 'progress'));
        
        // Volume events
        this.volumeBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('click', (e) => this.setVolume(e));
        this.volumeHandle.addEventListener('mousedown', (e) => this.startDragging(e, 'volume'));
        
        // Menu button (for future features)
        this.menuBtn.addEventListener('click', () => this.showMenu());
        
        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', () => this.stopDragging());
    }
    
    togglePlayPause() {
        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
            this.playIcon.style.display = 'inline';
            this.pauseIcon.style.display = 'none';
        } else {
            this.audio.play();
            this.isPlaying = true;
            this.playIcon.style.display = 'none';
            this.pauseIcon.style.display = 'inline';
        }
    }
    
    updateDuration() {
        const duration = this.audio.duration;
        this.totalTimeDisplay.textContent = this.formatTime(duration);
    }
    
    updateProgress() {
        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration;
        
        if (duration > 0) {
            const percentage = (currentTime / duration) * 100;
            this.progressFill.style.width = percentage + '%';
            this.progressHandle.style.left = percentage + '%';
        }
        
        this.currentTimeDisplay.textContent = this.formatTime(currentTime);
    }
    
    seekTo(e) {
        const rect = this.progressBar.getBoundingClientRect();
        const percentage = (e.clientX - rect.left) / rect.width;
        const newTime = percentage * this.audio.duration;
        this.audio.currentTime = newTime;
    }
    
    toggleMute() {
        if (this.audio.muted) {
            this.audio.muted = false;
            this.volumeIcon.style.display = 'inline';
            this.muteIcon.style.display = 'none';
        } else {
            this.audio.muted = true;
            this.volumeIcon.style.display = 'none';
            this.muteIcon.style.display = 'inline';
        }
    }
    
    setVolume(e) {
        const rect = this.volumeSlider.getBoundingClientRect();
        const percentage = (e.clientX - rect.left) / rect.width;
        this.audio.volume = Math.max(0, Math.min(1, percentage));
        this.updateVolumeDisplay();
    }
    
    updateVolumeDisplay() {
        const percentage = this.audio.volume * 100;
        this.volumeFill.style.width = percentage + '%';
        this.volumeHandle.style.left = percentage + '%';
    }
    
    startDragging(e, type) {
        this.isDragging = true;
        this.dragType = type;
        e.preventDefault();
    }
    
    onMouseMove(e) {
        if (!this.isDragging) return;
        
        if (this.dragType === 'progress') {
            this.seekTo(e);
        } else if (this.dragType === 'volume') {
            this.setVolume(e);
        }
    }
    
    stopDragging() {
        this.isDragging = false;
        this.dragType = null;
    }
    
    onEnded() {
        this.isPlaying = false;
        this.playIcon.style.display = 'inline';
        this.pauseIcon.style.display = 'none';
    }
    
    showMenu() {
        // Placeholder for future menu functionality
        console.log('Menu clicked - future feature');
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// Initialize all audio players when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        new XalphericAudioPlayer(audio);
    });
});
