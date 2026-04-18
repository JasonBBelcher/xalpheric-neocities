/**
 * visualizer.js — transparent EQ spectrum overlaid on album art
 *
 * Hooks into the existing <audio id="player"> element via Web Audio API.
 * Draws a frequency-bar spectrum on a transparent <canvas> that sits on top
 * of the cover art. The same analyser node drives a matching canvas inside
 * the release lightbox when it's open.
 *
 * No external dependencies. Initialises on the user's first play interaction
 * to satisfy browser autoplay policy.
 */
(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────────────────────────
  const FFT_SIZE     = 512;   // frequencyBinCount = FFT_SIZE / 2 = 256 bins
  const BAR_COUNT    = 72;    // number of bars drawn across the canvas width
  const BAR_GAP      = 0.20;  // fraction of each slot reserved as gap
  const MAX_BAR_FRAC = 0.65;  // tallest bar = 65 % of canvas height
  const SMOOTHING    = 0.80;  // analyser time-smoothing (0 = instant, 1 = frozen)

  // Site palette  (matching #c47a2a amber · #2a8a9c teal · #e4d9bc cream)
  const C_TOP = '42,138,156';   // teal
  const C_MID = '228,217,188';  // cream
  const C_BTM = '196,122,42';   // amber

  // ── State ──────────────────────────────────────────────────────────────────
  let audioCtx   = null;
  let analyser   = null;
  let inited     = false;
  let canvasCover = null;  // over main player cover art
  let canvasLB    = null;  // over release lightbox image

  // ── Audio setup ────────────────────────────────────────────────────────────
  function initAudio(audioEl) {
    if (inited) {
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      return;
    }
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize               = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTHING;

      const src = audioCtx.createMediaElementSource(audioEl);
      src.connect(analyser);
      analyser.connect(audioCtx.destination); // must reconnect so audio still plays
      inited = true;
    } catch (err) {
      console.warn('[visualizer] Could not initialise Web Audio:', err);
    }
  }

  // ── Drawing ────────────────────────────────────────────────────────────────
  function drawBars(canvas, data) {
    const ctx = canvas.getContext('2d');
    const W   = canvas.offsetWidth;
    const H   = canvas.offsetHeight;
    if (!W || !H) return;

    // Keep canvas pixels in sync with CSS display size
    if (canvas.width  !== W) canvas.width  = W;
    if (canvas.height !== H) canvas.height = H;

    ctx.clearRect(0, 0, W, H);

    // Subtle dark vignette at bottom so bars are legible on bright artwork
    const vignette = ctx.createLinearGradient(0, H * 0.45, 0, H);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, H * 0.45, W, H * 0.55);

    const slot   = W / BAR_COUNT;
    const barW   = slot * (1 - BAR_GAP);
    const offset = slot * (BAR_GAP / 2);

    for (let i = 0; i < BAR_COUNT; i++) {
      // Map bar index to frequency bin (concentrate on audible lows/mids)
      const bin  = Math.floor(i * analyser.frequencyBinCount / BAR_COUNT);
      const v    = data[bin] / 255;            // normalise 0–1
      const barH = v * H * MAX_BAR_FRAC;
      if (barH < 1) continue;                  // skip silent bins

      const x     = i * slot + offset;
      const y     = H - barH;
      const alpha = 0.42 + v * 0.52;

      // Three-stop gradient: teal cap → cream body → amber base
      const grad = ctx.createLinearGradient(0, y, 0, H);
      grad.addColorStop(0,   `rgba(${C_TOP},${alpha})`);
      grad.addColorStop(0.45,`rgba(${C_MID},${(alpha * 0.85).toFixed(2)})`);
      grad.addColorStop(1,   `rgba(${C_BTM},${alpha})`);
      ctx.fillStyle = grad;

      // Rounded cap on each bar
      ctx.beginPath();
      const r = Math.min(2.5, barW / 2);
      ctx.moveTo(x, H);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.lineTo(x + barW - r, y);
      ctx.arcTo(x + barW, y, x + barW, y + r, r);
      ctx.lineTo(x + barW, H);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Main animation loop — runs unconditionally; draws only visible canvases
  function loop() {
    requestAnimationFrame(loop);
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    if (canvasCover && canvasCover.offsetParent) drawBars(canvasCover, data);
    if (canvasLB    && canvasLB.offsetParent)    drawBars(canvasLB,    data);
  }

  // ── Canvas / wrapper helpers ───────────────────────────────────────────────
  function makeCanvas(cls) {
    const c = document.createElement('canvas');
    c.className = cls;
    Object.assign(c.style, {
      position:      'absolute',
      bottom:        '0',
      left:          '0',
      width:         '100%',
      height:        '100%',
      pointerEvents: 'none',
      borderRadius:  'inherit',
      zIndex:        '2',
    });
    return c;
  }

  /**
   * Wrap `el` in a positioned div so the canvas can be layered over it.
   * Transfers the element's margin-bottom to the wrapper so layout is unchanged.
   */
  function addCanvasOver(el, cls) {
    const computed = window.getComputedStyle(el);
    const wrap = document.createElement('div');
    wrap.className = 'viz-wrap';
    Object.assign(wrap.style, {
      position:     'relative',
      display:      'block',
      lineHeight:   '0',
      width:        '100%',
      marginBottom: computed.marginBottom, // keep original spacing
    });
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    el.style.marginBottom = '0';  // now on wrapper
    el.style.display      = 'block';

    const canvas = makeCanvas(cls);
    wrap.appendChild(canvas);
    return canvas;
  }

  // ── Initialise ─────────────────────────────────────────────────────────────
  function setup() {
    const audioEl = document.getElementById('player');
    if (!audioEl) return; // Not on a player page — nothing to do

    // Initialise Web Audio on first user play gesture
    audioEl.addEventListener('play', () => initAudio(audioEl));

    // Wrap the main cover image
    const cover = document.getElementById('cover');
    if (cover) {
      canvasCover = addCanvasOver(cover, 'viz-canvas viz-canvas--cover');
    }

    // Wrap the lightbox image — it's created dynamically by main.js, so observe
    const obs = new MutationObserver(() => {
      const lbImg = document.getElementById('release-lightbox-image');
      if (lbImg && !canvasLB) {
        canvasLB = addCanvasOver(lbImg, 'viz-canvas viz-canvas--lightbox');
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    loop(); // start render loop (idle until analyser is ready)
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', setup)
    : setup();
})();
