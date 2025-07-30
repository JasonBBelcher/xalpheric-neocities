# Xalpheric System Knowledge Base

## System Architecture Overview

The Xalpheric digital presence consists of two main components working together:

1. **Main Site** (`xalpheric-neocities`) - Static site with content management
2. **Guestbook API** (`xalpheric-guestbook-api`) - Standalone backend service

```
┌─────────────────────────────────────────────────────────────┐
│                    Xalpheric Ecosystem                     │
├─────────────────────────┬───────────────────────────────────┤
│     Main Site           │        Guestbook API             │
│  (xalpheric-neocities)  │  (xalpheric-guestbook-api)       │
│                         │                                   │
│  Static Files:          │  Backend Services:                │
│  • HTML/CSS/JS          │  • Express.js API                │
│  • Images/Assets        │  • Gmail Email System            │
│  • Music Files          │  • Admin Approval Workflow       │
│  • Blog Content         │  • Rate Limiting & Security      │
│                         │  • JSON File Storage             │
│  Hosted on:             │  Hosted on:                       │
│  🌐 Neocities.org       │  🚀 Render.com                    │
│  (Free Static Hosting)  │  (Free/Paid Backend Hosting)     │
└─────────────────────────┴───────────────────────────────────┘
```

## Component 1: Main Site (xalpheric-neocities)

### Purpose
Static website for Xalpheric's electronic music project with content management, photo processing, and blog functionality.

### Key Features
- **Automated Content Pipeline**: Obsidian → Markdown → HTML blog posts
- **Photo Processing System**: Batch resize, optimize, and deploy images
- **Music Integration**: Audio player with streaming capabilities
- **Gallery System**: Automated photo gallery generation
- **Guestbook Frontend**: Cyberpunk-themed visitor messaging interface

### Technical Stack
- **Frontend**: HTML5, CSS3, JavaScript (vanilla)
- **Build System**: Node.js scripts for content processing
- **Image Processing**: Sharp.js for photo optimization
- **Content Management**: Markdown-based with JSON configuration
- **Deployment**: Automated sync to Neocities platform

### Directory Structure
```
xalpheric-neocities/
├── public/                    # Deployable static files
│   ├── index.html            # Main homepage
│   ├── guestbook.html        # Guestbook frontend
│   ├── gallery.html          # Photo gallery
│   ├── musings.html          # Blog index
│   ├── css/theme.css         # Main stylesheet
│   ├── js/                   # Frontend JavaScript
│   │   ├── main.js           # Core site functionality
│   │   ├── guestbook.js      # API integration for guestbook
│   │   ├── gallery.js        # Photo gallery interactions
│   │   └── audio-player.js   # Music streaming controls
│   ├── assets/               # Images, icons, media
│   ├── music/                # Audio files
│   └── musings/              # Generated blog posts
├── thoughts-and-musings/     # Source Markdown content
├── process_photos/           # Source images for processing
├── obsidian-to-blog.js       # Content pipeline script
├── process-photos.js         # Image optimization script
└── package.json              # Dependencies and scripts
```

### Key Scripts
- `obsidian-to-blog.js`: Converts Markdown to HTML blog posts
- `process-photos.js`: Batch processes and optimizes images
- `build-musings.js`: Generates blog index and navigation
- `sync-obsidian-images.js`: Manages image assets from Obsidian

## Component 2: Guestbook API (xalpheric-guestbook-api)

### Purpose
Standalone backend service providing secure guestbook functionality with admin approval workflow and email notifications.

### Key Features
- **Spam Protection**: Rate limiting (1 submission per IP per 15 minutes)
- **Email Integration**: Gmail notifications with one-click admin buttons
- **Admin Workflow**: Approve/Reject/View entries directly from email
- **Security**: Input validation, sanitization, CORS protection
- **Storage**: JSON file-based (no database required)
- **Deployment Optimized**: Auto-detects hosting environment URLs

### Technical Stack
- **Backend**: Express.js (Node.js)
- **Email**: Nodemailer with Gmail SMTP
- **Security**: Helmet, CORS, Express Rate Limit
- **Validation**: Express Validator, custom sanitization
- **Storage**: fs-extra for JSON file operations
- **Authentication**: Secure admin key system

### API Endpoints
```
Public Endpoints:
├── GET  /health              # Health check
├── GET  /guestbook           # Get approved entries
└── POST /guestbook           # Submit new entry

Admin Endpoints (require ADMIN_KEY):
├── GET    /admin/pending     # Get pending entries
├── POST   /admin/approve/:id # Approve entry
├── POST   /admin/reject/:id  # Reject entry
├── GET    /admin/view/:id    # View entry details
└── GET    /admin/stats       # Get statistics
```

### Environment Configuration
```bash
# Required Variables
GMAIL_EMAIL=admin@gmail.com              # Admin email address
GMAIL_APP_PASSWORD=16-char-app-password  # Gmail app password
ADMIN_KEY=secure-random-key              # Admin authentication
ALLOWED_ORIGINS=https://xalpheric.neocities.org  # CORS origins

# Auto-Detected on Render.com
RENDER_EXTERNAL_URL=https://service.onrender.com  # Auto email URLs
PORT=10000                               # Auto-assigned port
NODE_ENV=production                      # Auto-set environment
```

