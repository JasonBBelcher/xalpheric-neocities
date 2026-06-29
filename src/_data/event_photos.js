const fs = require("fs");
const path = require("path");

module.exports = function() {
  // Load the descriptions from the JSON file
  let descriptions = {};
  try {
    const filePath = path.resolve(__dirname, "../../public/config/event-photos.json");
    const raw = fs.readFileSync(filePath, "utf8");
    descriptions = JSON.parse(raw);
  } catch (error) {
    console.warn("Could not load event-photos.json, using empty object:", error.message);
  }

  // Get actual files that exist in each event directory
  const eventsDir = path.resolve(__dirname, "../../public/assets/events");
  const eventPhotos = {};

  try {
    const events = fs.readdirSync(eventsDir);
    for (const event of events) {
      const eventPath = path.join(eventsDir, event);
      if (fs.statSync(eventPath).isDirectory()) {
        const files = fs.readdirSync(eventPath)
          .filter(file => file.match(/^photo-\d+\.jpg$/))
          .sort();
        
        eventPhotos[event] = files.map(file => {
          const description = descriptions[event] && descriptions[event][file] 
            ? descriptions[event][file] 
            : "";
          return {
            filename: file,
            description: description
          };
        });
      }
    }
  } catch (error) {
    console.warn("Could not read event photo directories:", error.message);
  }

  return eventPhotos;
};