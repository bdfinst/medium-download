# Manual Testing Guide

## Prerequisites: Google OAuth Setup

To test the authentication system manually, you need to set up Google OAuth credentials:

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API (required for profile access)

### 2. Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth 2.0 Client IDs**
3. Configure OAuth consent screen if prompted:
   - User Type: **External** (for testing)
   - App name: "Medium Scraper"
   - User support email: your email
   - Developer contact: your email
4. Create OAuth client:
   - Application type: **Desktop application**
   - Name: "Medium Scraper CLI"
5. Download the credentials JSON file

### 3. Set Environment Variables

Create a `.env` file in the project root:

```bash
# Copy these values from your OAuth client credentials
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob
```

**Or** export them in your terminal:

```bash
export GOOGLE_CLIENT_ID="your_client_id_here"
export GOOGLE_CLIENT_SECRET="your_client_secret_here"
export GOOGLE_REDIRECT_URI="urn:ietf:wg:oauth:2.0:oob"
```

## Manual Testing Options

### Option 1: Interactive CLI Test

Run the interactive test script:

```bash
npm run test:manual
```

This will:

1. Check if you're already authenticated
2. If not, start the OAuth flow
3. Open your browser to Google's consent screen
4. Prompt you to enter the authorization code
5. Save tokens and confirm success

### Option 2: Individual Commands

Test specific authentication functions:

```bash
# Check current authentication status
node src/manual-test.js status

# Start authentication flow
node src/manual-test.js auth

# Clear stored tokens
node src/manual-test.js clear
```

### Option 3: Node REPL Testing

Start Node and import the auth module:

```bash
node
```

```javascript
import { createAuthService } from './src/auth.js'

const auth = createAuthService()

// Check if authenticated
const isAuth = await auth.isAuthenticated()
console.log('Authenticated:', isAuth)

// Start authentication
const result = await auth.authenticate()
console.log('Auth result:', result)

// Get detailed status
const status = await auth.getAuthStatus()
console.log('Auth status:', status)
```

## Expected Flow

### First Time Authentication

1. **Run command**: `npm run test:manual`
2. **See output**: "No existing authentication found"
3. **Browser opens**: Google OAuth consent screen
4. **Grant permissions**: Click "Allow"
5. **Copy code**: Authorization code appears in browser
6. **Paste code**: Enter code when prompted in terminal
7. **Success**: "Google OAuth authentication successful!"
8. **Tokens saved**: `.auth-tokens.json` created

### Subsequent Runs

1. **Run command**: `npm run test:manual`
2. **See output**: "Already authenticated - using existing tokens"
3. **Status check**: Shows token expiry and validity

## Troubleshooting

### Common Issues

**"Client ID not found"**

- Check your `.env` file or environment variables
- Ensure OAuth client is created in Google Cloud Console

**"Browser doesn't open"**

- Manual URL will be displayed
- Copy and paste into browser manually

**"Invalid authorization code"**

- Make sure you copied the entire code from browser
- Code expires quickly - retry if needed

**"Access denied"**

- Check OAuth consent screen configuration
- Ensure you're using the correct Google account

### Reset Authentication

If you need to start fresh:

```bash
# Clear stored tokens
node src/manual-test.js clear

# Or manually delete
rm .auth-tokens.json
```

## Token Storage

Tokens are stored in `.auth-tokens.json` with:

- `access_token`: For API requests
- `refresh_token`: For automatic renewal
- `expiry_date`: When token expires
- `scope`: Granted permissions

The system automatically refreshes expired tokens using the refresh token.

## Security Notes

- Tokens are stored locally in `.auth-tokens.json`
- Add `.auth-tokens.json` to `.gitignore`
- Never commit OAuth credentials to version control
- Use environment variables for credentials in production
