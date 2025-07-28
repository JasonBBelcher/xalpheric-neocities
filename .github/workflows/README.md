# GitHub Actions Music Deployment

This workflow automatically deploys MP3 files to Neocities when they are added or changed in the repository.

## Setup

### 1. Configure Secrets

Add these secrets to your GitHub repository:

- `NEOCITIES_API_KEY`: Your Neocities API key (required)
- `NEOCITIES_SITENAME`: Your site name on Neocities (optional, used for verification)

To add secrets:
1. Go to your GitHub repository
2. Click Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add the secrets above

### 2. Get Your Neocities API Key

1. Log in to [Neocities](https://neocities.org/)
2. Go to your site settings
3. Find the API key section
4. Copy your API key

## How It Works

### Automatic Triggers

The workflow runs automatically when:
- MP3 files are added/changed in `public/music/`
- The `releases.json` configuration file is updated
- Changes are pushed to the main branch

### Manual Triggers

You can also run the workflow manually with options:
1. Go to Actions tab in your GitHub repository
2. Select "Deploy Music Files" workflow
3. Click "Run workflow"
4. Choose options:
   - **Force deploy**: Upload all MP3 files (not just new ones)
   - **Skip orphan check**: Skip checking for orphaned files

## Features

### 🎵 Smart Deployment
- Only uploads new or changed MP3 files
- Validates `releases.json` configuration
- Rate limiting to respect Neocities API limits

### 🔍 Orphan Detection
- Detects MP3 files not referenced in `releases.json`
- Finds orphaned files on Neocities that should be removed
- Interactive cleanup in local mode, automatic skip in CI

### 🤖 CI-Friendly
- Non-interactive mode for GitHub Actions
- Detailed logging and error reporting
- Deployment summaries

### ⚡ Configuration Validation
- Validates JSON syntax
- Checks for required fields
- Verifies file references

## Workflow Steps

1. **Detect Changes**: Identifies which MP3 files have been modified
2. **Validate Config**: Ensures `releases.json` is valid
3. **Check Orphans**: Finds unreferenced files (unless skipped)
4. **Deploy Files**: Uploads new/changed MP3 files to Neocities
5. **Update Config**: Uploads updated `releases.json` if changed
6. **Verify**: Confirms deployment was successful
7. **Summary**: Reports deployment statistics

## Local Usage

You can also run the deployment script locally:

```bash
# Deploy new/changed files
npm run deploy-music

# Deploy all files (force mode)
node deploy-music.js --force

# Skip orphan checking
node deploy-music.js --skip-orphan-check

# Verbose output
node deploy-music.js --verbose

# Get help
node deploy-music.js --help
```

## Configuration Files

### releases.json
Located at `public/config/releases.json`, this file defines:
- Music releases and metadata
- File paths and names
- Release information

### gallery.json
Located at `public/config/gallery.json`, this file defines:
- Gallery images and metadata
- Categories and descriptions
- Image organization

## Troubleshooting

### Common Issues

1. **API Key Issues**
   - Ensure `NEOCITIES_API_KEY` secret is set correctly
   - Verify the API key is valid and active

2. **File Not Found**
   - Check that MP3 files exist in `public/music/`
   - Verify file names match exactly in `releases.json`

3. **JSON Validation Errors**
   - Use a JSON validator to check syntax
   - Ensure all required fields are present

4. **Rate Limiting**
   - The script includes automatic rate limiting
   - Large uploads may take time due to 1-second delays

### Workflow Logs

Check the GitHub Actions logs for detailed information:
1. Go to Actions tab
2. Click on a workflow run
3. Expand job steps to see detailed logs

## Security

- API keys are stored as encrypted secrets
- No sensitive information is logged
- Rate limiting prevents API abuse
- Validation prevents malformed uploads
