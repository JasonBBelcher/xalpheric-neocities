# Guestbook Integration

## 📝 Overview

The Xalpheric site includes a cyberpunk-themed guestbook that allows visitors to leave messages. The guestbook system has been separated into two parts:

1. **Frontend** (this repository): The HTML/CSS/JS interface in `public/guestbook.html`
2. **Backend API** (separate repository): The server that handles submissions and admin functionality

## 🔗 Guestbook API Repository

The backend API is now maintained as a separate project:

**Repository**: [xalpheric-guestbook-api](https://github.com/YourUsername/xalpheric-guestbook-api)

### Features of the API:
- 🛡️ Spam protection with rate limiting
- 📧 Gmail email notifications with one-click admin buttons
- ✅ Admin approval workflow for all submissions
- 🔒 Security with input validation and CORS protection
- 🚀 Optimized for Render.com deployment
- 📊 JSON file-based storage (no database required)

## 🚀 Quick Setup

### 1. Deploy the API
```bash
# Clone the API repository
git clone https://github.com/YourUsername/xalpheric-guestbook-api.git
cd xalpheric-guestbook-api

# Install dependencies
npm install

# Configure environment (copy .env.example to .env and fill in values)
cp .env.example .env

# Deploy to Render.com (recommended) or run locally
npm start
```

### 2. Update Frontend Configuration
Update the API URL in `public/js/guestbook.js`:

```javascript
// Update this URL to point to your deployed API
const API_BASE_URL = 'https://your-api-service.onrender.com';
```

### 3. Deploy Frontend
The frontend is deployed automatically with the rest of the Xalpheric site to Neocities.

## 🔧 Local Development

For local development, you'll need both the frontend and API running:

### Terminal 1 - API Server
```bash
cd path/to/xalpheric-guestbook-api
npm run dev  # Runs on http://localhost:3001
```

### Terminal 2 - Frontend Server
```bash
cd path/to/xalpheric-neocities
# Serve the public directory (use any static server)
python -m http.server 8080 --directory public
# or
npx serve public -p 8080
```

Then visit: `http://localhost:8080/guestbook.html`

## 📧 Admin Features

The API includes powerful admin features accessible via email:

- 📨 **Instant Email Notifications**: Get notified immediately when someone signs your guestbook
- 🎯 **One-Click Actions**: Approve, reject, or view entries directly from email
- 🛡️ **Spam Protection**: Rate limiting prevents abuse
- 📊 **Admin Dashboard**: View statistics and manage entries

## 🌐 Production Deployment

### Recommended Setup:
- **API**: Deploy to [Render.com](https://render.com) (free tier available)
- **Frontend**: Deploy to [Neocities](https://neocities.org) (part of this site)

### Environment Variables for API:
```bash
GMAIL_EMAIL=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
ADMIN_KEY=your-secure-admin-key
ALLOWED_ORIGINS=https://xalpheric.neocities.org
```

### Benefits of Separation:
- ✅ **Independent Scaling**: API and frontend can be deployed separately
- ✅ **Security**: API runs on secure server with environment variables
- ✅ **Flexibility**: Can use the API with multiple frontends
- ✅ **Maintenance**: Easier to update and maintain each component
- ✅ **Cost Effective**: Frontend deploys free to Neocities, API free tier on Render

## 🧪 Testing

Use the integration test script to verify everything works:

```bash
./test-guestbook-integration.sh
```

This will check:
- API connectivity
- Frontend integration
- Form submission
- Admin functionality

## 🔍 Troubleshooting

### Common Issues:

1. **"API not found" errors**
   - Ensure the API is deployed and running
   - Check the `API_BASE_URL` in `public/js/guestbook.js`

2. **CORS errors**
   - Add your Neocities URL to `ALLOWED_ORIGINS` in the API environment variables

3. **Admin emails not working**
   - Verify Gmail app password setup
   - Check `GMAIL_EMAIL` and `GMAIL_APP_PASSWORD` environment variables

4. **Submissions not appearing**
   - Check if admin approval is required (default: yes)
   - Look for email notifications to approve entries

## 📚 Documentation

Full documentation for the API is available in the separate repository:
- [API Setup Guide](https://github.com/YourUsername/xalpheric-guestbook-api#readme)
- [Deployment Instructions](https://github.com/YourUsername/xalpheric-guestbook-api/blob/main/DEPLOYMENT.md)
- [Gmail Configuration](https://github.com/YourUsername/xalpheric-guestbook-api/blob/main/GMAIL-SETUP.md)
