class XalphericRadioPlayer {
    constructor() {
        // Determine path prefix based on current location
        const isInSubfolder = window.location.pathname.includes('/musings/') || 
                             window.location.pathname.includes('/gallery/') ||
                             window.location.pathname.includes('/links/');
        const pathPrefix = isInSubfolder ? '../' : '';
        
        this.playlist = [
            { title: "Face The Shadow", cover: `${pathPrefix}assets/release1.png`, audio: `${pathPrefix}music/face_the_shadow.mp3` },
            { title: "Contemplate", cover: `${pathPrefix}assets/release2.jpg`, audio: `${pathPrefix}music/contemplate.mp3` },
            { title: "Hitch Crack Pot", cover: `${pathPrefix}assets/release3.png`, audio: `${pathPrefix}music/hitchcrackpot.mp3` },
            { title: "Dogs in the Street", cover: `${pathPrefix}assets/release4.png`, audio: `${pathPrefix}music/dogs_in_the_street.mp3` }
        ];
        
        this.currentTrack = 0;
        this.isPlaying = false;
        this.isCollapsed = true;
        this.audio = null;
        this.container = null;
        this.homePlayer = null;
        this.isHomePage = false;
        this.positionSaveInterval = null;
        
        this.init();
    }
    
    init() {
        // Check if we're on the home page
        this.isHomePage = window.location.pathname === '/' || window.location.pathname.includes('index.html');
        
        // Create the radio player UI
        this.createRadioPlayer();
        
        // Create audio element
        this.createAudioElement();
        
        // If on home page, find and sync with the main player
        if (this.isHomePage) {
            this.setupHomePageSync();
        }
        
        // Set up global state management
        this.setupGlobalState();
        
        // Load saved state and auto-resume if applicable
        this.loadAndResumeState();
        
        // Ensure first track is loaded for metadata
        this.loadCurrentTrackMetadata();
        
        // Update UI after everything is initialized
        this.updateRadioUI();
    }
    
    loadCurrentTrackMetadata() {
        if (this.audio && this.playlist[this.currentTrack]) {
            const track = this.playlist[this.currentTrack];
            if (!this.audio.src || this.audio.src !== track.audio) {
                this.audio.src = track.audio;
                console.log('Loaded track metadata for:', track.title);
            }
        }
    }
    
    createAudioElement() {
        this.audio = document.createElement('audio');
        this.audio.preload = 'metadata';
        this.audio.style.display = 'none';
        document.body.appendChild(this.audio);
        
        // Bind audio events
        this.audio.addEventListener('ended', () => this.nextTrack());
        this.audio.addEventListener('play', () => this.updatePlayState(true));
        this.audio.addEventListener('pause', () => this.updatePlayState(false));
        this.audio.addEventListener('timeupdate', () => this.saveCurrentPosition());
        this.audio.addEventListener('loadedmetadata', () => this.onMetadataLoaded());
    }
    
    createRadioPlayer() {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'xalpheric-radio-player';
        this.container.innerHTML = `
            <div class="radio-controls">
                <div class="radio-main">
                    <button class="radio-toggle-btn" title="Toggle Radio">
                        <img src="${this.playlist[0].cover}" alt="Album Cover - Click to Toggle" class="radio-album-cover">
                    </button>
                    <div class="radio-info">
                        <div class="radio-track-title">Xalpheric Radio</div>
                        <div class="radio-track-artist">Select a track</div>
                        <div class="radio-progress-mini">
                            <div class="progress-mini-bar">
                                <div class="progress-mini-fill"></div>
                            </div>
                        </div>
                    </div>
                    <div class="radio-playback">
                        <button class="radio-prev-btn" title="Previous">⏮</button>
                        <button class="radio-play-pause-btn" title="Play/Pause">
                            <span class="radio-play-icon">▶</span>
                            <span class="radio-pause-icon" style="display: none;">⏸</span>
                        </button>
                        <button class="radio-next-btn" title="Next">⏭</button>
                    </div>
                    <button class="radio-playlist-toggle" title="Toggle Playlist">
                        <span class="playlist-icon">☰</span>
                    </button>
                </div>
                <div class="radio-playlist" style="display: none;">
                    <div class="playlist-header">
                        <h3>Xalpheric Tracks</h3>
                        <button class="playlist-close">✕</button>
                    </div>
                    <div class="playlist-items">
                        ${this.playlist.map((track, index) => `
                            <div class="playlist-item" data-index="${index}">
                                <img src="${track.cover}" alt="${track.title}" class="playlist-cover">
                                <div class="playlist-info">
                                    <div class="playlist-title">${track.title}</div>
                                    <div class="playlist-artist">Xalpheric</div>
                                </div>
                                <button class="playlist-play-btn" data-index="${index}">▶</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
                // Add to header
        const siteHeader = document.querySelector('.site-header');
        if (siteHeader) {
            siteHeader.appendChild(this.container);
        } else {
            console.warn('Radio Player: .site-header not found, trying to append to body');
            // Fallback: create a temporary header-like container
            const fallbackHeader = document.createElement('div');
            fallbackHeader.className = 'site-header';
            fallbackHeader.style.cssText = 'position: relative; width: 100%; z-index: 1000;';
            document.body.insertBefore(fallbackHeader, document.body.firstChild);
            fallbackHeader.appendChild(this.container);
        }
        
        // Bind all events
        this.bindEvents();
    }
    
