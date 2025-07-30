# Guestbook System Integration Guide

## Overview

The Xalpheric guestbook is a two-part system designed for separation of concerns and independent deployment:

- **Frontend**: Cyberpunk-themed interface in the main site
- **Backend**: Standalone API service with admin workflow

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Experience                         │
├─────────────────────────────────────────────────────────────────┤
│  1. User visits https://xalpheric.neocities.org/guestbook.html │
│  2. JavaScript loads existing entries from API                 │
│  3. User fills form and submits new entry                      │
│  4. API validates, stores, and emails admin                    │
│  5. Admin clicks email button to approve                       │
│  6. Entry appears on guestbook for all visitors                │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐    HTTPS/CORS     ┌─────────────────────┐
│   Frontend UI    │ ◄────────────────► │   Backend API       │
│  (Neocities)     │                    │   (Render.com)      │
│                  │                    │                     │
│ • guestbook.html │                    │ • POST /guestbook   │
│ • guestbook.js   │                    │ • GET /guestbook    │
│ • theme.css      │                    │ • Admin endpoints   │
└──────────────────┘                    └─────────────────────┘
                                                 │
                                                 │ SMTP
                                                 ▼
                                        ┌─────────────────────┐
                                        │   Gmail Service     │
                                        │                     │
                                        │ • Email notifications│
                                        │ • One-click admin   │
                                        │ • Mobile friendly   │
                                        └─────────────────────┘
```

## Frontend Component (Main Site)

### File: `public/guestbook.html`
- **Purpose**: User interface for viewing and submitting guestbook entries
- **Styling**: Cyberpunk theme matching site aesthetic
- **Features**: Form validation, loading states, error handling
- **Dependencies**: `guestbook.js`, `theme.css`

### File: `public/js/guestbook.js`
- **Purpose**: API integration and frontend logic
- **Key Class**: `GuestbookAPI` for all backend communication
- **Features**: AJAX requests, rate limit handling, UI updates
- **Configuration**: `API_BASE_URL` points to deployed API service

### Frontend Features:
```javascript
class GuestbookAPI {
  // Configurable API endpoint
  constructor(apiBaseUrl = 'https://your-api.onrender.com') {
    this.apiBaseUrl = apiBaseUrl;
  }

  // Load and display approved entries
  async loadEntries() {
    const response = await fetch(`${this.apiBaseUrl}/guestbook`);
    // Handles pagination, sorting, display
  }

