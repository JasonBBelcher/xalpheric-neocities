// Guestbook API Integration
// Handles form submission, data loading, and UI interactions
//
// NOTE: The Guestbook API is now a separate project!
// Repository: https://github.com/YourUsername/xalpheric-guestbook-api
// Deploy the API separately and update the API_BASE_URL below

class GuestbookAPI {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.entries = [];
    this.displayedEntries = 0;
    this.entriesPerPage = 10;
  }

  async submitEntry(formData) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/guestbook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          name: formData.name ? formData.name.trim() : null,
          website: formData.website ? formData.website.trim() : null,
          comment: formData.comment.trim()
        })
      });

      const result = await response.json();
      return { 
        success: response.ok, 
        data: result, 
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      console.error('Network error submitting entry:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  }

  async loadEntries() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/guestbook`);
      const result = await response.json();
      
      if (result.success) {
        this.entries = result.entries || [];
        return { success: true, data: result };
      } else {
        return { success: false, error: result.error || 'Failed to load entries' };
      }
    } catch (error) {
      console.error('Network error loading entries:', error);
      return { 
        success: false, 
        error: 'Unable to connect to the message archive. Please try again later.' 
      };
    }
  }

  getEntriesToDisplay(page = 1) {
    const startIndex = 0;
    const endIndex = page * this.entriesPerPage;
    return this.entries.slice(startIndex, endIndex);
  }

  hasMoreEntries(currentPage) {
    return (currentPage * this.entriesPerPage) < this.entries.length;
  }
}

class GuestbookUI {
  constructor(api) {
    this.api = api;
    this.currentPage = 1;
    this.isSubmitting = false;
    this.autoRefreshInterval = null;
    
    this.elements = {
      form: document.getElementById('guestbook-form'),
      submitBtn: null,
      statusContainer: document.getElementById('guestbook-status'),
      entriesContainer: document.getElementById('guestbook-entries'),
      entriesCount: document.getElementById('entries-count'),
      loadMoreBtn: document.getElementById('load-more-btn'),
      commentField: document.getElementById('gb-comment'),
      commentCount: document.getElementById('comment-count')
    };
    
    this.elements.submitBtn = this.elements.form?.querySelector('button[type="submit"]');
  }

  init() {
    this.setupEventListeners();
    this.loadGuestbookEntries();
    this.startAutoRefresh();
  }

  setupEventListeners() {
    // Form submission
    if (this.elements.form) {
      this.elements.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Character count for comment field
    if (this.elements.commentField && this.elements.commentCount) {
      this.elements.commentField.addEventListener('input', () => this.updateCharacterCount());
    }

    // Load more button
    if (this.elements.loadMoreBtn) {
      this.elements.loadMoreBtn.addEventListener('click', () => this.loadMoreEntries());
    }

    // Focus effects for inputs
    this.setupInputEffects();
  }

  setupInputEffects() {
    const inputs = document.querySelectorAll('.cyber-input, .cyber-textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        input.parentElement.classList.add('focused');
      });
      
      input.addEventListener('blur', () => {
        input.parentElement.classList.remove('focused');
      });

      input.addEventListener('input', () => {
        if (input.value.trim()) {
          input.parentElement.classList.add('has-content');
        } else {
          input.parentElement.classList.remove('has-content');
        }
      });
    });
  }

  updateCharacterCount() {
    if (!this.elements.commentField || !this.elements.commentCount) return;
    
    const count = this.elements.commentField.value.length;
    this.elements.commentCount.textContent = count;
    
    const countElement = this.elements.commentCount.parentElement;
    
    // Color coding for character count
    countElement.classList.remove('warning', 'danger');
    if (count > 900) {
      countElement.classList.add('danger');
    } else if (count > 800) {
      countElement.classList.add('warning');
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    if (this.isSubmitting) return;
    
    this.isSubmitting = true;
    this.updateSubmitButton('TRANSMITTING...', true);
    this.clearStatus();
    
    // Get form data
    const formData = new FormData(this.elements.form);
    const entryData = {
      email: formData.get('email'),
      name: formData.get('name'),
      website: formData.get('website'),
      comment: formData.get('comment')
    };
    
    // Submit entry
    const result = await this.api.submitEntry(entryData);
    
    if (result.success) {
      this.showSuccessMessage(result.data);
      this.elements.form.reset();
      this.updateCharacterCount();
      
      // Clear has-content classes
      document.querySelectorAll('.form-group.has-content').forEach(group => {
        group.classList.remove('has-content');
      });
      
    } else {
      this.showErrorMessage(result);
    }
    
    this.isSubmitting = false;
    this.updateSubmitButton('TRANSMIT MESSAGE', false);
  }

  updateSubmitButton(text, disabled) {
    if (!this.elements.submitBtn) return;
    
    const btnText = this.elements.submitBtn.querySelector('.btn-text');
    if (btnText) {
      btnText.textContent = text;
    }
    
    this.elements.submitBtn.disabled = disabled;
    this.elements.submitBtn.classList.toggle('loading', disabled);
  }

  showSuccessMessage(data) {
    const message = `
      <div class="status-message success">
        <div class="status-icon">✓</div>
        <div class="status-content">
          <h3>Message Transmitted Successfully</h3>
          <p>Your message has been received and is now in the approval queue. It will appear in the archive once reviewed.</p>
          <p class="status-meta">Transmission ID: <code>${data.id || 'Unknown'}</code></p>
        </div>
      </div>
    `;
    this.elements.statusContainer.innerHTML = message;
    this.scrollToStatus();
  }

  showErrorMessage(result) {
    let errorMessage = 'An unexpected error occurred. Please try again.';
    let errorDetails = '';
    
    if (result.status === 429) {
      errorMessage = 'Rate limit exceeded. Please wait before submitting another message.';
      if (result.headers && result.headers['retry-after']) {
        const retryAfter = Math.ceil(result.headers['retry-after'] / 60);
        errorDetails = `Please wait ${retryAfter} minutes before trying again.`;
      } else {
        errorDetails = 'Please wait 15 minutes before trying again.';
      }
    } else if (result.data && result.data.error) {
      errorMessage = result.data.error;
      if (result.data.details && Array.isArray(result.data.details)) {
        errorDetails = result.data.details.map(detail => detail.msg).join(', ');
      }
    } else if (result.error) {
      errorMessage = result.error;
    }
    
    const message = `
      <div class="status-message error">
        <div class="status-icon">⚠</div>
        <div class="status-content">
          <h3>Transmission Failed</h3>
          <p>${errorMessage}</p>
          ${errorDetails ? `<p class="status-details">${errorDetails}</p>` : ''}
        </div>
      </div>
    `;
    this.elements.statusContainer.innerHTML = message;
    this.scrollToStatus();
  }

  clearStatus() {
    this.elements.statusContainer.innerHTML = '';
  }

  scrollToStatus() {
    setTimeout(() => {
      this.elements.statusContainer.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }, 100);
  }

  async loadGuestbookEntries() {
    this.showLoadingState();
    
    const result = await this.api.loadEntries();
    
    if (result.success) {
      this.updateEntriesCount(result.data.count || 0);
      this.displayEntries(1);
    } else {
      this.showEntriesError(result.error);
    }
  }

  showLoadingState() {
    this.elements.entriesContainer.innerHTML = `
      <div class="loading-container">
        <div class="cyber-loader">
          <div class="loader-ring"></div>
          <div class="loader-ring"></div>
          <div class="loader-ring"></div>
        </div>
        <p class="loading-text">Accessing message archive...</p>
      </div>
    `;
  }

  showEntriesError(error) {
    this.elements.entriesContainer.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠</div>
        <h3>Archive Access Failed</h3>
        <p>${error}</p>
        <button class="retry-btn cyber-btn small" onclick="guestbook.loadGuestbookEntries()">
          <span class="btn-text">RETRY CONNECTION</span>
          <span class="btn-glow"></span>
        </button>
      </div>
    `;
    
    this.elements.entriesCount.textContent = 'Connection failed';
  }

  updateEntriesCount(count) {
    this.elements.entriesCount.textContent = count === 0 ? 'No' : count.toLocaleString();
  }

  displayEntries(page) {
    const entries = this.api.getEntriesToDisplay(page);
    
    if (entries.length === 0) {
      this.elements.entriesContainer.innerHTML = `
        <div class="no-entries-container">
          <div class="no-entries-icon">📝</div>
          <h3>Archive Empty</h3>
          <p>No messages in the datastream yet. Be the first to leave your mark!</p>
        </div>
      `;
      this.elements.loadMoreBtn.style.display = 'none';
      return;
    }
    
    if (page === 1) {
      this.elements.entriesContainer.innerHTML = '';
    }
    
    entries.slice(this.api.displayedEntries).forEach(entry => {
      const entryElement = this.createEntryElement(entry);
      this.elements.entriesContainer.appendChild(entryElement);
    });
    
    this.api.displayedEntries = entries.length;
    this.currentPage = page;
    
    // Update load more button
    if (this.api.hasMoreEntries(page)) {
      this.elements.loadMoreBtn.style.display = 'block';
    } else {
      this.elements.loadMoreBtn.style.display = 'none';
    }
  }

  createEntryElement(entry) {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'guestbook-entry';
    
    const timestamp = new Date(entry.timestamp);
    const timeAgo = this.getTimeAgo(timestamp);
    const displayName = entry.name || 'Anonymous';
    const hasWebsite = entry.website && entry.website.trim();
    
    entryDiv.innerHTML = `
      <div class="entry-header">
        <div class="entry-identity">
          ${hasWebsite ? 
            `<a href="${entry.website}" target="_blank" rel="noopener" class="entry-name website-link">${displayName}</a>` :
            `<span class="entry-name">${displayName}</span>`
          }
          <span class="entry-email">${this.obfuscateEmail(entry.email)}</span>
        </div>
        <div class="entry-meta">
          <span class="entry-timestamp" title="${timestamp.toLocaleString()}">${timeAgo}</span>
          ${hasWebsite ? '<span class="website-indicator">🌐</span>' : ''}
        </div>
      </div>
      <div class="entry-content">
        <p class="entry-comment">${this.formatComment(entry.comment)}</p>
      </div>
      <div class="entry-glow"></div>
    `;
    
    return entryDiv;
  }

  obfuscateEmail(email) {
    if (!email) return '';
    
    const [user, domain] = email.split('@');
    if (!user || !domain) return email;
    
    const obfuscatedUser = user.length > 3 ? 
      user.substring(0, 2) + '***' + user.substring(user.length - 1) : 
      user.substring(0, 1) + '***';
      
    return `${obfuscatedUser}@${domain}`;
  }

  formatComment(comment) {
    if (!comment) return '';
    
    // Convert line breaks to <br> tags and handle already sanitized HTML
    return comment
      .replace(/\n/g, '<br>')
      .replace(/\r/g, '');
  }

  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  loadMoreEntries() {
    this.displayEntries(this.currentPage + 1);
  }

  startAutoRefresh() {
    // Refresh entries every 2 minutes
    this.autoRefreshInterval = setInterval(() => {
      this.api.loadEntries().then(result => {
        if (result.success) {
          const newCount = result.data.count || 0;
          const currentCount = this.api.entries.length;
          
          if (newCount !== currentCount) {
            this.updateEntriesCount(newCount);
            if (newCount > currentCount) {
              // New entries available, refresh display
              this.displayEntries(this.currentPage);
            }
          }
        }
      });
    }, 120000); // 2 minutes
  }

  destroy() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
  }
}

// Configuration - Update this with your deployed API URL
const API_BASE_URL = 'https://xalpheric-guestbook-api.onrender.com'; // Live API URL

// Initialize guestbook
let guestbook;

document.addEventListener('DOMContentLoaded', () => {
  const api = new GuestbookAPI(API_BASE_URL);
  guestbook = new GuestbookUI(api);
  guestbook.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (guestbook) {
    guestbook.destroy();
  }
});
