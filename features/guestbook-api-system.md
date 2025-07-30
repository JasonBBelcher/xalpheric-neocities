# Guestbook API System

## Overview
The Guestbook API is a headless JSON API service that provides secure, spam-protected guestbook functionality for the Xalpheric website. It runs independently from Neocities and handles visitor submissions with email notifications and admin approval workflow.

## Architecture

### Core Components
- **Express.js Server**: RESTful API with JSON responses
- **Rate Limiting**: IP-based spam protection (1 submission per 15 minutes)
- **Email Notifications**: Automatic admin notifications via Proton Mail
- **Admin Approval System**: Manual review and approval of all submissions
- **JSON File Storage**: Lightweight file-based data persistence
- **Security Middleware**: Input validation, sanitization, CORS, and Helmet protection

### Data Flow
```
User Submission → Validation → Rate Limit Check → JSON Storage → Email Notification → Admin Approval → Public Display
```

## Features

### 🛡️ Security & Spam Protection
- **Rate Limiting**: 1 submission per IP address every 15 minutes
- **Input Validation**: Email validation, URL validation, length limits
- **XSS Protection**: Input sanitization and escape sequences
- **CORS Configuration**: Configurable allowed origins
- **Helmet Security**: Production-ready security headers

### 📧 Email Integration
- **Proton Mail Support**: Secure email notifications via SMTP
- **Rich HTML Emails**: Formatted notification emails with submission details
- **Admin Instructions**: Direct links and instructions for approval actions
- **Error Handling**: Graceful fallback when email fails

### ✅ Admin Management
- **Approval Workflow**: All submissions require manual approval
- **Admin API Endpoints**: Dedicated admin routes with authentication
- **Statistics Dashboard**: Server stats and submission metrics
- **Pending Queue**: Manage submissions awaiting approval

## API Endpoints

### Public Endpoints

#### GET /health
Health check and server status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 123.45
}
```

#### GET /guestbook
Retrieve all approved guestbook entries.

**Response:**
```json
{
  "success": true,
  "entries": [
    {
      "id": "uuid-here",
      "email": "user@example.com", 
      "name": "User Name",
      "website": "https://example.com",
      "comment": "Great website!",
      "timestamp": "2025-01-01T00:00:00.000Z",
      "approved": true
    }
  ],
  "count": 1
}
```

#### POST /guestbook
Submit a new guestbook entry for approval.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "User Name (optional)",
  "website": "https://example.com (optional)", 
  "comment": "Your comment here (1-1000 characters)"
}
```

**Validation Rules:**
- **Email**: Valid email format, max 255 characters
- **Name**: Optional, max 100 characters
- **Website**: Optional, valid URL with protocol, max 500 characters  
- **Comment**: Required, 1-1000 characters, HTML escaped

**Rate Limiting:** Maximum 1 submission per IP address every 15 minutes.

**Response (Success):**
```json
{
  "success": true,
  "message": "Entry submitted successfully and is pending approval",
  "id": "uuid-here"
}
```

**Response (Rate Limited):**
```json
{
  "error": "Too many submissions. Please wait 15 minutes before submitting again.",
  "retryAfter": 900
}
```

### Admin Endpoints

All admin endpoints require authentication via `X-Admin-Key` header or `adminKey` query parameter.

#### GET /admin/pending
Get all submissions awaiting approval.

**Headers:** `X-Admin-Key: your-admin-key`

**Response:**
```json
{
  "success": true,
  "entries": [
    {
      "id": "uuid-here",
      "email": "user@example.com",
      "name": "User Name",
      "website": "https://example.com", 
      "comment": "Pending comment",
      "timestamp": "2025-01-01T00:00:00.000Z",
      "ipAddress": "192.168.1.1",
      "approved": false,
      "pending": true
    }
  ],
  "count": 1
}
```

#### POST /admin/approve/:id
Approve a pending submission.

**Headers:** `X-Admin-Key: your-admin-key`

**Response:**
```json
{
  "success": true,
  "message": "Entry approved successfully",
  "entry": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "User Name", 
    "comment": "Approved comment"
  }
}
```

#### POST /admin/reject/:id
Reject and remove a pending submission.

**Headers:** `X-Admin-Key: your-admin-key`

**Response:**
```json
{
  "success": true,
  "message": "Entry rejected successfully",
  "entry": {
    "id": "uuid-here",
    "email": "user@example.com"
  }
}
```

#### GET /admin/stats
Get server statistics and metrics.

**Headers:** `X-Admin-Key: your-admin-key`

**Response:**
```json
{
  "success": true,
  "stats": {
    "approvedCount": 25,
    "pendingCount": 3,
    "totalSubmissions": 28,
    "serverUptime": 12345.67,
    "lastApproved": "2025-01-01T00:00:00.000Z"
  }
}
```

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3001

# Email Configuration (Proton Mail)
PROTON_EMAIL=your-email@proton.me
PROTON_PASSWORD=your-app-password

# Admin Authentication
ADMIN_KEY=your-super-secret-admin-key

# CORS Security
ALLOWED_ORIGINS=https://xalpheric.neocities.org,http://localhost:3000

