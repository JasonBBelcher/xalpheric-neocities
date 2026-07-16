/* ============================================================================
   lb-player.js
   ----------------------------------------------------------------------------
   Click-to-play handler for the Light-Bleeder page music catalog.

   Each release strip is an <a download> linking to its .mp3. We hijack
   plain left-clicks: load the file into the shared <audio> element and
   play it. Right-click / cmd-click / middle-click still download the
   file as a normal link, because we only preventDefault on left-click
   without modifier keys.
   ============================================================================
 */
(function () {
  'use strict';

  const root = document.querySelector('[data-lb-player]');
  if (!root) return;

  const audio    = root.querySelector('.lb-player__audio');
  const strips   = Array.from(root.querySelectorAll('[data-lb-track]'));
  const ACTION_LABEL_PLAY    = 'Play';
  const ACTION_LABEL_PAUSE   = 'Pause';
  const ACTION_LABEL_LOADING = 'Loading';

  let currentStrip = null;

  function setAction(strip, label) {
    const el = strip.querySelector('.lb-player__action');
    if (el) el.textContent = label;
  }

  function clearCurrent() {
    if (currentStrip) {
      currentStrip.classList.remove('is-playing');
      setAction(currentStrip, ACTION_LABEL_PLAY);
    }
    currentStrip = null;
  }

  function play(strip) {
    const url = strip.getAttribute('data-audio');
    if (!url) return;

    // Toggling the same track pauses it.
    if (currentStrip === strip) {
      audio.pause();
      return;
    }

    clearCurrent();
    currentStrip = strip;
    strip.classList.add('is-playing');
    setAction(strip, ACTION_LABEL_LOADING);

    audio.src = url;
    audio.currentTime = 0;
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // Autoplay or network error — reset the strip state.
        if (currentStrip === strip) {
          clearCurrent();
        }
      });
    }
  }

  audio.addEventListener('play', () => {
    if (currentStrip) setAction(currentStrip, ACTION_LABEL_PAUSE);
  });
  audio.addEventListener('pause', () => {
    if (currentStrip) setAction(currentStrip, ACTION_LABEL_PLAY);
  });
  audio.addEventListener('ended', () => {
    clearCurrent();
  });

  strips.forEach((strip) => {
    strip.addEventListener('click', (e) => {
      // Let the browser handle modifier-clicks and non-left clicks
      // so download / open-in-new-tab still work.
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      play(strip);
    });
  });
})();
