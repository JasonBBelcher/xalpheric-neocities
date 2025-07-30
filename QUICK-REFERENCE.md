# Xalpheric System Quick Reference

## 🏗️ Two-Component Architecture

```
Main Site (xalpheric-neocities)     Guestbook API (xalpheric-guestbook-api)
├── Static HTML/CSS/JS              ├── Express.js backend
├── Blog content pipeline           ├── Gmail email system  
├── Photo processing               ├── Admin approval workflow
├── Music player                   ├── Rate limiting & security
└── Guestbook frontend            └── JSON file storage

Hosted: Neocities.org             Hosted: Render.com
```

## 🚀 Quick Start Commands

### Main Site Development
```bash
# Serve locally
python -m http.server 8080 --directory public

# Process blog content  
node obsidian-to-blog.js

# Process photos
node process-photos.js

# Build blog index
node build-musings.js
```

### Guestbook API Development
```bash
# Clone API (separate repo)
git clone https://github.com/username/xalpheric-guestbook-api.git

# Install and run
cd xalpheric-guestbook-api
npm install
npm run dev  # http://localhost:3001
```

## 🔗 Key Integration Points

### Frontend → API Communication
```javascript
// In public/js/guestbook.js
const API_BASE_URL = 'https://your-api.onrender.com';

// Load entries: GET /guestbook
// Submit entry: POST /guestbook
```

### CORS Configuration
```javascript
// API allows requests from:
'https://xalpheric.neocities.org'  // Production
'http://localhost:8080'            // Development
```

### Environment Variables (API)
```bash
GMAIL_EMAIL=admin@gmail.com
GMAIL_APP_PASSWORD=16-char-password
ADMIN_KEY=secure-random-key
ALLOWED_ORIGINS=https://xalpheric.neocities.org
```

## 📧 Email Admin Workflow

1. **User submits** guestbook entry → **API receives** and stores as pending
2. **Admin gets email** with one-click buttons: ✅ Approve | ❌ Reject | 👀 View
3. **Admin clicks button** → **Entry approved/rejected** instantly
4. **Approved entries** appear on guestbook for all visitors

## 🌐 Deployment Architecture

```
User Browser
     │
     ├─→ Static Files → Neocities.org (Free)
     └─→ API Calls → Render.com (Free/Paid)
              └─→ Gmail SMTP (Email notifications)
```

## 📚 Documentation Map

- **[SYSTEM-KNOWLEDGE-BASE.md](SYSTEM-KNOWLEDGE-BASE.md)** - Complete technical overview
- **[GUESTBOOK.md](GUESTBOOK.md)** - Guestbook setup guide  
- **[GUESTBOOK-INTEGRATION.md](GUESTBOOK-INTEGRATION.md)** - Integration details
- **[README.md](README.md)** - Main project documentation

## 🔧 Common Commands

```bash
# Test integration
./test-guestbook-integration.sh

# Deploy main site (manual)
# Upload public/ directory to Neocities

# Deploy API
# Push to GitHub → Auto-deploy on Render.com
```

## 🚨 Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| "Failed to fetch" errors | Check API_BASE_URL and CORS configuration |
| Entries not appearing | Check email for admin approval notifications |
| Rate limiting issues | Wait 15 minutes or use different IP |
| Email buttons not working | Verify BASE_URL and ADMIN_KEY environment |

## 📱 Mobile-First Features

- **Responsive guestbook** interface
- **Mobile-friendly** email admin buttons  
- **Touch-optimized** form controls
- **Fast loading** static site delivery

---

*For complete documentation, see the full knowledge base documents linked above.*
