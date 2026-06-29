#!/bin/zsh

# Script to organize event photos into separate folders with continuous numbering

cd /Users/jasonbelcher/code/xalpheric-neocities/public/assets

echo "Organizing event photos..."

# Move Day of the Dead images (originally 1-23) to events/day-of-the-dead/
echo "Moving Day of the Dead images..."
counter=1
for i in {1..23}; do
  # Check for both naming conventions
  if [[ -f "midimob${i}.jpg" ]]; then
    new_name="photo-$(printf "%02d" $counter).jpg"
    echo "Moving midimob${i}.jpg → events/day-of-the-dead/${new_name}"
    mv "midimob${i}.jpg" "events/day-of-the-dead/${new_name}"
    counter=$((counter + 1))
  elif [[ -f "midimob-${i}.jpg" ]]; then
    new_name="photo-$(printf "%02d" $counter).jpg"
    echo "Moving midimob-${i}.jpg → events/day-of-the-dead/${new_name}"
    mv "midimob-${i}.jpg" "events/day-of-the-dead/${new_name}"
    counter=$((counter + 1))
  fi
done

# Move Summer Street Jam images (originally 24-50) to events/summer-street-jam/
echo "Moving Summer Street Jam images..."
counter=1
for i in {24..50}; do
  # Check for both naming conventions
  if [[ -f "midimob${i}.jpg" ]]; then
    new_name="photo-$(printf "%02d" $counter).jpg"
    echo "Moving midimob${i}.jpg → events/summer-street-jam/${new_name}"
    mv "midimob${i}.jpg" "events/summer-street-jam/${new_name}"
    counter=$((counter + 1))
  elif [[ -f "midimob-${i}.jpg" ]]; then
    new_name="photo-$(printf "%02d" $counter).jpg"
    echo "Moving midimob-${i}.jpg → events/summer-street-jam/${new_name}"
    mv "midimob-${i}.jpg" "events/summer-street-jam/${new_name}"
    counter=$((counter + 1))
  fi
done

echo "Event photo organization complete!"
echo "Day of the Dead photos: $(ls events/day-of-the-dead/ | wc -l | tr -d ' ')"
echo "Summer Street Jam photos: $(ls events/summer-street-jam/ | wc -l | tr -d ' ')"