    setupHomePageSync() {
        // Find the main player audio element
        const mainAudio = document.querySelector('#player');
        if (mainAudio) {
            this.homePlayer = mainAudio;
            
            // Sync with main player events
            this.homePlayer.addEventListener('play', () => this.onHomePlayerPlay());
            this.homePlayer.addEventListener('pause', () => this.onHomePlayerPause());
            this.homePlayer.addEventListener('loadstart', () => this.onHomePlayerTrackChange());
            this.homePlayer.addEventListener('timeupdate', () => this.saveHomePlayerPosition());
            
            // Add ended event listener for continuous playback on home page
            this.homePlayer.addEventListener('ended', () => {
                console.log('Home player ended - advancing to next track');
                this.nextTrack();
            });
            
            // Monitor for track changes from the carousel
            const observer = new MutationObserver(() => {
                this.syncWithHomePlayer();
            });
            
            observer.observe(this.homePlayer, { 
                attributes: true, 
                attributeFilter: ['src'] 
            });
        }
    }
    
    setupGlobalState() {
        // Store reference globally for cross-page state
        window.xalphericRadio = this;
        
        // Save state before page unload
        window.addEventListener('beforeunload', () => {
            this.saveState();
            // On home page, save home player state specifically
            if (this.isHomePage && this.homePlayer) {
                this.saveHomePlayerPosition();
            }
        });
    }
    
