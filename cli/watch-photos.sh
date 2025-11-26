#!/bin/bash

# Xalpheric Photos Watcher
# Automatically monitors macOS Photos app for media tagged with #xalpheric

echo "📸 Xalpheric Photos Watcher"
echo "=========================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "💡 Install Node.js from: https://nodejs.org/"
    exit 1
fi

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script only works on macOS"
    echo "💡 The Photos app integration requires macOS"
    exit 1
fi

# Make scripts executable
chmod +x watch-photos.js
chmod +x watch-photos-applescript.js

echo "🎯 Available methods:"
echo ""
echo "1) AppleScript Method (Recommended)"
echo "   - Uses Photos app keywords/albums"
echo "   - More reliable and user-friendly"
echo "   - Requires Photos app permissions"
echo ""
echo "2) Database Method (Advanced)"
echo "   - Direct database access"
echo "   - May require additional setup"
echo "   - More technical but potentially faster"
echo ""

read -p "Which method would you like to use? (1 or 2): " method

case $method in
    1)
        echo ""
        echo "🚀 Starting AppleScript method..."
        echo "💡 Tag your photos with 'xalpheric' keyword or add them to 'xalpheric' album"
        echo ""
        node watch-photos-applescript.js
        ;;
    2)
        echo ""
        echo "🚀 Starting Database method..."
        echo "💡 This method looks for '#xalpheric' in photo captions/titles"
        echo ""
        node watch-photos.js
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac
