#!/bin/zsh

# --- Configurable by user ---
TARGET_SIZE_INPUT="$1"      # e.g. 512x512 or just 512
OUTPUT_FORMAT="$2"    # e.g. jpg, png, webp
NAMING_PATTERN="$3"   # e.g. studio{increment}, photo{increment}, or leave empty for original names

# --- Validations ---
if [ -z "$TARGET_SIZE_INPUT" ] || [ -z "$OUTPUT_FORMAT" ]; then
  echo "Usage: $0 <size> <output_format> [naming_pattern]"
  echo ""
  echo "Size formats:"
  echo "  Single dimension: 512, 1024, 2048, etc. (scales proportionally)"
  echo "  Two dimensions:   512x512, 1024x768, etc. (exact dimensions)"
  echo ""
  echo "Examples:"
  echo "  $0 512 jpg                        # Scale to fit 512px max, keep aspect ratio"
  echo "  $0 1024 jpg                       # Scale to fit 1024px max, keep aspect ratio"
  echo "  $0 512x512 jpg                    # Resize to exactly 512x512"
  echo "  $0 512 jpg studio{increment}      # Scale + custom naming: studio1, studio2..."
  echo "  $0 1024x768 png photo{increment}  # Exact size + custom naming: photo1, photo2..."
  exit 1
fi

# --- Process size parameter ---
if [[ "$TARGET_SIZE_INPUT" == *"x"* ]]; then
  # Two dimensions provided (e.g., "512x512")
  TARGET_SIZE="$TARGET_SIZE_INPUT"
  RESIZE_TYPE="exact"
  echo "🎯 Resize mode: Exact dimensions ($TARGET_SIZE)"
else
  # Single dimension provided (e.g., "512")
  TARGET_SIZE="${TARGET_SIZE_INPUT}x${TARGET_SIZE_INPUT}>"
  RESIZE_TYPE="proportional"
  echo "🎯 Resize mode: Proportional scaling (max ${TARGET_SIZE_INPUT}px, preserve aspect ratio)"
fi

# --- Setup ---
mkdir -p ../public/assets

# Enable null globbing in zsh (equivalent to bash's nullglob)
setopt NULL_GLOB

# Initialize counter for naming pattern
counter=1
processed_count=0

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
  echo "  📐 Using $RESIZE_TYPE resize: $TARGET_SIZE"

  # Convert and resize using modern magick command
  magick "$file" -resize "$TARGET_SIZE" "$output"
  
  if [ $? -eq 0 ]; then
    echo "  ✅ Successfully processed"
    processed_count=$((processed_count + 1))
  else
    echo "  ❌ Failed to process"
  fi
done

if [ $processed_count -eq 0 ]; then
  echo "⚠️  No image files found to process"
  echo "💡 Supported formats: jpg, jpeg, png, heic, avif (case insensitive)"
else
  echo ""
  echo "📊 Processing Summary:"
  echo "  📁 Files processed: $processed_count"
  echo "  🎯 Resize mode: $RESIZE_TYPE"
  echo "  📐 Target size: $TARGET_SIZE_INPUT"
  echo "  🎨 Output format: $OUTPUT_FORMAT"
fi

# --- Cleanup ---
echo "🧹 Cleaning up source HEIC and AVIF files..."
for file in *.heic *.HEIC *.avif *.AVIF; do
  [[ -f "$file" ]] || continue
  echo "Deleting $file ..."
  rm "$file"
done

echo "✅ Done! Resized images are in ../public/assets"