# Optional
NODE_ENV=production
```

### Data Storage

The API uses JSON files for lightweight data persistence:

- **`data/guestbook.json`**: Approved entries visible to public
- **`data/pending.json`**: Submissions awaiting admin approval

**Entry Structure:**
```json
{
  "id": "uuid-v4",
  "email": "user@example.com",
  "name": "User Name",
  "website": "https://example.com",
  "comment": "User's comment", 
  "timestamp": "2025-01-01T00:00:00.000Z",
  "ipAddress": "192.168.1.1",
  "approved": true,
  "pending": false,
  "approvedTimestamp": "2025-01-01T00:05:00.000Z"
}
```

## Frontend Integration

### JavaScript API Client

```javascript
class GuestbookAPI {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
  }

  async submitEntry(formData) {
    const response = await fetch(`${this.apiBaseUrl}/guestbook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    return {
      success: response.ok,
      data: await response.json(),
      status: response.status
    };
  }

  async loadEntries() {
    const response = await fetch(`${this.apiBaseUrl}/guestbook`);
    return {
      success: response.ok,
      data: await response.json()
    };
  }
}

// Usage
const api = new GuestbookAPI('https://your-api-domain.com');
```

### Form Submission Handler

```javascript
document.getElementById('guestbook-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const result = await api.submitEntry({
    email: formData.get('email'),
    name: formData.get('name'),
    website: formData.get('website'),
    comment: formData.get('comment')
  });
  
  if (result.success) {
    showMessage('Entry submitted! Pending approval.');
    e.target.reset();
  } else {
    showError(result.data.error || 'Submission failed.');
  }
});
```

## Deployment Options

### Cloud Platforms
- **Railway**: Auto-deployment from Git repository
- **Heroku**: Traditional PaaS deployment
- **Render**: Modern alternative to Heroku
- **DigitalOcean App Platform**: Managed container deployment

### Self-Hosted (VPS)
```bash
# Install dependencies
npm install
npm install -g pm2

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start with PM2
pm2 start server.js --name guestbook-api
pm2 startup
pm2 save

# Nginx reverse proxy
server {
    listen 80;
    server_name your-api-domain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Email Setup

### Proton Mail Configuration

1. **Create App Password:**
   - Go to Settings → Security → App passwords
   - Create new app password for "Guestbook API"
   - Copy the generated password

2. **Environment Configuration:**
   ```bash
   PROTON_EMAIL=your-email@proton.me
   PROTON_PASSWORD=generated-app-password
   ```

### Email Template

The system sends rich HTML notifications containing:
- **Submission Details**: Email, name, website, comment
- **Metadata**: Timestamp, IP address, submission ID
- **Admin Actions**: Direct instructions for approval/rejection
- **Security Info**: IP address for spam monitoring

## Security Considerations

### Rate Limiting Strategy
- **IP-Based**: Uses client IP address for rate limiting
- **Time Window**: 15-minute sliding window
- **Limit**: 1 submission per IP per window
- **Proxy Support**: Configurable proxy trust for accurate IP detection

### Input Validation & Sanitization
- **Email Validation**: RFC-compliant email format checking
- **URL Validation**: Protocol enforcement and malformed URL rejection
- **XSS Prevention**: HTML escaping for user-generated content
- **Length Limits**: Prevents excessive data submission
- **SQL Injection**: Not applicable (file-based storage)

### Admin Security
- **Secret Key Authentication**: Environment-based admin key
- **No Session Management**: Stateless authentication
- **Admin Endpoint Isolation**: Separate route namespace
- **Audit Trail**: All admin actions logged with timestamps

## Monitoring & Maintenance

### Health Monitoring
```bash
# Health check endpoint
curl https://your-api-domain.com/health

# Response indicates server status
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z", 
  "uptime": 123.45
}
```

### Log Analysis
The server logs all significant events:
- Entry submissions with IP addresses
- Rate limiting violations
- Email sending success/failure
- Admin approval/rejection actions
- Server errors and warnings

### Backup Strategy
```bash
# Backup data files
cp data/guestbook.json backups/guestbook-$(date +%Y%m%d).json
cp data/pending.json backups/pending-$(date +%Y%m%d).json

# Automated backup script
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d-%H%M%S)
tar -czf "$BACKUP_DIR/guestbook-data-$DATE.tar.gz" data/
```

## Testing

### Automated Test Suite
```bash
# Run comprehensive API tests
npm test

# Tests include:
# - Health check verification
# - Entry submission workflow
# - Rate limiting enforcement
# - Admin approval process
# - Error handling scenarios
```

### Manual Testing Checklist
- [ ] Submit valid guestbook entry
- [ ] Verify rate limiting (second submission blocked)
- [ ] Check email notification received
- [ ] Test admin approval workflow
- [ ] Verify approved entry appears publicly
- [ ] Test form validation (invalid email, long comment)
- [ ] Verify CORS headers for frontend domain

## Troubleshooting

### Common Issues

**Email notifications not sending:**
- Verify Proton Mail credentials in environment variables
- Check if app password is correctly generated
- Review server logs for SMTP connection errors

**Rate limiting not working:**
- Ensure server is behind proper proxy with IP forwarding
- Check `trust proxy` configuration in Express
- Verify client IP addresses in logs

**CORS errors in browser:**
- Add frontend domain to `ALLOWED_ORIGINS` environment variable
- Check browser developer tools for specific CORS error details
- Verify API domain is accessible from frontend

**Admin authentication failing:**
- Confirm `ADMIN_KEY` environment variable is set
- Check admin key matches in requests (case-sensitive)
- Verify header format: `X-Admin-Key: your-key`

### Debug Mode
```bash
# Enable detailed logging
DEBUG=express:* npm start

# Or set NODE_ENV for development
NODE_ENV=development npm start
```
