/* ============================================================================
   lb-player.js
   ----------------------------------------------------------------------------
   Click-to-play handler for the Light-Bleeder page music catalog.

   Each release strip is an <a download> linking to its .mp3. We hijack
   plain left-clicks: load the file into the shared <audio> element and
   play it. Right-click / cmd-click / middle-click still download the
   file as a normal link, because we only preventDefault on left-click
   without modifier keys.

   Cross-player switch: this player lives on the "light-bleeder" channel.
   Before starting playback it asks every other channel (xalpheric radio
   widget / home page player) to pause via the shared AudioBus. If a
   different channel is already playing when this one starts, that other
   player stops first.
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

  const CHANNEL = (window.AudioBus && window.AudioBus.CHANNELS.LIGHT_BLEEDER) || 'light-bleeder';

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

    // Ask every other player channel to pause BEFORE we start. The
    // xalpheric radio widget listens for this and will stop itself.
    if (window.AudioBus && typeof window.AudioBus.requestPause === 'function') {
      window.AudioBus.requestPause(CHANNEL);
    }

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

  // Listen for pause requests from the xalpheric channel. When the
  // radio widget / home page player starts, we hand off and stop.
  if (window.AudioBus && typeof window.AudioBus.onRequestPause === 'function') {
    window.AudioBus.onRequestPause(CHANNEL, () => {
      if (!audio.paused) {
        audio.pause();
        // Strip state will be re-rendered by the existing 'pause' listener
        // back to 'Play', so the UI stays consistent.
      }
    });
  }
})();
