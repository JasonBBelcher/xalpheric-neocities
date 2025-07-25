#!/bin/bash

# Video conversion script using ffmpeg
# Processes video files according to input/output mapping

set -e  # Exit on any error

# Check if ffmpeg and ffprobe are installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ Error: ffmpeg is not installed or not in PATH"
    echo "💡 Install ffmpeg:"
    echo "   macOS: brew install ffmpeg"
    echo "   Ubuntu: sudo apt install ffmpeg"
    echo "   Windows: Download from https://ffmpeg.org/download.html"
    exit 1
fi

if ! command -v ffprobe &> /dev/null; then
    echo "❌ Error: ffprobe is not installed or not in PATH"
    echo "💡 ffprobe comes with ffmpeg - please reinstall ffmpeg"
    exit 1
fi

# Check if jq is installed (for JSON parsing and video info)
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is not installed or not in PATH"
    echo "💡 Install jq:"
    echo "   macOS: brew install jq"
    echo "   Ubuntu: sudo apt install jq"
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
    
    # Get input file info for optimization decisions
    INPUT_INFO=$(ffprobe -v quiet -print_format json -show_format -show_streams "$INPUT_FILE" 2>/dev/null || echo "{}")
    INPUT_CODEC=$(echo "$INPUT_INFO" | jq -r '.streams[] | select(.codec_type=="video") | .codec_name' 2>/dev/null | head -1)
    INPUT_WIDTH=$(echo "$INPUT_INFO" | jq -r '.streams[] | select(.codec_type=="video") | .width' 2>/dev/null | head -1)
    INPUT_HEIGHT=$(echo "$INPUT_INFO" | jq -r '.streams[] | select(.codec_type=="video") | .height' 2>/dev/null | head -1)
    INPUT_BITRATE=$(echo "$INPUT_INFO" | jq -r '.format.bit_rate' 2>/dev/null)
    
    echo "📊 Input info: ${INPUT_CODEC} ${INPUT_WIDTH}x${INPUT_HEIGHT} (~${INPUT_BITRATE} bps)"
    
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
            echo "🎥 Converting to web-optimized MP4..."
            
            # Determine if we need to resize for web
            if [ "$INPUT_WIDTH" != "null" ] && [ "$INPUT_WIDTH" -gt 1920 ]; then
                SCALE_FILTER="-vf scale=1920:-2:flags=lanczos"
                echo "   📐 Scaling down from ${INPUT_WIDTH}x${INPUT_HEIGHT} to 1920p for web"
            elif [ "$INPUT_WIDTH" != "null" ] && [ "$INPUT_WIDTH" -gt 1280 ]; then
                SCALE_FILTER="-vf scale=1280:-2:flags=lanczos"
                echo "   📐 Scaling down from ${INPUT_WIDTH}x${INPUT_HEIGHT} to 1280p for web"
            else
                SCALE_FILTER=""
                echo "   📐 Keeping original resolution ${INPUT_WIDTH}x${INPUT_HEIGHT}"
            fi
            
            # Optimize for web delivery with two-pass encoding for better quality
            echo "   🔧 Using web-optimized settings (H.264, AAC, fast start)"
            ffmpeg -i "$INPUT_FILE" \
                -c:v libx264 \
                -preset medium \
                -crf 23 \
                -maxrate 2M \
                -bufsize 4M \
                -c:a aac \
                -b:a 128k \
                -movflags +faststart \
                $SCALE_FILTER \
                "$OUTPUT_FILE" -y
            ;;
        webm)
            echo "🎥 Converting to WebM (VP9) for web..."
            
            # Determine target resolution for WebM
            if [ "$INPUT_WIDTH" != "null" ] && [ "$INPUT_WIDTH" -gt 1920 ]; then
                SCALE_FILTER="-vf scale=1920:-2:flags=lanczos"
            elif [ "$INPUT_WIDTH" != "null" ] && [ "$INPUT_WIDTH" -gt 1280 ]; then
                SCALE_FILTER="-vf scale=1280:-2:flags=lanczos"
            else
                SCALE_FILTER=""
            fi
            
            ffmpeg -i "$INPUT_FILE" \
                -c:v libvpx-vp9 \
                -crf 30 \
                -b:v 0 \
                -maxrate 2M \
                -bufsize 4M \
                -c:a libopus \
                -b:a 128k \
                $SCALE_FILTER \
                "$OUTPUT_FILE" -y
            ;;
        mov)
            echo "🎥 Converting to MOV..."
            ffmpeg -i "$INPUT_FILE" -c:v libx264 -crf 23 -c:a aac -b:a 128k -movflags +faststart "$OUTPUT_FILE" -y
            ;;
        gif)
            echo "🎞️  Converting to optimized GIF..."
            
            # Determine GIF resolution - keep smaller for file size
            if [ "$INPUT_WIDTH" != "null" ] && [ "$INPUT_WIDTH" -gt 640 ]; then
                GIF_WIDTH=640
            elif [ "$INPUT_WIDTH" != "null" ] && [ "$INPUT_WIDTH" -gt 320 ]; then
                GIF_WIDTH=480
            else
                GIF_WIDTH=320
            fi
            
            # Two-pass GIF creation for better quality
            ffmpeg -i "$INPUT_FILE" -vf "fps=15,scale=${GIF_WIDTH}:-1:flags=lanczos,palettegen=stats_mode=diff" -y palette.png
            ffmpeg -i "$INPUT_FILE" -i palette.png -filter_complex "fps=15,scale=${GIF_WIDTH}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "$OUTPUT_FILE" -y
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
