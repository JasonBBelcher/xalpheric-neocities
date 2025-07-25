#!/bin/bash

# Clean macOS artifacts script
# Removes .DS_Store and other macOS system files from the repository

echo "🧹 Cleaning macOS artifacts..."

# Find and remove .DS_Store files
DSSTORE_COUNT=$(find . -name ".DS_Store" -type f | wc -l)
if [ $DSSTORE_COUNT -gt 0 ]; then
    echo "📁 Found $DSSTORE_COUNT .DS_Store files - removing..."
    find . -name ".DS_Store" -type f -delete
    echo "✅ Removed .DS_Store files"
else
    echo "✅ No .DS_Store files found"
fi

# Find and remove other macOS artifacts
echo "🔍 Checking for other macOS artifacts..."

# Remove ._ files (resource forks)
RESOURCE_COUNT=$(find . -name "._*" -type f | wc -l)
if [ $RESOURCE_COUNT -gt 0 ]; then
    echo "📄 Found $RESOURCE_COUNT resource fork files - removing..."
    find . -name "._*" -type f -delete
    echo "✅ Removed resource fork files"
fi

# Remove .Trashes
if [ -d "./.Trashes" ]; then
    echo "🗑️  Removing .Trashes directory..."
    rm -rf "./.Trashes"
fi

# Remove .Spotlight-V100
if [ -d "./.Spotlight-V100" ]; then
    echo "🔦 Removing .Spotlight-V100 directory..."
    rm -rf "./.Spotlight-V100"
fi

# Remove Thumbs.db (Windows) and ehthumbs.db
THUMBS_COUNT=$(find . -name "Thumbs.db" -o -name "ehthumbs.db" | wc -l)
if [ $THUMBS_COUNT -gt 0 ]; then
    echo "🖼️  Found thumbnail files - removing..."
    find . -name "Thumbs.db" -o -name "ehthumbs.db" -delete
    echo "✅ Removed thumbnail files"
fi

echo ""
echo "🎉 macOS artifact cleanup complete!"
echo "💡 To prevent future issues, make sure .gitignore is up to date"
