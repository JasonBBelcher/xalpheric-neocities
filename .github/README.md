# Assets Deployment to Neocities

This GitHub Action automatically detects changes to files in the `public/assets/` directory and uploads only new or modified files to your Neocities site.

## Setup Instructions

### 1. Add Your Neocities API Key as a GitHub Secret

1. Go to your GitHub repository
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NEOCITIES_API_KEY`
5. Value: Your Neocities API key (get it from https://neocities.org/api or by running the command in your build_and_deploy.js)

### 2. How It Works

The action will automatically trigger when:
- You push changes to the `main` branch
- The changes include files in the `public/assets/` directory

It will:
1. Compare local asset files with remote files using SHA1 hashes
2. Only upload files that are new or have changed
3. Preserve the directory structure in the `assets/` folder on Neocities
4. Provide detailed logging of what was uploaded

### 3. Manual Triggering

You can also manually trigger the deployment by:
1. Going to **Actions** tab in your GitHub repository
2. Selecting **Deploy Assets to Neocities** workflow
3. Clicking **Run workflow**

### 4. What Gets Uploaded

- All files in `public/assets/` and its subdirectories
- Files are uploaded to the `assets/` directory on your Neocities site
- Directory structure is preserved (e.g., `public/assets/images/photo.jpg` → `assets/images/photo.jpg`)

### 5. Rate Limiting

The script includes:
- 1-second delays between uploads to respect API rate limits
- Retry logic for failed uploads
- Detailed error reporting

### 6. Monitoring

Check the **Actions** tab in your GitHub repository to see:
- Which files were uploaded
- Upload success/failure status
- Detailed logs of the deployment process

## Example Output

```
🔍 Checking for asset changes to deploy...
📂 Scanning local assets...
📋 Found 8 local asset files
🌐 Fetching remote assets list...
📤 Found 3 files to upload:
   🆕 NEW: IMG_1876.jpg
   🆕 NEW: IMG_1877.jpg
   🔄 UPDATED: logo.png
📤 Uploading 1/3: IMG_1876.jpg
✅ Successfully uploaded: IMG_1876.jpg
📤 Uploading 2/3: IMG_1877.jpg
✅ Successfully uploaded: IMG_1877.jpg
📤 Uploading 3/3: logo.png
✅ Successfully uploaded: logo.png

📊 Upload Summary:
✅ Successful uploads: 3
❌ Failed uploads: 0
📋 Total files: 3

🎉 All assets deployed successfully!
```

## Troubleshooting

- **API Key Issues**: Make sure your `NEOCITIES_API_KEY` secret is set correctly
- **File Not Found**: Ensure files are in the `public/assets/` directory
- **Upload Failures**: Check the Actions logs for detailed error messages
- **Rate Limiting**: The script automatically handles rate limiting with delays
