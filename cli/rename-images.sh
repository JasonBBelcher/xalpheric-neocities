#!/bin/zsh

# Script to rename IMG_*.jpg files to midimob-{number}.jpg format
# Continues numbering from the highest existing midimob file

cd /Users/jasonbelcher/code/xalpheric-neocities/public/assets

# Find the highest numbered midimob file
highest_number=0

# Use ls with globbing to avoid "no matches found" errors
for file in $(ls midimob[0-9]*.jpg 2>/dev/null) $(ls midimob[0-9]*.jpeg 2>/dev/null) $(ls midimob[0-9]*.png 2>/dev/null); do
  if [[ -f "$file" ]]; then
    # Extract number from filename like midimob12.jpg
    number=$(echo "$file" | sed -E 's/midimob([0-9]+)\..*/\1/')
    if [[ $number =~ ^[0-9]+$ ]] && [ "$number" -gt "$highest_number" ]; then
      highest_number=$number
    fi
  fi
done

echo "Highest existing midimob number: $highest_number"

# Start numbering from the next number
counter=$((highest_number + 1))
echo "Starting counter at: $counter"

# Rename IMG_*.jpg files
echo "Looking for IMG_*.jpg files to rename..."
count=0
for file in IMG_*.jpg; do
  if [[ -f "$file" ]]; then
    new_name="midimob-${counter}.jpg"
    echo "Renaming $file → $new_name"
    mv "$file" "$new_name"
    counter=$((counter + 1))
    count=$((count + 1))
  fi
done
echo "Renamed $count files"

echo "Renamed files to continue midimob numbering from ${highest_number}+1"