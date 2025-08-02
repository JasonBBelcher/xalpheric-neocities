class XalphericRadioPlayer {
    constructor() {
        // Use shared path prefix utility - with fallback if not loaded yet
        try {
            this.pathPrefix = typeof getPathPrefix === 'function' ? getPathPrefix() : '';
        } catch (error) {
            console.warn('getPathPrefix not available, using empty prefix:', error);
            this.pathPrefix = '';
        }
        
        // Initialize with empty playlist - will be loaded from JSON
        this.playlist = [];
        this.releasesConfig = null;
        
        this.currentTrack = 0;
        this.isPlaying = false;
        this.isCollapsed = true;
        this.audio = null;
        this.container = null;
        this.homePlayer = null;
        this.isHomePage = false;
        this.positionSaveInterval = null;
        this.resizeTimeout = null;
        
        // Dragging functionality
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.savedPosition = { x: 20, y: 20 }; // Default top-right position
        
        this.init();
    }
    
    async init() {
        // Check if we're on the home page
        this.isHomePage = window.location.pathname === '/' || window.location.pathname.includes('index.html');
        
        // Create the radio player UI first (with loading state)
        this.createRadioPlayer();
        
        // Load releases configuration and update UI
        await this.loadReleasesConfig();
        this.refreshPlaylistUI();
        
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
        
        // Ensure optimal positioning for photo visibility
        this.ensureOptimalPosition();
        
        // Add resize listener to reposition on screen changes and re-evaluate drag capability
        window.addEventListener('resize', () => {
            // Debounce resize events
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                // If switching between desktop/mobile, clear any conflicting positioning
                const isDesktop = window.innerWidth >= 1025;
                if (!isDesktop) {
                    // Switching to mobile - clear any saved desktop position
                    localStorage.removeItem('xalpheric-radio-position');
                    if (this.container) {
                        this.container.style.left = '';
                        this.container.style.top = '';
                        this.container.style.right = '';
                        this.container.style.bottom = '';
                        this.container.style.transform = '';
                    }
                }
                this.ensureOptimalPosition();
            }, 250);
        });
    }
    
    async loadReleasesConfig() {
        try {
            const releasesData = await loadReleasesConfig(this.pathPrefix);
            
            // Store the raw config for reference
            this.releasesConfig = { releases: releasesData };
            
            // Convert releases to playlist format
            this.playlist = formatReleasesForRadio(releasesData, this.pathPrefix);
            
            console.log(`Radio Player: Loaded ${this.playlist.length} tracks from config`);
            
        } catch (error) {
            console.error('Error loading releases configuration:', error);
            // Fallback is already handled in utility
            console.log('Radio Player: Using fallback playlist');
            const fallbackReleases = getFallbackReleases(this.pathPrefix);
            this.playlist = formatReleasesForRadio(fallbackReleases, this.pathPrefix);
        }
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
        // Provide default cover if playlist is empty
        const defaultCover = this.playlist.length > 0 ? this.playlist[0].cover : `${this.pathPrefix}assets/xalpheric_logo.jpeg`;
        
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'xalpheric-radio-player';
        this.container.innerHTML = `
            <div class="radio-controls">
                <div class="radio-main">
                    <button class="radio-toggle-btn" title="Toggle Radio">
                        <img src="${defaultCover}" alt="Album Cover - Click to Toggle" class="radio-album-cover" 
                             onerror="this.src='${this.pathPrefix}assets/xalpheric_logo.jpeg'">
                    </button>
                    <div class="radio-info">
                        <div class="radio-track-title">Xalpheric Radio</div>
                        <div class="radio-track-artist">Loading tracks...</div>
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
                    </button>
                </div>
                <div class="radio-playlist" style="display: none;">
                    <div class="playlist-header">
                        <h3>Xalpheric Tracks</h3>
                        <button class="playlist-close">✕</button>
                    </div>
                    <div class="playlist-items">
                        ${this.generatePlaylistHTML()}
                    </div>
                </div>
            </div>
        `;
        
        // Add to body for fixed positioning
        document.body.appendChild(this.container);
        
        // Ensure visibility immediately after creation
        this.ensureVisibility();
        
        // Bind all events
        this.bindEvents();
    }
    
    generatePlaylistHTML() {
        if (this.playlist.length === 0) {
            return '<div class="playlist-loading">Loading tracks...</div>';
        }
        
        return this.playlist.map((track, index) => `
            <div class="playlist-item" data-index="${index}">
                <img src="${track.cover}" alt="${track.title}" class="playlist-cover">
                <div class="playlist-info">
                    <div class="playlist-title">${track.title}</div>
                    <div class="playlist-artist">Xalpheric</div>
                    ${track.description ? `<div class="playlist-description">${track.description}</div>` : ''}
                    <div class="playlist-meta">
                        ${track.year ? `<span class="playlist-year">${track.year}</span>` : ''}
                        ${track.duration ? `<span class="playlist-duration">${track.duration}</span>` : ''}
                    </div>
                </div>
                <button class="playlist-play-btn" data-index="${index}">▶</button>
            </div>
        `).join('');
    }
    
    // Method to refresh playlist UI after loading config
    refreshPlaylistUI() {
        const playlistContainer = this.container?.querySelector('.playlist-items');
        if (playlistContainer) {
            playlistContainer.innerHTML = this.generatePlaylistHTML();
            // Re-bind playlist events
            this.bindPlaylistEvents();
        }
        
        // Update the initial cover image
        const coverElement = this.container?.querySelector('.radio-album-cover');
        if (coverElement && this.playlist.length > 0) {
            coverElement.src = this.playlist[0].cover;
            coverElement.alt = this.playlist[0].title;
        }
        
        // Update the artist text
        const artistElement = this.container?.querySelector('.radio-track-artist');
        if (artistElement) {
            if (this.playlist.length > 0) {
                artistElement.textContent = 'Select a track';
            } else {
                artistElement.textContent = 'No tracks available';
            }
        }
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
        
        // Add dragging functionality
        this.setupDragFunctionality();
        
        // Bind playlist-specific events
        this.bindPlaylistEvents();
    }
    
    bindPlaylistEvents() {
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
    
    setupDragFunctionality() {
        // Only enable dragging on desktop (1025px and up)
        if (window.innerWidth < 1025) {
            console.log('Mobile/tablet detected - disabling drag functionality');
            return;
        }
        
        console.log('Desktop detected - enabling drag functionality');
        
        // Load saved position only on desktop
        const saved = localStorage.getItem('xalpheric-radio-position');
        if (saved) {
            try {
                this.savedPosition = JSON.parse(saved);
                this.setPosition(this.savedPosition.x, this.savedPosition.y);
            } catch (error) {
                console.log('Error loading saved position:', error);
                localStorage.removeItem('xalpheric-radio-position');
            }
        }
        
        // Make the radio player draggable
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        let dragStarted = false; // Track if drag actually started (helps with touch)
        
        // Add drag cursor style
        const dragHandle = this.container.querySelector('.radio-main');
        dragHandle.style.cursor = 'grab';
        
        // Shared drag start logic
        const startDrag = (clientX, clientY) => {
            console.log('Starting drag at:', clientX, clientY);
            isDragging = true;
            dragStarted = false; // Will be set to true on first move
            startX = clientX;
            startY = clientY;
            
            const rect = this.container.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            dragHandle.style.cursor = 'grabbing';
            this.container.style.transition = 'none';
            this.container.style.zIndex = '9999';
            
            // Add active dragging class for visual feedback
            this.container.classList.add('dragging');
            console.log('Drag initialized - element positioned at:', startLeft, startTop);
        };
        
        // Shared drag move logic
        const updateDrag = (clientX, clientY) => {
            if (!isDragging) return;
            
            // Validate coordinates for large displays
            if (!isFinite(clientX) || !isFinite(clientY) || 
                clientX < 0 || clientY < 0 || 
                clientX > window.innerWidth + 100 || clientY > window.innerHeight + 100) {
                console.warn('Invalid drag coordinates:', clientX, clientY);
                return;
            }
            
            // Check if we've moved enough to consider this a real drag (helps with accidental touches)
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (!dragStarted && distance > 5) {
                dragStarted = true;
                console.log('Drag threshold reached - starting actual drag movement');
            }
            
            if (dragStarted) {
                const newLeft = startLeft + deltaX;
                const newTop = startTop + deltaY;
                
                // Additional bounds check before setting position
                if (isFinite(newLeft) && isFinite(newTop)) {
                    this.setPosition(newLeft, newTop);
                } else {
                    console.warn('Invalid calculated position:', newLeft, newTop);
                }
            }
        };
        
        // Shared drag end logic
        const endDrag = () => {
            if (isDragging) {
                isDragging = false;
                dragStarted = false;
                dragHandle.style.cursor = 'grab';
                this.container.style.transition = '';
                this.container.style.zIndex = '9998';
                this.container.classList.remove('dragging');
                
                // Save position
                localStorage.setItem('xalpheric-radio-position', JSON.stringify(this.savedPosition));
            }
        };
        
        // Mouse events (desktop only)
        dragHandle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button') || e.target.closest('.radio-progress-mini')) {
                return;
            }
            startDrag(e.clientX, e.clientY);
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            updateDrag(e.clientX, e.clientY);
        });

        document.addEventListener('mouseup', endDrag);
    }
    
    setPosition(x, y) {
        console.log('setPosition called with:', x, y);
        
        // Safety check for very large displays
        if (!this.container || !this.container.offsetWidth) {
            console.warn('Container not ready for positioning');
            return;
        }
        
        // Log current state before positioning
        console.log('Container current state:', {
            offsetWidth: this.container.offsetWidth,
            offsetHeight: this.container.offsetHeight,
            currentLeft: this.container.style.left,
            currentTop: this.container.style.top
        });
        
        // Constrain to viewport bounds with safety margins
        const containerWidth = this.container.offsetWidth || 300; // Fallback width
        const containerHeight = this.container.offsetHeight || 100; // Fallback height
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Add safety margins for very large displays
        const rightMargin = Math.min(50, viewportWidth * 0.02); // Max 50px or 2% of viewport
        const bottomMargin = Math.min(50, viewportHeight * 0.02); // Max 50px or 2% of viewport
        
        const maxLeft = viewportWidth - containerWidth - rightMargin;
        const maxTop = viewportHeight - containerHeight - bottomMargin;
        
        // Ensure minimum positioning from edges
        const minLeft = Math.max(0, rightMargin);
        const minTop = Math.max(0, 20); // Minimum 20px from top
        
        const originalX = x;
        const originalY = y;
        
        x = Math.max(minLeft, Math.min(x, maxLeft));
        y = Math.max(minTop, Math.min(y, maxTop));
        
        // Debug logging for all displays to catch the issue
        console.log('setPosition calculation:', {
            viewport: `${viewportWidth}x${viewportHeight}`,
            container: `${containerWidth}x${containerHeight}`,
            requested: `${originalX},${originalY}`,
            constrained: `${x},${y}`,
            bounds: `minLeft:${minLeft}, maxLeft:${maxLeft}, minTop:${minTop}, maxTop:${maxTop}`,
            margins: `right:${rightMargin}, bottom:${bottomMargin}`
        });
        
        this.container.style.left = x + 'px';
        this.container.style.top = y + 'px';
        this.container.style.right = 'auto';
        this.container.style.bottom = 'auto';
        this.container.style.transform = '';
        
        console.log('Applied styles:', {
            left: this.container.style.left,
            top: this.container.style.top,
            right: this.container.style.right,
            bottom: this.container.style.bottom
        });
        
        // Update internal position tracking
        this.savedPosition = { x, y };
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
    
    ensureOptimalPosition() {
        // This method ensures the radio player is positioned optimally
        console.log('ensureOptimalPosition called - viewport:', window.innerWidth, 'x', window.innerHeight);
        
        // Check if we're on desktop (where dragging is allowed)
        const isDesktop = window.innerWidth >= 1025;
        
        if (!isDesktop) {
            // On mobile/tablet, let CSS handle positioning completely
            console.log('Mobile/tablet detected - using CSS positioning only');
            if (this.container) {
                // Clear any saved position that might override CSS
                this.container.style.left = '';
                this.container.style.top = '';
                this.container.style.right = '';
                this.container.style.bottom = '';
                this.container.style.transform = '';
            }
            localStorage.removeItem('xalpheric-radio-position');
            this.ensureVisibility();
            return;
        }
        
        // Desktop only: Handle saved positions for dragging
        console.log('Desktop detected - allowing draggable positioning');
        
        const saved = localStorage.getItem('xalpheric-radio-position');
        if (saved) {
            try {
                const position = JSON.parse(saved);
                console.log('Found saved position:', position);
                
                // Validate saved position for current viewport
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                // If saved position is way outside current viewport, reset to CSS default
                if (position.x > viewportWidth - 100 || position.y > viewportHeight - 100 ||
                    position.x < -100 || position.y < -100) {
                    console.log('Saved position outside viewport, using CSS default');
                    localStorage.removeItem('xalpheric-radio-position');
                } else {
                    console.log('Applying saved position:', position.x, position.y);
                    this.savedPosition = position;
                    this.setPosition(position.x, position.y);
                    this.ensureVisibility();
                    return;
                }
            } catch (error) {
                console.log('Error loading saved position:', error);
                localStorage.removeItem('xalpheric-radio-position');
            }
        }
        
        // No valid saved position - use CSS default (top: 70px, right: 20px for desktop)
        console.log('Using CSS default positioning for desktop');
        if (this.container) {
            this.container.style.left = '';
            this.container.style.top = '';
            this.container.style.right = '';
            this.container.style.bottom = '';
            this.container.style.transform = '';
        }
        
        this.ensureVisibility();
    }
    
    ensureVisibility() {
        // Ensure the radio player is always visible, especially on mobile
        if (this.container) {
            this.container.style.opacity = '1';
            this.container.style.visibility = 'visible';
            this.container.style.display = 'block';
            this.container.style.zIndex = '9998';
            
            // Force layout recalculation
            this.container.offsetHeight;
        }
    }
}

// Initialize radio player when DOM is ready
async function initializeRadioPlayer() {
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
