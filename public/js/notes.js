// Notes functionality for injecting/appending content
$(document).ready(() => {
  // Function to load and display notes
  function loadNotes() {
    // This function can be used to dynamically load notes
    // For now, it's set up for future note injection
    console.log("Notes page loaded and ready for content injection");
  }

  // Function to append a new note
  function appendNote(title, content, timestamp = new Date()) {
    const noteHtml = `
      <article class="note-entry">
        <h3>${title}</h3>
        <div class="note-content">${content}</div>
        <div class="note-timestamp">${timestamp.toLocaleDateString()}</div>
      </article>
    `;
    
    $("#notes-content").append(noteHtml);
  }

  // Function to inject a note at a specific position
  function injectNote(title, content, position = 0) {
    const noteHtml = `
      <article class="note-entry">
        <h3>${title}</h3>
        <div class="note-content">${content}</div>
        <div class="note-timestamp">${new Date().toLocaleDateString()}</div>
      </article>
    `;
    
    const existingNotes = $(".note-entry");
    if (existingNotes.length === 0 || position >= existingNotes.length) {
      $("#notes-content").append(noteHtml);
    } else {
      $(noteHtml).insertBefore(existingNotes.eq(position));
    }
  }

  // Initialize
  loadNotes();

  // Make functions globally available
  window.appendNote = appendNote;
  window.injectNote = injectNote;
});
