#!/bin/zsh

# --- Configurable by user ---
TARGET_SIZE="$1"      # e.g. 512x512
OUTPUT_FORMAT="$2"    # e.g. jpg, png, webp

# --- Validations ---
if [ -z "$TARGET_SIZE" ] || [ -z "$OUTPUT_FORMAT" ]; then
  echo "Usage: $0 <width>x<height> <output_format>"
  echo "Example: $0 512x512 jpg"
  exit 1
fi

# --- Setup ---
mkdir -p ../public/assets

# Enable null globbing in zsh (equivalent to bash's nullglob)
setopt NULL_GLOB

for file in *.jpg *.jpeg *.png *.heic *.HEIC *.JPG *.JPEG *.PNG; do
  # Skip if no files match (in case glob returns the pattern itself)
  [[ -f "$file" ]] || continue
  base="${file%.*}"
  output="../public/assets/${base}.${OUTPUT_FORMAT}"

  echo "Processing $file → $output ..."

  # Convert and resize using modern magick command
  magick "$file" -resize "$TARGET_SIZE" "$output"
done

# --- Cleanup ---
echo "🧹 Cleaning up source HEIC files..."
for file in *.heic *.HEIC; do
  [[ -f "$file" ]] || continue
  echo "Deleting $file ..."
  rm "$file"
done

echo "✅ Done! Resized images are in ../public/assets"
