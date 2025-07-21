#!/bin/zsh

# --- Configurable by user ---
TARGET_SIZE="$1"      # e.g. 512x512
OUTPUT_FORMAT="$2"    # e.g. jpg, png, webp
NAMING_PATTERN="$3"   # e.g. studio{increment}, photo{increment}, or leave empty for original names

# --- Validations ---
if [ -z "$TARGET_SIZE" ] || [ -z "$OUTPUT_FORMAT" ]; then
  echo "Usage: $0 <width>x<height> <output_format> [naming_pattern]"
  echo "Examples:"
  echo "  $0 512x512 jpg                    # Keep original filenames"
  echo "  $0 512x512 jpg studio{increment}  # studio1, studio2, studio3..."
  echo "  $0 512x512 png photo{increment}   # photo1, photo2, photo3..."
  exit 1
fi

# --- Setup ---
mkdir -p ../public/assets

# Enable null globbing in zsh (equivalent to bash's nullglob)
setopt NULL_GLOB

# Initialize counter for naming pattern
counter=1

for file in *.jpg *.jpeg *.png *.heic *.HEIC *.avif *.AVIF *.JPG *.JPEG *.PNG; do
  # Skip if no files match (in case glob returns the pattern itself)
  [[ -f "$file" ]] || continue
  
  # Determine output filename
  if [ -n "$NAMING_PATTERN" ]; then
    # Use custom naming pattern with increment
    filename=$(echo "$NAMING_PATTERN" | sed "s/{increment}/$counter/g")
    output="../public/assets/${filename}.${OUTPUT_FORMAT}"
    counter=$((counter + 1))
  else
    # Use original filename
    base="${file%.*}"
    output="../public/assets/${base}.${OUTPUT_FORMAT}"
  fi

  echo "Processing $file → $output ..."

  # Convert and resize using modern magick command
  magick "$file" -resize "$TARGET_SIZE" "$output"
done

# --- Cleanup ---
echo "🧹 Cleaning up source HEIC and AVIF files..."
for file in *.heic *.HEIC *.avif *.AVIF; do
  [[ -f "$file" ]] || continue
  echo "Deleting $file ..."
  rm "$file"
done

echo "✅ Done! Resized images are in ../public/assets"
