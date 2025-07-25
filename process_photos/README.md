# Photo Processing Script

Enhanced photo processing script with flexible resize options.

## Usage

```bash
./run_me.sh <size> <output_format> [naming_pattern]
```

## Size Formats

### Single Dimension (Proportional Scaling)
- **Format**: `512`, `1024`, `2048`, etc.
- **Behavior**: Scales image to fit within the specified dimension while preserving aspect ratio
- **ImageMagick syntax**: Uses `512x512>` which means:
  - Scale to fit within 512x512 box
  - `>` means only shrink, never enlarge
  - Maintains original aspect ratio

### Two Dimensions (Exact Scaling)
- **Format**: `512x512`, `1024x768`, `1920x1080`, etc.
- **Behavior**: Resizes to exact dimensions (may distort aspect ratio)
- **ImageMagick syntax**: Uses exact dimensions like `512x512`

## Examples

### Proportional Scaling (Recommended)
```bash
# Scale photos to fit within 512px (keeps aspect ratio)
./run_me.sh 512 jpg

# Scale to 1024px max, convert to WebP
./run_me.sh 1024 webp

# Scale to 2048px, custom naming
./run_me.sh 2048 jpg studio{increment}
```

### Exact Dimensions
```bash
# Resize to exactly 512x512 (may distort)
./run_me.sh 512x512 jpg

# Create thumbnails at exact 150x150
./run_me.sh 150x150 jpg thumb{increment}

# HD wallpapers at 1920x1080
./run_me.sh 1920x1080 jpg wallpaper{increment}
```

## Output Formats

- **jpg**: Best for photos, smaller file size
- **png**: Best for graphics, supports transparency
- **webp**: Modern format, excellent compression

## Naming Patterns

- **Default**: Keep original filenames
- **Custom**: Use `{increment}` placeholder for numbering
  - `studio{increment}` → studio1.jpg, studio2.jpg, etc.
  - `photo{increment}` → photo1.jpg, photo2.jpg, etc.

## Technical Details

### ImageMagick Resize Behavior

**Single dimension (e.g., `512`)**:
- Converted to: `512x512>`
- The `>` modifier means "only shrink, don't enlarge"
- Maintains aspect ratio within 512x512 box
- A 1000x500 image becomes 512x256
- A 500x1000 image becomes 256x512

**Two dimensions (e.g., `512x512`)**:
- Uses exact dimensions
- May distort aspect ratio
- A 1000x500 image becomes 512x512 (stretched)

### Supported Input Formats
- JPEG: .jpg, .jpeg, .JPG, .JPEG
- PNG: .png, .PNG  
- HEIC: .heic, .HEIC (iOS photos)
- AVIF: .avif, .AVIF (modern format)

### File Processing
1. **Processing**: Converts and resizes images
2. **Output**: Saves to `../public/assets/`
3. **Cleanup**: Removes original HEIC and AVIF files
4. **Summary**: Shows processing statistics

## Tips

### For Web Use
- Use single dimensions (e.g., `1024`) to preserve aspect ratios
- Choose `jpg` for photos, `png` for graphics with transparency
- Consider `webp` for modern browsers (better compression)

### For Thumbnails
- Use exact dimensions (e.g., `150x150`) for consistent grid layouts
- Accept that some images may be slightly distorted

### For High-Quality Output
- Use larger single dimensions (e.g., `2048`)
- Choose `png` if file size isn't a concern
- Use `jpg` with high quality for web optimization
