#!/bin/bash

echo "❌ CORS Test Discontinued"
echo "========================"
echo
echo "The Guestbook API has been moved to a separate repository:"
echo "https://github.com/YourUsername/xalpheric-guestbook-api"
echo
echo "Please run CORS tests from the new API project directory."
echo
echo "To test CORS:"
echo "1. Clone: git clone https://github.com/YourUsername/xalpheric-guestbook-api.git"
echo "2. cd xalpheric-guestbook-api"
echo "3. Run tests from there"
echo "Starting server in development mode..."
node server.js &
SERVER_PID=$!
sleep 3

# Test localhost:8080 origin (should work in development)
echo "Testing localhost:8080 origin (should work in development):"
curl -H "Origin: http://localhost:8080" -H "Access-Control-Request-Method: POST" -X OPTIONS http://localhost:3001/guestbook -s -o /dev/null -w "HTTP Status: %{http_code}\n"

# Stop server
kill $SERVER_PID 2>/dev/null || true
sleep 1

echo
echo "2. Testing PRODUCTION mode..."

# Start in production mode
echo "Starting server in production mode..."
NODE_ENV=production node server.js &
SERVER_PID=$!
sleep 3

# Test localhost:8080 origin (should fail in production)
echo "Testing localhost:8080 origin (should fail in production):"
curl -H "Origin: http://localhost:8080" -H "Access-Control-Request-Method: POST" -X OPTIONS http://localhost:3001/guestbook -s -o /dev/null -w "HTTP Status: %{http_code}\n"

# Test production origin (should work in production)
echo "Testing xalpheric.neocities.org origin (should work in production):"
curl -H "Origin: https://xalpheric.neocities.org" -H "Access-Control-Request-Method: POST" -X OPTIONS http://localhost:3001/guestbook -s -o /dev/null -w "HTTP Status: %{http_code}\n"

# Stop server
kill $SERVER_PID 2>/dev/null || true

echo
echo "🎯 Summary:"
echo "- Development mode: Allows localhost origins for testing"
echo "- Production mode: Only allows production domains for security"
echo "- Use NODE_ENV=production environment variable to enable production mode"
echo "- Use ALLOWED_ORIGINS environment variable to override defaults"
