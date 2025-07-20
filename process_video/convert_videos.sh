#!/bin/bash

# Video conversion script using ffmpeg
# Processes video files according to input/output mapping

set -e  # Exit on any error

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ Error: ffmpeg is not installed or not in PATH"
    echo "💡 Install ffmpeg:"
    echo "   macOS: brew install ffmpeg"
    echo "   Ubuntu: sudo apt install ffmpeg"
    echo "   Windows: Download from https://ffmpeg.org/download.html"
    exit 1
fi

# Check if JSON parameter was provided
if [ $# -eq 0 ]; then
    echo "❌ Error: No conversion mapping provided"
    echo "💡 Usage: $0 '[{\"inputName\":\"input.mp4\",\"outputName\":\"output.mp3\"}]'"
    exit 1
fi

# Get the JSON parameter
CONVERSIONS_JSON="$1"

echo "🎬 Starting video processing with ffmpeg..."
echo "📋 Conversion mapping: $CONVERSIONS_JSON"

# Ensure output directory exists
mkdir -p ../public/music

# Parse JSON and process each conversion
echo "$CONVERSIONS_JSON" | jq -c '.[]' | while read -r conversion; do
    INPUT_FILE=$(echo "$conversion" | jq -r '.inputName')
    OUTPUT_FILE="../public/music/$(echo "$conversion" | jq -r '.outputName')"
    
    echo ""
    echo "🔄 Processing: $INPUT_FILE → $OUTPUT_FILE"
    
    # Check if input file exists
    if [ ! -f "$INPUT_FILE" ]; then
        echo "⚠️  Warning: Input file '$INPUT_FILE' not found, skipping..."
        continue
    fi
    
    # Determine conversion type based on output extension
    OUTPUT_EXT="${OUTPUT_FILE##*.}"
    
    case "$OUTPUT_EXT" in
        mp3)
            echo "🎵 Converting to MP3 audio..."
            ffmpeg -i "$INPUT_FILE" -vn -acodec libmp3lame -ab 192k "$OUTPUT_FILE" -y
            ;;
        wav)
            echo "🎵 Converting to WAV audio..."
            ffmpeg -i "$INPUT_FILE" -vn -acodec pcm_s16le "$OUTPUT_FILE" -y
            ;;
        mp4)
            echo "🎥 Converting to MP4 video..."
            ffmpeg -i "$INPUT_FILE" -c:v libx264 -crf 23 -c:a aac -b:a 128k "$OUTPUT_FILE" -y
            ;;
        mov)
            echo "🎥 Converting to MOV video..."
            ffmpeg -i "$INPUT_FILE" -c:v libx264 -crf 23 -c:a aac -b:a 128k "$OUTPUT_FILE" -y
            ;;
        webm)
            echo "🎥 Converting to WebM video..."
            ffmpeg -i "$INPUT_FILE" -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus "$OUTPUT_FILE" -y
            ;;
        gif)
            echo "🎞️  Converting to GIF..."
            ffmpeg -i "$INPUT_FILE" -vf "fps=10,scale=320:-1:flags=lanczos,palettegen" -y palette.png
            ffmpeg -i "$INPUT_FILE" -i palette.png -filter_complex "fps=10,scale=320:-1:flags=lanczos[x];[x][1:v]paletteuse" "$OUTPUT_FILE" -y
            rm -f palette.png
            ;;
        *)
            echo "⚠️  Warning: Unsupported output format '$OUTPUT_EXT', skipping..."
            continue
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully converted: $INPUT_FILE → $OUTPUT_FILE"
        
        # Display file sizes
        INPUT_SIZE=$(du -h "$INPUT_FILE" | cut -f1)
        OUTPUT_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
        echo "📊 Size: $INPUT_SIZE → $OUTPUT_SIZE"
    else
        echo "❌ Failed to convert: $INPUT_FILE → $OUTPUT_FILE"
    fi
done

echo ""
echo "🎉 Video processing complete!"
