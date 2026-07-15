/* ============================================================================
   ig-lazy.js
   ----------------------------------------------------------------------------
   Click-to-load Instagram embeds. Each card shows a lightweight placeholder
   until the visitor opts in. The Instagram embed.js script is loaded ONCE,
   only after the first click — so the page renders fast and Instagram's
   heavy third-party payload never runs for visitors who don't engage.

   The full blockquote for each post is held inside a <template> element
   inside the <article class="ig-embed">. On click we clone that template
   into the article, then call window.instgrm.Embeds.process() to hydrate
   it. The Instagram script is only injected on the first click.
   ============================================================================ */

(function () {
  "use strict";

  var EMBED_SRC = "//www.instagram.com/embed.js";
  var scriptLoaded = false;
  var scriptLoading = false;
  var pendingCards = [];

  // Inject the Instagram embed.js script exactly once. Resolves when
  // window.instgrm.Embeds.process() is available.
  function loadEmbedScript() {
    if (scriptLoaded) return Promise.resolve();
    if (scriptLoading) return new Promise(function (resolve) { pendingCards.push(resolve); });

    scriptLoading = true;
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = EMBED_SRC;
      s.async = true;
      s.onload = function () {
        scriptLoaded = true;
        scriptLoading = false;
        // Drain queue
        var q = pendingCards.slice();
        pendingCards.length = 0;
        q.forEach(function (fn) { fn(); });
        resolve();
      };
      s.onerror = function () {
        scriptLoading = false;
        reject(new Error("Failed to load Instagram embed.js"));
      };
      document.body.appendChild(s);
    });
  }

  // Run process() — Instagram exposes this global after embed.js loads.
  function processEmbeds(root) {
    if (window.instgrm && window.instgrm.Embeds && typeof window.instgrm.Embeds.process === "function") {
      window.instgrm.Embeds.process(root || undefined);
    }
  }

  // Activate one card: clone its <template> into the live slot, then
  // load the script (if needed) and process the embeds.
  function activate(card) {
    if (card.dataset.igState === "loading" || card.dataset.igState === "loaded") return;
    card.dataset.igState = "loading";

    var tmpl = card.querySelector("template.ig-embed__template");
    var slot = card.querySelector(".ig-embed__slot");
    if (!tmpl || !slot) {
      card.dataset.igState = "error";
      return;
    }

    // Move template contents into the live slot.
    slot.innerHTML = "";
    slot.appendChild(tmpl.content.cloneNode(true));
    slot.hidden = false;

    // Hide the placeholder button.
    var btn = card.querySelector(".ig-embed__placeholder");
    if (btn) btn.hidden = true;

    loadEmbedScript()
      .then(function () { processEmbeds(slot); card.dataset.igState = "loaded"; })
      .catch(function () { card.dataset.igState = "error"; });
  }

  // Optional: IntersectionObserver — if a card scrolls into view AND
  // the user has previously opened any card on this page, auto-activate
  // visible ones. This keeps the first visit fast but lets returning
  // engagement feel snappy.
  var anyOpened = false;
  function maybeAutoLoadOnScroll(card) {
    if (!anyOpened || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          activate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "200px 0px" });
    io.observe(card);
  }

  function init() {
    var cards = document.querySelectorAll(".ig-embed[data-ig-lazy='1']");
    if (!cards.length) return;

    cards.forEach(function (card) {
      var btn = card.querySelector(".ig-embed__placeholder");
      if (!btn) return;

      btn.addEventListener("click", function (event) {
        event.preventDefault();
        anyOpened = true;
        activate(card);
      });

      // Pre-arm scroll observation for after the first open.
      maybeAutoLoadOnScroll(card);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
