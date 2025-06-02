# Medium Blog Scraper

A Node.js application that scrapes all published blog posts from a Medium profile and downloads them as markdown files with YAML frontmatter metadata.

## Features

- 🔐 **Google OAuth Authentication** - Handles Medium's SSO requirement
- 📄 **Complete Post Export** - Downloads all published posts from any Medium profile
- 🔄 **URL Format Support** - Works with both `medium.com/@username` and `username.medium.com` formats
- 📝 **Markdown Conversion** - Converts HTML content to clean markdown with frontmatter
- 🖼️ **Image Download** - Downloads and organizes all images locally
- 📊 **Rich Metadata** - Captures titles, dates, tags, reading time, claps, and more
- 🏗️ **Organized Output** - Creates structured directory layout for posts and images
- ⚡ **Respectful Scraping** - Includes delays and proper user agents

## Quick Start

```bash
# Install dependencies
npm install

# Authenticate with Google OAuth
npm start auth

# Get a summary of posts (without downloading)
npm start summary https://medium.com/@username

# Scrape all posts from a profile
npm start scrape https://medium.com/@username
```

## Installation

### Prerequisites

- Node.js 16+
- npm or yarn
- Google OAuth credentials (see [Setup Guide](#google-oauth-setup))

### Setup

1. **Clone and install:**

   ```bash
   git clone <repository-url>
   cd medium-scraper
   npm install
   ```

2. **Configure Google OAuth:**

   Create a `.env` file in the project root:

   ```env
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:8080/oauth/callback
   ```

3. **Test the installation:**

   ```bash
   npm test
   npm run quality:check
   ```

## Usage

### CLI Commands

The scraper provides several commands for different operations:

```bash
# Check authentication status
npm start status

# Authenticate with Google OAuth (required first)
npm start auth

# Get profile summary (quick overview without downloading)
npm start summary <profile-url>

# Scrape all posts from a profile (full download)
npm start scrape <profile-url>
```

### Supported URL Formats

The scraper automatically handles both Medium URL formats:

```bash
# Standard Medium format
npm start scrape https://medium.com/@username

# Custom domain format (automatically converted)
npm start scrape https://username.medium.com

# Works with any Medium profile
npm start scrape https://medium.com/@real-username
```

### Example Workflow

1. **First-time setup:**

   ```bash
   npm start auth
   ```

   This opens your browser to authenticate with Google.

2. **Quick preview:**

   ```bash
   npm start summary https://medium.com/@username
   ```

   Shows how many posts will be downloaded without actually downloading them.

3. **Full scrape:**

   ```bash
   npm start scrape https://medium.com/@username
   ```

   Downloads all posts and images to the `output/` directory.

## Output Structure

The scraper creates an organized directory structure:

```
output/
├── posts/
│   ├── post-title-slug.md
│   ├── another-post-slug.md
│   └── ...
├── images/
│   ├── post-title-slug-featured.jpg
│   ├── post-title-slug-01.jpg
│   ├── post-title-slug-02.png
│   └── ...
└── metadata.json
```

### Markdown Format

Each post is saved as markdown with YAML frontmatter:

```yaml
---
title: 'How to Build Amazing Web Apps'
subtitle: 'A comprehensive guide to modern development'
date: '2024-01-15T10:30:00Z'
lastModified: '2024-01-16T14:22:00Z'
author: 'John Developer'
tags: ['javascript', 'web-development', 'tutorial']
featuredImage: './images/post-slug-featured.jpg'
published: true
---
# How to Build Amazing Web Apps

Post content in clean markdown format...

![Local Image](./images/post-slug-01.jpg)
*Caption preserved from original*
```

## Google OAuth Setup

To scrape Medium posts, you need Google OAuth credentials since Medium uses Google SSO.

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API or People API

### 2. Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application**
4. Add authorized redirect URI: `http://localhost:8080/oauth/callback`
5. Download the credentials JSON

### 3. Configure Environment

Create `.env` file with your credentials:

```env
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:8080/oauth/callback
```

## Configuration

### Environment Variables

| Variable               | Description                | Required |
| ---------------------- | -------------------------- | -------- |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID     | Yes      |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes      |
| `GOOGLE_REDIRECT_URI`  | OAuth redirect URI         | Yes      |
| `OUTPUT_DIR`           | Custom output directory    | No       |
| `MAX_SCROLL_ATTEMPTS`  | Max pagination attempts    | No       |

### Customization Options

You can customize the scraping behavior by modifying the options in `src/main.js`:

```javascript
const result = await scraper.scrapeProfile(profileUrl, {
  maxScrollAttempts: 10, // How many times to scroll for more posts
  headless: true, // Run browser in headless mode
  delay: 2000, // Delay between requests (ms)
})
```

## Development

### Project Structure

```
src/
├── auth.js          # Google OAuth handling
├── scraper.js       # Medium content extraction
├── converter.js     # HTML to markdown conversion
├── storage.js       # File system operations
└── main.js          # CLI interface and orchestration

test/
├── acceptance/      # BDD-style acceptance tests
└── unit/           # Unit tests

features/
└── medium-scraper.feature  # Gherkin specifications
```

### Running Tests

```bash
# Run all tests
npm test

# Run acceptance tests only
npm run test:acceptance

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Code Quality

The project enforces strict code quality standards:

```bash
# Check code style and formatting
npm run quality:check

# Auto-fix style issues
npm run quality

# Run linting only
npm run lint

# Run formatting only
npm run format
```

### Code Style

- **No semicolons** (enforced by Prettier)
- **Functional programming** patterns only
- **Arrow functions** exclusively
- **ES modules** (import/export)
- **Comprehensive error handling**

## Troubleshooting

### Common Issues

**Authentication Errors:**

```bash
# Check auth status
npm start status

# Re-authenticate if needed
npm start auth
```

**Empty Results:**

- Verify the Medium profile URL is correct
- Check that the profile has published posts
- Ensure you're authenticated

**Download Failures:**

- Check internet connection
- Verify Google OAuth credentials
- Try running with smaller `maxScrollAttempts`

**Image Download Issues:**

- Some images may be hosted on external CDNs with restrictions
- Check the console output for specific image download errors
- Images that fail to download will be noted in the metadata

### Debug Mode

For detailed logging, you can modify the logger in `src/main.js` or check the output in `output/metadata.json` for detailed operation results.

### Getting Help

1. Check the [troubleshooting section](#troubleshooting)
2. Review the test files in `test/acceptance/` for usage examples
3. Look at the Gherkin scenarios in `features/medium-scraper.feature`
4. Open an issue if you find a bug

## API Usage

You can also use the scraper programmatically:

```javascript
import { createMediumScraper } from './src/main.js'

const scraper = createMediumScraper()

// Authenticate
await scraper.auth.authenticate()

// Get summary
const summary = await scraper.getProfileSummary('https://medium.com/@username')

// Full scrape
const result = await scraper.scrapeProfile('https://medium.com/@username', {
  maxScrollAttempts: 5,
})

console.log(`Scraped ${result.postsSuccessful} posts successfully`)
```

## Limitations

- Requires Google OAuth authentication
- Rate limited to be respectful to Medium's servers
- Some private posts may not be accessible
- Custom Medium domains may have different layouts
- Images hosted on external CDNs may have download restrictions

## License

This project is provided as-is for educational and personal backup purposes. Please respect Medium's Terms of Service and only scrape content you have permission to access.

## Contributing

1. Follow the existing code style (functional programming, no semicolons)
2. Write acceptance tests for new features
3. Ensure all tests pass: `npm test && npm run quality:check`
4. Follow the ATDD (Acceptance Test Driven Development) workflow outlined in `CLAUDE.md`
