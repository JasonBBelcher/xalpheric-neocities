#!/bin/zsh

# Enhanced Photo Processing Script
# Supports both original process_photos workflow and blog image processing

# --- Configurable by user ---
MODE="$1"                   # "blog" or "assets" 
TARGET_SIZE_INPUT="$2"      # e.g. 512x512 or just 512
OUTPUT_FORMAT="$3"          # e.g. jpg, png, webp
NAMING_PATTERN="$4"         # e.g. studio{increment}, photo{increment}, or leave empty for original names

# --- Usage and Validation ---
if [ -z "$MODE" ] || [ -z "$TARGET_SIZE_INPUT" ] || [ -z "$OUTPUT_FORMAT" ]; then
  echo "Usage: $0 <mode> <size> <output_format> [naming_pattern]"
  echo ""
  echo "Modes:"
  echo "  blog    - Process images from thoughts-and-musings folder → public/assets/blog-images/"
  echo "  assets  - Process images from process_photos folder → public/assets/"
  echo ""
  echo "Size formats:"
  echo "  Single dimension: 512, 1024, 2048, etc. (scales proportionally)"
  echo "  Two dimensions:   512x512, 1024x768, etc. (exact dimensions)"
  echo ""
  echo "Examples:"
  echo "  $0 blog 512 jpg                        # Process blog images, scale to 512px max"
  echo "  $0 assets 1024 jpg studio{increment}   # Process assets with custom naming"
  echo "  $0 blog 512x512 png                    # Process blog images to exact 512x512"
  exit 1
fi

# --- Validate mode ---
if [[ "$MODE" != "blog" && "$MODE" != "assets" ]]; then
  echo "❌ Invalid mode: $MODE. Must be 'blog' or 'assets'"
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

# --- Setup directories and paths based on mode ---
if [[ "$MODE" == "blog" ]]; then
  SOURCE_DIR="thoughts-and-musings"
  OUTPUT_DIR="public/assets/blog-images"
  echo "🗂️  Blog mode: Processing images from $SOURCE_DIR → $OUTPUT_DIR"
else
  SOURCE_DIR="process_photos"
  OUTPUT_DIR="public/assets"
  echo "🗂️  Assets mode: Processing images from $SOURCE_DIR → $OUTPUT_DIR"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if ImageMagick is available
if ! command -v magick &> /dev/null; then
  echo "❌ ImageMagick (magick command) is not installed or not in PATH"
  echo "💡 Install with: brew install imagemagick"
  exit 1
fi

# Enable null globbing in zsh (equivalent to bash's nullglob)
setopt NULL_GLOB

# Initialize counter for naming pattern
counter=1
processed_count=0
found_files=()

# Change to source directory
if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "❌ Source directory $SOURCE_DIR does not exist"
  exit 1
fi

cd "$SOURCE_DIR"

# Collect all image files
for file in *.jpg *.jpeg *.png *.heic *.HEIC *.avif *.AVIF *.JPG *.JPEG *.PNG *.gif *.GIF *.webp *.WEBP; do
  # Skip if no files match (in case glob returns the pattern itself)
  [[ -f "$file" ]] || continue
  found_files+=("$file")
done

if [ ${#found_files[@]} -eq 0 ]; then
  echo "⚠️  No image files found in $SOURCE_DIR"
  echo "💡 Supported formats: jpg, jpeg, png, heic, avif, gif, webp (case insensitive)"
  exit 0
fi

echo "📁 Found ${#found_files[@]} image file(s) to process"

# Process each file
for file in "${found_files[@]}"; do
  # Determine output filename
  if [ -n "$NAMING_PATTERN" ]; then
    # Use custom naming pattern with increment
    filename=$(echo "$NAMING_PATTERN" | sed "s/{increment}/$counter/g")
    if [[ "$MODE" == "blog" ]]; then
      output="../$OUTPUT_DIR/${filename}.${OUTPUT_FORMAT}"
    else
      output="../$OUTPUT_DIR/${filename}.${OUTPUT_FORMAT}"
    fi
    counter=$((counter + 1))
  else
    # Use original filename
    base="${file%.*}"
    if [[ "$MODE" == "blog" ]]; then
      output="../$OUTPUT_DIR/${base}.${OUTPUT_FORMAT}"
    else
      output="../$OUTPUT_DIR/${base}.${OUTPUT_FORMAT}"
    fi
  fi

  echo "Processing $file → $output ..."
  echo "  📐 Using $RESIZE_TYPE resize: $TARGET_SIZE"

  # Convert and resize using modern magick command
  magick "$file" -resize "$TARGET_SIZE" "$output"
  
  if [ $? -eq 0 ]; then
    echo "  ✅ Successfully processed"
    processed_count=$((processed_count + 1))
    
    # For blog mode, optionally remove original after successful processing
    if [[ "$MODE" == "blog" ]]; then
      echo "  🗑️  Removing original: $file"
      rm "$file"
    fi
  else
    echo "  ❌ Failed to process"
  fi
done

# Return to project root
cd ..

# --- Cleanup (only for assets mode, similar to original behavior) ---
if [[ "$MODE" == "assets" ]]; then
  echo "🧹 Cleaning up source HEIC and AVIF files in $SOURCE_DIR..."
  cd "$SOURCE_DIR"
  for file in *.heic *.HEIC *.avif *.AVIF; do
    [[ -f "$file" ]] || continue
    echo "Deleting $file ..."
    rm "$file"
  done
  cd ..
fi

# --- Summary ---
echo ""
echo "📊 Processing Summary:"
echo "  🎯 Mode: $MODE"
echo "  📁 Files processed: $processed_count"
echo "  🎯 Resize mode: $RESIZE_TYPE"
echo "  📐 Target size: $TARGET_SIZE_INPUT"
echo "  🎨 Output format: $OUTPUT_FORMAT"
echo "  📂 Output directory: $OUTPUT_DIR"

if [[ "$MODE" == "blog" ]]; then
  echo "✅ Done! Blog images are ready in $OUTPUT_DIR"
  echo "💡 Run 'npm run build-musings' to update your blog posts with the processed images"
else
  echo "✅ Done! Resized images are in $OUTPUT_DIR"
fi
