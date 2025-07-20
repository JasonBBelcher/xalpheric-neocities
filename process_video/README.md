# Video Processing Script

This script uses ffmpeg to convert iOS videos (and other formats) to various output formats including MP3 audio extraction, video format conversion, and more.

## Prerequisites

### Install ffmpeg

**macOS (using Homebrew):**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)

### Install jq (for JSON parsing)

**macOS:**
```bash
brew install jq
```

**Ubuntu/Debian:**
```bash
sudo apt install jq
```

## Setup

Add the npm script to your `package.json`:

```json
{
  "scripts": {
    "process-video": "node process-video.js"
  }
}
```

## Usage

### Basic Command Format

```bash
npm run process-video '[{"inputName":"input_file","outputName":"output_file"}]'
```

### Examples

**Convert single MP4 to MP3:**
```bash
npm run process-video '[{"inputName":"video.mp4","outputName":"audio.mp3"}]'
```

**Convert multiple files:**
```bash
npm run process-video '[
  {"inputName":"video1.mp4","outputName":"audio1.mp3"},
  {"inputName":"video2.MOV","outputName":"video2.mp4"},
  {"inputName":"clip.mp4","outputName":"clip.wav"}
]'
```

**iOS video processing:**
```bash
npm run process-video '[
  {"inputName":"IMG_1234.MOV","outputName":"song1.mp3"},
  {"inputName":"IMG_1235.mp4","outputName":"song2.wav"}
]'
```

## Supported Output Formats

| Format | Extension | Description | Quality Settings |
|--------|-----------|-------------|------------------|
| MP3 Audio | `.mp3` | Compressed audio | 192kbps |
| WAV Audio | `.wav` | Uncompressed audio | 16-bit PCM |
| MP4 Video | `.mp4` | H.264 video | CRF 23, AAC 128kbps |
| MOV Video | `.mov` | QuickTime format | H.264, AAC 128kbps |
| WebM Video | `.webm` | Web-optimized | VP9, Opus |
| GIF Animation | `.gif` | Animated image | 10fps, 320px wide |

## JSON Parameter Format

The script expects a JSON array where each object has:

- `inputName` (required): Path to the input file
- `outputName` (required): Path and name for the output file

```json
[
  {
    "inputName": "path/to/input.mp4",
    "outputName": "path/to/output.mp3"
  }
]
```

## File Placement

1. Place your input video files in the `process_video/` directory
2. Run the npm script
3. Output files will be created in the same directory

## Common Use Cases

### Extract Audio from iOS Videos
```bash
npm run process-video '[
  {"inputName":"IMG_1001.MOV","outputName":"recording1.mp3"},
  {"inputName":"IMG_1002.mp4","outputName":"recording2.wav"}
]'
```

### Convert Videos for Web
```bash
npm run process-video '[
  {"inputName":"original.MOV","outputName":"web_video.mp4"},
  {"inputName":"original.MOV","outputName":"web_video.webm"}
]'
```

### Create Animated GIFs
```bash
npm run process-video '[
  {"inputName":"funny_clip.mp4","outputName":"animated.gif"}
]'
```

## Troubleshooting

### ffmpeg not found
- Make sure ffmpeg is installed and in your PATH
- Test with: `ffmpeg -version`

### jq not found
- Install jq for JSON parsing
- Test with: `jq --version`

### File not found
- Ensure input files are in the `process_video/` directory
- Check file names and extensions match exactly

### Invalid JSON
- Use single quotes around the JSON parameter
- Escape double quotes if needed
- Validate JSON format online if unsure

## Advanced Usage

### Custom Quality Settings

To modify quality settings, edit the `convert_videos.sh` script:

- **MP3 Quality:** Change `-ab 192k` to desired bitrate
- **Video Quality:** Change `-crf 23` (lower = better quality)
- **GIF Size:** Modify `scale=320:-1` for different dimensions

### Batch Processing

For large batches, create a JSON file and use:

```bash
# Create conversions.json file
npm run process-video "$(cat conversions.json)"
```

## Output Information

The script provides:
- ✅ Success/failure status for each conversion
- 📊 File size comparison (before/after)
- 🎬 Conversion progress and format details
- ⚠️ Warnings for missing files or unsupported formats
