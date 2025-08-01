// Guestbook API Wake-up Service
// This script runs on every page load to warm up the guestbook API container
// preventing cold starts when users actually visit the guestbook

(function() {
  // Configuration
  const GUESTBOOK_API_BASE_URL = 'https://xalpheric-guestbook-api.onrender.com';
  
  // Wake up function
  async function wakeUpGuestbookAPI() {
    try {
      console.log('🔥 Warming up guestbook API...');
      const startTime = performance.now();
      
      const response = await fetch(`${GUESTBOOK_API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Guestbook API warmed up successfully (${responseTime}ms)`, data);
      } else {
        console.warn('⚠️ Guestbook API wake-up returned non-OK status:', response.status);
      }
    } catch (error) {
      console.warn('⚠️ Failed to wake up guestbook API (this is non-critical):', error.message);
    }
  }
  
  // Only run wake-up once per session to avoid unnecessary requests
  const sessionKey = 'guestbook_api_warmed';
  if (!sessionStorage.getItem(sessionKey)) {
    // Mark as warmed for this session
    sessionStorage.setItem(sessionKey, 'true');
    
    // Wait a brief moment for DOM to be ready, then wake up API
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', wakeUpGuestbookAPI);
    } else {
      wakeUpGuestbookAPI();
    }
  } else {
    console.log('🔥 Guestbook API already warmed up this session');
  }
})();