### Email Admin System
When a guestbook entry is submitted:
1. **Instant Email**: Admin receives styled notification
2. **One-Click Actions**: Email contains buttons for:
   - ✅ **APPROVE**: Instantly publish entry
   - ❌ **REJECT**: Remove from pending
   - 👀 **VIEW DETAILS**: See full entry with admin actions
3. **Secure Links**: All actions authenticated with admin key
4. **Mobile Friendly**: Responsive email templates

## Integration Between Components

### Frontend → API Communication
```javascript
// In public/js/guestbook.js
class GuestbookAPI {
  constructor(apiBaseUrl) {
    // Points to deployed API service
    this.apiBaseUrl = 'https://your-api.onrender.com';
  }
  
  async submitEntry(formData) {
    // Sends POST to /guestbook endpoint
    // Handles rate limiting and validation errors
  }
  
  async loadEntries() {
    // Fetches GET from /guestbook endpoint
    // Displays approved entries only
  }
}
```

### CORS Configuration
```javascript
// API allows requests from main site
const allowedOrigins = [
  'https://xalpheric.neocities.org',  // Production site
  'http://localhost:8080',            // Local development
];
```

### Deployment Architecture
```
User Browser
     │
     ├─→ Static Assets (HTML/CSS/JS/Images)
     │   └─→ Neocities.org (Free hosting)
     │
     └─→ Guestbook API Calls
         └─→ Render.com (Free/Paid hosting)
              └─→ Gmail SMTP (Email notifications)
```

## Development Workflow

### Local Development Setup
```bash
# Terminal 1: Main Site
cd xalpheric-neocities
python -m http.server 8080 --directory public

# Terminal 2: Guestbook API  
cd ../xalpheric-guestbook-api
npm run dev  # Runs on localhost:3001
```

### Content Creation Pipeline
1. **Write**: Create Markdown in `thoughts-and-musings/`
2. **Process**: Run `node obsidian-to-blog.js`
3. **Images**: Add photos to `process_photos/`, run processing script
4. **Build**: Generate blog index with `node build-musings.js`
5. **Deploy**: Push to Neocities via automated sync

### Production Deployment
1. **Main Site**: 
   - Auto-deploys to Neocities on git push
   - Static files served globally via CDN
   
2. **API Service**:
   - Deploy to Render.com from separate GitHub repo
   - Environment variables managed in Render dashboard
   - Auto-scaling and SSL certificates included

## Security Model

### Main Site Security
- **Static Files Only**: No server-side vulnerabilities
- **HTTPS**: Enforced by Neocities platform
- **Content Validation**: Markdown processing sanitized

### API Security
- **Rate Limiting**: Prevents spam and abuse
- **Input Validation**: All submissions validated and sanitized
- **CORS Protection**: Restricts requests to allowed origins
- **Admin Authentication**: Secure key-based admin access
- **Email Security**: Gmail app passwords (not main password)

## Monitoring & Analytics

### API Monitoring
- **Health Checks**: `/health` endpoint for uptime monitoring
- **Admin Stats**: `/admin/stats` provides usage analytics
- **Email Notifications**: Instant alerts for new submissions
- **Error Logging**: Comprehensive server-side logging

### Site Analytics
- **Neocities Stats**: Basic visitor analytics provided
- **Custom Tracking**: Minimal JavaScript-based analytics
- **Performance**: Static site ensures fast loading

## Maintenance & Updates

### Regular Maintenance
- **Content Updates**: Add new blog posts via Markdown
- **Photo Management**: Process and add new gallery images
- **API Updates**: Deploy updates via git push to Render
- **Security**: Rotate Gmail app passwords periodically

### Scaling Considerations
- **Main Site**: No scaling needed (static files)
- **API Service**: Can upgrade Render.com plan for higher traffic
- **Storage**: JSON files suitable for moderate traffic
- **Email**: Gmail has generous daily limits for notifications

## Backup & Recovery

### Main Site Backup
- **Git Repository**: Full version control
- **Neocities**: Platform provides basic backup
- **Local Development**: Complete local copy maintained

### API Backup
- **Code**: Git repository with full history
- **Data**: JSON files can be manually backed up
- **Configuration**: Environment variables documented
- **Email**: Gmail retains all notification history

## Future Enhancements

### Planned Features
- **Database Migration**: PostgreSQL for higher traffic
- **Advanced Admin**: Web-based admin dashboard
- **Analytics Integration**: Enhanced visitor tracking
- **Content API**: Expose blog content via API
- **Social Features**: Enhanced guestbook interactions

### Technical Debt
- **Email Templates**: Could be externalized to template files
- **Error Handling**: Enhanced error recovery mechanisms
- **Testing**: Automated test suite for API endpoints
- **Documentation**: API documentation with Swagger/OpenAPI

---

This knowledge base provides a complete technical overview of the Xalpheric ecosystem, covering both the main site and the guestbook API service, their integration, deployment, and operational considerations.
