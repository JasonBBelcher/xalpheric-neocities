/* ============================================================================
   audio-bus.js
   ----------------------------------------------------------------------------
   Cross-player switch bus. Only one audio source may play at a time
   across the whole site:

     - Xalpheric radio widget / home page player (xalpheric channel)
     - Light-Bleeder page music catalog (light-bleeder channel)

   Players that want to start playback FIRST dispatch a CustomEvent asking
   every other channel to pause. Players register a listener that pauses
   themselves when they hear a request from a different channel.

   This file is intentionally tiny so it can be inlined or duplicated
   into both build paths (src/assets/js/ and public/js/).
   ============================================================================
 */
(function () {
  'use strict';

  var EVENT_NAME = 'audio:request-pause';

  var CHANNELS = {
    XALPHERIC:    'xalpheric',
    LIGHT_BLEEDER: 'light-bleeder'
  };

  /**
   * Ask every other player channel to pause. Safe to call from any player
   * before it starts playback. No-op if the bus isn't initialised yet
   * (e.g. when called very early on a page where the script hasn't
   * loaded).
   */
  function requestPause(channel) {
    if (!channel) return;
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { channel: channel } }));
    } catch (e) {
      // CustomEvent constructor not available in very old browsers —
      // fall back to a plain Event so listeners still fire.
      var evt = document.createEvent('Event');
      evt.initEvent(EVENT_NAME, true, true);
      evt.detail = { channel: channel };
      window.dispatchEvent(evt);
    }
  }

  /**
   * Register a pause handler. The given callback fires only when the
   * requesting channel is different from `ownChannel`. Returns a
   * function that removes the listener (so callers can clean up on
   * teardown if needed).
   */
  function onRequestPause(ownChannel, callback) {
    if (typeof callback !== 'function') return function () {};
    var handler = function (e) {
      var other = e && e.detail && e.detail.channel;
      if (other && other !== ownChannel) {
        callback(other);
      }
    };
    window.addEventListener(EVENT_NAME, handler);
    return function off() { window.removeEventListener(EVENT_NAME, handler); };
  }

  window.AudioBus = {
    CHANNELS: CHANNELS,
    requestPause: requestPause,
    onRequestPause: onRequestPause,
    EVENT_NAME: EVENT_NAME
  };
})();