    bindEvents() {
        // Radio toggle
        this.container.querySelector('.radio-toggle-btn').addEventListener('click', () => {
            this.isCollapsed = !this.isCollapsed;
            this.updateVisibility();
        });
        
        // Playback controls
        this.container.querySelector('.radio-play-pause-btn').addEventListener('click', () => {
            this.togglePlayPause();
        });
        
        this.container.querySelector('.radio-prev-btn').addEventListener('click', () => {
            this.previousTrack();
        });
        
        this.container.querySelector('.radio-next-btn').addEventListener('click', () => {
            this.nextTrack();
        });
        
        // Playlist toggle
        this.container.querySelector('.radio-playlist-toggle').addEventListener('click', () => {
            this.togglePlaylist();
        });
        
        this.container.querySelector('.playlist-close').addEventListener('click', () => {
            this.togglePlaylist();
        });
        
        // Playlist items
        this.container.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('playlist-play-btn')) {
                    const index = parseInt(item.dataset.index);
                    this.selectTrack(index);
                }
            });
        });
        
        this.container.querySelectorAll('.playlist-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.playTrack(index);
            });
        });
    }
    
    saveCurrentPosition() {
        // Update mini progress bar
        this.updateMiniProgress();
        
        // Determine which audio element to save position from
        let audioElement;
        let isPlaying;
        
        if (this.isHomePage && this.homePlayer && !this.homePlayer.paused && this.homePlayer.currentTime > 0) {
            // Save home player position if it's playing
            audioElement = this.homePlayer;
            isPlaying = !this.homePlayer.paused;
        } else if (this.audio && this.audio.currentTime > 0) {
            // Save radio player position
            audioElement = this.audio;
            isPlaying = !this.audio.paused;
        } else {
            // If nothing is playing, don't save position
            return;
        }
        
        if (audioElement && audioElement.currentTime > 0) {
            const state = {
                currentTrack: this.currentTrack,
                currentTime: audioElement.currentTime,
                duration: audioElement.duration || 0,
                isPlaying: isPlaying,
                trackSrc: audioElement.src,
                timestamp: Date.now(),
                fromHomePage: this.isHomePage && audioElement === this.homePlayer
            };
            sessionStorage.setItem('xalphericRadioPosition', JSON.stringify(state));
        }
    }
    
    saveHomePlayerPosition() {
        // Specifically save home player position when it's active
        if (this.homePlayer && this.homePlayer.duration > 0 && this.homePlayer.currentTime > 0) {
            const positionData = {
                currentTrack: this.currentTrack,
                currentTime: this.homePlayer.currentTime,
                duration: this.homePlayer.duration,
                isPlaying: !this.homePlayer.paused,
                timestamp: Date.now(),
                fromHomePage: true
            };
            sessionStorage.setItem('xalphericRadioPosition', JSON.stringify(positionData));
        }
    }
    
    onMetadataLoaded() {
        // Try to restore position when metadata loads
        this.restorePosition();
    }
    
    updateMiniProgress() {
        const progressFill = this.container?.querySelector('.progress-mini-fill');
        if (progressFill && this.audio.duration > 0) {
            const percentage = (this.audio.currentTime / this.audio.duration) * 100;
            progressFill.style.width = percentage + '%';
        }
    }
    
    togglePlayPause() {
        if (this.isHomePage && this.homePlayer) {
            // If on home page, control the main player
            if (this.homePlayer.paused) {
                this.homePlayer.play();
            } else {
                this.homePlayer.pause();
            }
        } else {
            // Control radio player
            if (this.audio.paused) {
                this.playCurrentTrack();
            } else {
                this.audio.pause();
            }
        }
    }
    
    playTrack(index) {
        this.currentTrack = index;
        
        if (this.isHomePage && this.homePlayer) {
            // Update main player
            this.homePlayer.src = this.playlist[index].audio;
            this.homePlayer.play();
            
            // Update home page UI if it exists
            this.updateHomePageUI(index);
        } else {
            // Play on radio
            this.playCurrentTrack();
        }
        
        this.updateRadioUI();
        this.updatePlaylistSelection();
    }
    
    playCurrentTrack() {
        const track = this.playlist[this.currentTrack];
        console.log('Playing track:', track.title, 'Audio path:', track.audio);
        
        // Ensure audio element exists
        if (!this.audio) {
            console.error('Audio element not initialized');
            return;
        }
        
        this.audio.src = track.audio;
        this.audio.play().catch(error => {
            console.log('Audio play failed:', error);
        });
    }
    
    selectTrack(index) {
        this.currentTrack = index;
        this.updateRadioUI();
        this.updatePlaylistSelection();
    }
    
    previousTrack() {
        this.currentTrack = (this.currentTrack - 1 + this.playlist.length) % this.playlist.length;
        this.playTrack(this.currentTrack);
    }
    
    nextTrack() {
        console.log('Next track called - current:', this.currentTrack);
        this.currentTrack = (this.currentTrack + 1) % this.playlist.length;
        console.log('Moving to track:', this.currentTrack, this.playlist[this.currentTrack].title);
        this.playTrack(this.currentTrack);
    }
    
    onHomePlayerPlay() {
        this.isPlaying = true;
        this.audio.pause(); // Pause radio if playing
        this.updatePlayState(true);
    }
    
    onHomePlayerPause() {
        this.isPlaying = false;
        this.updatePlayState(false);
    }
    
    onHomePlayerTrackChange() {
        this.syncWithHomePlayer();
    }
    
    syncWithHomePlayer() {
        if (!this.homePlayer) return;
        
        // Find which track is currently playing
        const currentSrc = this.homePlayer.src;
        const trackIndex = this.playlist.findIndex(track => 
            currentSrc.includes(track.audio)
        );
        
        if (trackIndex !== -1) {
            this.currentTrack = trackIndex;
            this.updateRadioUI();
            this.updatePlaylistSelection();
        }
    }
    
    updateHomePageUI(index) {
        // Update the home page carousel if elements exist
        const coverImg = document.querySelector('#cover');
        const titleElement = document.querySelector('#title');
        const downloadLink = document.querySelector('#download');
        
        if (coverImg) coverImg.src = this.playlist[index].cover;
        if (titleElement) titleElement.textContent = this.playlist[index].title;
        if (downloadLink) downloadLink.href = this.playlist[index].audio;
    }
    
    updateRadioUI() {
        const track = this.playlist[this.currentTrack];
        const titleElement = this.container.querySelector('.radio-track-title');
        const artistElement = this.container.querySelector('.radio-track-artist');
        const coverElement = this.container.querySelector('.radio-album-cover');
        
        if (titleElement) titleElement.textContent = track.title;
        if (artistElement) artistElement.textContent = 'Xalpheric';
        if (coverElement) {
            coverElement.src = track.cover;
            coverElement.alt = track.title;
        }
    }
    
    updatePlayState(playing) {
        this.isPlaying = playing;
        const playIcon = this.container.querySelector('.radio-play-icon');
        const pauseIcon = this.container.querySelector('.radio-pause-icon');
        
        if (playing) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'inline';
        } else {
            playIcon.style.display = 'inline';
            pauseIcon.style.display = 'none';
        }
        
        // Save current position whenever play state changes
        this.saveCurrentPosition();
    }
    
    updatePlaylistSelection() {
        this.container.querySelectorAll('.playlist-item').forEach((item, index) => {
            if (index === this.currentTrack) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    togglePlaylist() {
        const playlist = this.container.querySelector('.radio-playlist');
        const isVisible = playlist.style.display !== 'none';
        playlist.style.display = isVisible ? 'none' : 'block';
    }
    
    updateVisibility() {
        if (this.isCollapsed) {
            this.container.classList.add('collapsed');
        } else {
            this.container.classList.remove('collapsed');
        }
    }
    
    saveState() {
        if (!this.audio) return;
        
        const state = {
            currentTrack: this.currentTrack,
            isCollapsed: this.isCollapsed,
            volume: this.audio.volume || 1,
            timestamp: Date.now()
        };
        localStorage.setItem('xalphericRadioState', JSON.stringify(state));
    }
    
    loadAndResumeState() {
        // Load basic state
        const saved = localStorage.getItem('xalphericRadioState');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.currentTrack = state.currentTrack || 0;
                this.isCollapsed = state.isCollapsed !== false; // Default to collapsed
                this.audio.volume = state.volume || 1;
                
                this.updateRadioUI();
                this.updateVisibility();
                this.updatePlaylistSelection();
            } catch (error) {
                console.log('Error loading radio state:', error);
                localStorage.removeItem('xalphericRadioState');
            }
        }
        
        // Check for position restoration
        this.checkForResume();
    }
    
    checkForResume() {
        const positionData = sessionStorage.getItem('xalphericRadioPosition');
        if (!positionData) return;
        
        try {
            const position = JSON.parse(positionData);
            
            // Only resume if position is recent (within last 30 minutes)
            if (Date.now() - position.timestamp > 1800000) {
                sessionStorage.removeItem('xalphericRadioPosition');
                return;
            }
            
            // Auto-resume if there's any meaningful progress (more than 1 second)
            // OR if this came from home page and was playing (even with minimal progress)
            const shouldResume = (position.currentTime > 1 && position.currentTrack < this.playlist.length) ||
                                (position.fromHomePage && position.isPlaying && position.currentTime > 0);
            
            if (shouldResume) {
                const resumeMessage = position.fromHomePage ? 
                    `Continuing playback from home page: track ${position.currentTrack} at ${position.currentTime}s` :
                    `Auto-resuming track ${position.currentTrack} at ${position.currentTime}s`;
                console.log(resumeMessage);
                
                this.currentTrack = position.currentTrack;
                this.audio.src = this.playlist[this.currentTrack].audio;
                this.updateRadioUI();
                this.updatePlaylistSelection();
                
                // Restore position and auto-resume playback
                const restorePos = () => {
                    if (this.audio.duration && position.currentTime < this.audio.duration - 1) {
                        this.audio.currentTime = position.currentTime;
                        // Auto-resume playback if it was playing when page changed
                        if (position.isPlaying) {
                            console.log('Resuming playback from', position.fromHomePage ? 'home page' : 'radio player');
                            this.audio.play().catch(e => console.log('Auto-resume play failed:', e));
                        }
                    }
                    this.audio.removeEventListener('loadedmetadata', restorePos);
                };
                
                if (this.audio.readyState >= 1) {
                    restorePos();
                } else {
                    this.audio.addEventListener('loadedmetadata', restorePos);
                }
            }
        } catch (error) {
            console.log('Error checking resume state:', error);
            sessionStorage.removeItem('xalphericRadioPosition');
        }
    }
    
    restorePosition() {
        const positionData = sessionStorage.getItem('xalphericRadioPosition');
        if (!positionData) return;
        
        try {
            const position = JSON.parse(positionData);
            
            // Check if this is the same track and position is valid
            if (position.currentTrack === this.currentTrack && 
                this.audio.src.includes(this.playlist[this.currentTrack].audio) &&
                position.currentTime > 0 && 
                position.currentTime < this.audio.duration - 1) {
                
                this.audio.currentTime = position.currentTime;
            }
        } catch (error) {
            console.log('Error restoring position:', error);
        }
    }
}

// Initialize radio player when DOM is ready
function initializeRadioPlayer() {
    if (!window.xalphericRadioInstance) {
        window.xalphericRadioInstance = new XalphericRadioPlayer();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRadioPlayer);
} else {
    // DOM is already loaded
    initializeRadioPlayer();
}

// Save state and position before page unload
window.addEventListener('beforeunload', function() {
    if (window.xalphericRadioInstance) {
        window.xalphericRadioInstance.saveState();
        window.xalphericRadioInstance.saveCurrentPosition();
    }
});

// Handle visibility changes (tab switching, minimizing)
document.addEventListener('visibilitychange', function() {
    if (window.xalphericRadioInstance && document.hidden) {
        window.xalphericRadioInstance.saveState();
        window.xalphericRadioInstance.saveCurrentPosition();
    }
});