  // Submit new entry with validation
  async submitEntry(formData) {
    const response = await fetch(`${this.apiBaseUrl}/guestbook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    // Handles success, errors, rate limiting
  }
}
```

## Backend Component (Separate Repository)

### Repository: `xalpheric-guestbook-api`
- **Framework**: Express.js with security middleware
- **Storage**: JSON files (no database required)
- **Email**: Gmail SMTP with HTML templates
- **Security**: Rate limiting, input validation, CORS

### Core Functionality:
```javascript
// Main entry submission flow
app.post('/guestbook', [
  rateLimit,                    // 1 per IP per 15 minutes
  validateInput,                // Email, content validation
  sanitizeContent               // XSS protection
], async (req, res) => {
  // 1. Create entry with pending status
  const entry = {
    id: uuidv4(),
    email: sanitized.email,
    name: sanitized.name,
    comment: sanitized.comment,
    timestamp: new Date().toISOString(),
    approved: false,
    pending: true
  };
  
  // 2. Save to pending.json
  await saveToPendingFile(entry);
  
  // 3. Send admin notification email
  await sendAdminNotification(entry);
  
  // 4. Respond to user
  res.json({ success: true, message: 'Entry submitted for review' });
});
```

### Email Admin System:
```html
<!-- Styled email template with one-click buttons -->
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
  <h2>New Guestbook Entry</h2>
  
  <div>
    <strong>From:</strong> user@example.com<br>
    <strong>Name:</strong> John Doe<br>
    <strong>Comment:</strong> "Great website!"
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://api.onrender.com/admin/approve/123?adminKey=secret&redirect=true"
       style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none;">
      ✅ APPROVE
    </a>
    
    <a href="https://api.onrender.com/admin/reject/123?adminKey=secret&redirect=true"
       style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none;">
      ❌ REJECT
    </a>
    
    <a href="https://api.onrender.com/admin/view/123?adminKey=secret"
       style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none;">
      👀 VIEW DETAILS
    </a>
  </div>
</div>
```

## Integration Points

### 1. CORS Configuration
```javascript
// API allows requests from main site
const corsOptions = {
  origin: [
    'https://xalpheric.neocities.org',  // Production
    'http://localhost:8080',            // Development
    'http://localhost:3000'             // Alternative dev port
  ],
  credentials: false,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
```

### 2. URL Configuration
```javascript
// API automatically detects deployment URL
function getBaseUrl() {
  // Render.com provides RENDER_EXTERNAL_URL
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }
  
  // Manual override for other platforms
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;  
  }
  
  // Local development fallback
  return `http://localhost:${PORT}`;
}
```

### 3. Environment Variables
```bash
# API Service Environment (Render.com)
GMAIL_EMAIL=admin@gmail.com
GMAIL_APP_PASSWORD=app-specific-password
ADMIN_KEY=secure-random-string
ALLOWED_ORIGINS=https://xalpheric.neocities.org

# Auto-provided by Render
RENDER_EXTERNAL_URL=https://service.onrender.com
PORT=10000
NODE_ENV=production
```

## Deployment Workflow

### 1. API Deployment (First)
```bash
# Deploy to Render.com
git clone https://github.com/username/xalpheric-guestbook-api.git
cd xalpheric-guestbook-api

# Configure environment in Render dashboard
# Deploy service -> Get URL: https://your-service.onrender.com
```

### 2. Frontend Configuration
```javascript
// Update API_BASE_URL in public/js/guestbook.js
const API_BASE_URL = 'https://your-service.onrender.com';

// Or use environment detection
const API_BASE_URL = location.hostname === 'localhost' 
  ? 'http://localhost:3001'
  : 'https://your-service.onrender.com';
```

### 3. Main Site Deployment
```bash
# Deploy to Neocities (automatic via git hooks or manual sync)
# Frontend now communicates with deployed API
```

## Testing Integration

### Local Development Test
```bash
# Terminal 1: Start API
cd xalpheric-guestbook-api
npm run dev  # http://localhost:3001

# Terminal 2: Serve frontend
cd xalpheric-neocities
python -m http.server 8080 --directory public

# Test: http://localhost:8080/guestbook.html
```

### Production Test
```bash
# Use integration test script
./test-guestbook-integration.sh

# Manual tests:
# 1. Submit entry -> Check for email notification
# 2. Click approve in email -> Entry appears
# 3. Test rate limiting -> Multiple submissions blocked
# 4. Test CORS -> No errors in browser console
```

## Troubleshooting

### Common Issues:

1. **"Failed to fetch" errors**
   - Check API is deployed and running
   - Verify CORS origins include frontend domain
   - Confirm API_BASE_URL is correct

2. **Rate limiting too aggressive**
   - Adjust rate limit settings in API
   - Clear browser cookies/localStorage
   - Use different IP for testing

3. **Email buttons not working**
   - Verify BASE_URL configuration
   - Check admin key in environment
   - Ensure Gmail app password is correct

4. **Entries not appearing**
   - Check if admin approval is required
   - Look for email notifications
   - Verify entries are being saved to JSON files

### Debug Mode:
```javascript
// Add to guestbook.js for debugging
const DEBUG = location.hostname === 'localhost';

if (DEBUG) {
  console.log('API Base URL:', API_BASE_URL);
  console.log('CORS headers:', response.headers);
  console.log('Response data:', data);
}
```

## Security Considerations

### Frontend Security:
- Input validation before API submission
- No sensitive data stored in browser
- HTTPS enforced by Neocities platform

### API Security:
- Rate limiting prevents spam/abuse
- Input sanitization prevents XSS
- Admin key protects administrative functions
- CORS restricts request origins

### Email Security:
- Gmail app passwords (not main password)
- Admin links expire after use (optional feature)
- Secure admin key in environment variables

## Performance Optimization

### Frontend:
- Lazy loading of entries
- Pagination for large guestbooks
- Minimal JavaScript footprint
- Cached static assets

### API:
- JSON file storage for fast reads
- Rate limiting reduces server load
- Efficient email templates
- Minimal dependencies

This integration enables a secure, scalable guestbook system with professional admin workflow while maintaining the simplicity of static site hosting for the main site.
