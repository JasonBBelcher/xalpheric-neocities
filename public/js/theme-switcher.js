/**
 * Theme Switcher
 * Handles theme switching between Cyberpunk and Vintage (light/dark) themes
 * Persists user preference to localStorage
 */

class ThemeSwitcher {
  constructor() {
    this.themes = ['cyberpunk', 'vintage-light', 'vintage-dark'];
    this.currentTheme = this.loadTheme();
    this.init();
  }

  /**
   * Initialize theme switcher
   * - Apply saved theme
   * - Set up event listeners
   * - Update UI state
   */
  init() {
    this.applyTheme(this.currentTheme);
    this.setupEventListeners();
    this.updateUI();
  }

  /**
   * Load theme from localStorage or default to cyberpunk
   * @returns {string} Theme name
   */
  loadTheme() {
    const saved = localStorage.getItem('theme');
    if (saved && this.themes.includes(saved)) {
      return saved;
    }
    return 'cyberpunk'; // Default theme
  }

  /**
   * Save theme to localStorage
   * @param {string} theme - Theme name
   */
  saveTheme(theme) {
    localStorage.setItem('theme', theme);
  }

  /**
   * Apply theme to document
   * @param {string} theme - Theme name
   */
  applyTheme(theme) {
    // Add smooth transition for theme changes
    document.documentElement.style.setProperty('transition', 'background-color 0.3s ease, color 0.3s ease');
    
    // Set data-theme attribute
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update current theme
    this.currentTheme = theme;
    
    // Save to localStorage
    this.saveTheme(theme);
    
    // Remove transition after change completes
    setTimeout(() => {
      document.documentElement.style.removeProperty('transition');
    }, 300);
  }

  /**
   * Cycle to next theme in sequence
   */
  cycleTheme() {
    const currentIndex = this.themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % this.themes.length;
    const nextTheme = this.themes[nextIndex];
    
    this.applyTheme(nextTheme);
    this.updateUI();
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('themeChange', { 
      detail: { theme: nextTheme }
    }));
  }

  /**
   * Set specific theme
   * @param {string} theme - Theme name
   */
  setTheme(theme) {
    if (!this.themes.includes(theme)) {
      console.warn(`Theme "${theme}" not found. Available themes:`, this.themes);
      return;
    }
    
    this.applyTheme(theme);
    this.updateUI();
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('themeChange', { 
      detail: { theme }
    }));
  }

  /**
   * Get human-readable theme name
   * @param {string} theme - Theme name
   * @returns {string} Display name
   */
  getThemeDisplayName(theme) {
    const names = {
      'cyberpunk': '🌃 Cyberpunk',
      'vintage-light': '☀️ Vintage Light',
      'vintage-dark': '🌙 Vintage Dark'
    };
    return names[theme] || theme;
  }

  /**
   * Update UI elements to reflect current theme
   */
  updateUI() {
    // Update theme toggle button text
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      const displayName = this.getThemeDisplayName(this.currentTheme);
      toggleBtn.setAttribute('aria-label', `Current theme: ${displayName}. Click to cycle themes.`);
      toggleBtn.title = displayName;
    }

    // Update theme indicator text
    const indicator = document.getElementById('theme-indicator');
    if (indicator) {
      indicator.textContent = this.getThemeDisplayName(this.currentTheme);
    }

    // Update dropdown if present
    const dropdown = document.getElementById('theme-dropdown');
    if (dropdown) {
      dropdown.value = this.currentTheme;
    }
  }

  /**
   * Set up event listeners for theme controls
   */
  setupEventListeners() {
    // Theme toggle button (cycle through themes)
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.cycleTheme());
    }

    // Theme dropdown (select specific theme)
    const dropdown = document.getElementById('theme-dropdown');
    if (dropdown) {
      dropdown.addEventListener('change', (e) => this.setTheme(e.target.value));
    }

    // Keyboard shortcut: Ctrl+Shift+T to cycle themes
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        this.cycleTheme();
      }
    });
  }

  /**
   * Get current theme
   * @returns {string} Current theme name
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Get all available themes
   * @returns {Array} Array of theme names
   */
  getAvailableThemes() {
    return [...this.themes];
  }
}

// Initialize theme switcher when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.themeSwitcher = new ThemeSwitcher();
  });
} else {
  window.themeSwitcher = new ThemeSwitcher();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeSwitcher;
}
