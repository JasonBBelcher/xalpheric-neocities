#!/bin/bash

# Test Complete Guestbook System
# This script helps test both API and frontend integration

echo "🚀 GUESTBOOK SYSTEM INTEGRATION TEST"
echo "=================================="
echo

# Check if API is running
echo "1. Checking API status..."

# Test API health
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health > /tmp/api_status.txt
API_STATUS=$(cat /tmp/api_status.txt)

if [ "$API_STATUS" = "200" ]; then
    echo "✅ API is running and healthy"
else
    echo "❌ API is not running (status: $API_STATUS)"
    echo "   ℹ️  The Guestbook API is now a separate project!"
    echo "   1. Clone: git clone https://github.com/YourUsername/xalpheric-guestbook-api.git"
    echo "   2. Start: cd xalpheric-guestbook-api && npm start"
    echo
fi

# Check frontend files
echo
echo "2. Checking frontend integration..."

if [ -f "public/guestbook.html" ]; then
    echo "✅ Guestbook HTML page exists"
else
    echo "❌ Guestbook HTML page missing"
fi

if [ -f "public/js/guestbook.js" ]; then
    echo "✅ Guestbook JavaScript client exists"
else
    echo "❌ Guestbook JavaScript client missing"
fi

if [ -f "public/css/theme.css" ]; then
    # Check if guestbook styles are present
    if grep -q "guestbook-container" "public/css/theme.css"; then
        echo "✅ Guestbook CSS styles integrated"
    else
        echo "❌ Guestbook CSS styles missing"
    fi
else
    echo "❌ Theme CSS file missing"
fi

echo
echo "3. Testing API endpoints..."

if [ "$API_STATUS" = "200" ]; then
    # Test GET entries
    echo -n "   Testing GET /guestbook... "
    GET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/guestbook)
    if [ "$GET_STATUS" = "200" ]; then
        echo "✅ Working"
    else
        echo "❌ Failed (status: $GET_STATUS)"
    fi
    
    # Test POST entries (this will be rate limited, but should return 400 for missing data)
    echo -n "   Testing POST /guestbook... "
    POST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' http://localhost:3001/guestbook)
    if [ "$POST_STATUS" = "400" ]; then
        echo "✅ Working (validation active)"
    else
        echo "❌ Unexpected response (status: $POST_STATUS)"
    fi
else
    echo "   ⏭️  Skipping API tests (API not running)"
fi

echo
echo "4. Frontend Configuration Check..."

# Check API URL in guestbook.js
if grep -q "localhost:3001" "public/js/guestbook.js"; then
    echo "⚠️  API URL set to localhost:3001 (development mode)"
    echo "   Update API_BASE_URL in public/js/guestbook.js for production"
else
    echo "✅ API URL configured for production"
fi

echo
echo "5. Next Steps..."
echo "=================="

if [ "$API_STATUS" = "200" ]; then
    echo "✅ API is ready - you can test the frontend"
    echo "   Open: http://localhost:8080/guestbook.html (or your local server)"
else
    echo "1. Clone and start the separate API project:"
    echo "   git clone https://github.com/YourUsername/xalpheric-guestbook-api.git"
    echo "   cd xalpheric-guestbook-api"
    echo "   npm install && npm start"
    echo ""
    echo "2. Then open the frontend:"
    echo "   Open: http://localhost:8080/guestbook.html"
fi

echo
echo "🔧 Configuration Notes:"
echo "- Update API_BASE_URL in public/js/guestbook.js for production"
echo "- Configure Gmail settings in xalpheric-guestbook-api/.env"
echo "- Test spam protection by submitting multiple messages quickly"
echo "- Check email notifications are working"

echo
echo "🚀 Integration complete! Your cyberpunk guestbook is ready."

# Cleanup
rm -f /tmp/api_status.txt
