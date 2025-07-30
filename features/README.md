# Xalpheric Neocities - Features Documentation

This directory contains comprehensive documentation for all system features and components.

## Core Systems

### [Photo Processing System](photo-processing-system.md)
Complete image processing workflow with dual-mode support for blog content and general assets.
- Automatic image optimization and resizing
- Obsidian-style syntax support
- Seamless blog build integration
- Batch processing capabilities

### [Guestbook API System](guestbook-api-system.md) (Now Separate Project)
**Note: The Guestbook API has been moved to its own repository: [xalpheric-guestbook-api](https://github.com/YourUsername/xalpheric-guestbook-api)**

Headless JSON API for secure guestbook functionality with admin approval workflow.
- Spam protection with rate limiting
- Email notifications via Gmail with one-click admin buttons
- Admin approval system
- Secure API with validation and sanitization
- Optimized for Render.com deployment

## Quick Reference

### Photo Processing
```bash
# Blog images (auto-processing)
npm run build-musings

# Manual blog image processing  
npm run process-blog-photos

# Asset processing
npm run process-asset-photos

# Custom processing
./process-photos-enhanced.sh blog 512 jpg
./process-photos-enhanced.sh assets 1024 png studio{increment}
```

### Guestbook API
```bash
# Navigate to API directory
cd guestbook-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev

# Test API endpoints
npm test
```

### Blog System
```bash
# Build all blog posts
npm run build-musings

# Deploy to Neocities
npm run deploy
```

## Development Workflows

### Adding Blog Posts with Images
1. Place markdown and images in `thoughts-and-musings/`
2. Use `![[image.jpg]]` or `![caption](./image.jpg)` syntax
3. Run `npm run build-musings`
4. Images automatically processed and paths updated

### Processing Asset Images
1. Place images in `process_photos/` folder
2. Run desired processing command
3. Processed images appear in `public/assets/`

### Setting Up Guestbook API
1. Navigate to `guestbook-api/` directory
2. Install dependencies: `npm install`
3. Configure environment variables in `.env`
4. Deploy to your preferred hosting platform
5. Update frontend with your API endpoint URL

## File Organization
```
project-root/
├── features/                      # This documentation
├── guestbook-api/                 # Standalone guestbook API service
├── thoughts-and-musings/          # Blog content + source images
├── process_photos/                # Asset processing queue
├── public/assets/                 # General processed assets
├── public/assets/blog-images/     # Blog-specific processed images
└── public/musings/               # Generated blog HTML files
```
