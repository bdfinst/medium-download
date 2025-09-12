import { google } from 'googleapis'
import { promises as fs, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'
import { CONTENT, NETWORK } from './constants.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Factory function for creating browser launcher
const createBrowserLauncher = () => ({
  launch: async url => {
    const { default: open } = await import('open')
    await open(url)
    return true
  },
})

// Factory function for creating token storage
const createTokenStorage = () => {
  const tokenPath = path.join(__dirname, '..', '.auth-tokens.json')

  return {
    exists: () => {
      try {
        return existsSync(tokenPath)
      } catch {
        return false
      }
    },

    save: async tokens => {
      try {
        await fs.writeFile(tokenPath, JSON.stringify(tokens, null, CONTENT.JSON_INDENT))
        return true
      } catch (error) {
        throw new Error(`Failed to save tokens: ${error.message}`)
      }
    },

    load: async () => {
      try {
        if (!existsSync(tokenPath)) {
          return null
        }
        const data = await fs.readFile(tokenPath, 'utf8')
        return JSON.parse(data)
      } catch (error) {
        throw new Error(`Failed to load tokens: ${error.message}`)
      }
    },
  }
}

// Factory function for creating OAuth client
const createOAuthClient = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || 'test-client-id',
    process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret',
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback'
  )

  return {
    generateAuthUrl: options => oauth2Client.generateAuthUrl(options),
    getToken: async code => oauth2Client.getToken(code),
    setCredentials: tokens => oauth2Client.setCredentials(tokens),
    getAccessToken: () => oauth2Client.getAccessToken(),
  }
}

// Factory function for creating readline interface
const createReadlineInterface = () => {
  return {
    question: prompt =>
      new Promise(resolve => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        })

        rl.question(prompt, answer => {
          rl.close()
          resolve(answer.trim())
        })
      }),
  }
}

// Main factory function for authentication service
export const createAuthService = (dependencies = {}) => {
  const browserLauncher =
    dependencies.browserLauncher || createBrowserLauncher()
  const tokenStorage = dependencies.tokenStorage || createTokenStorage()
  const oauthClient = dependencies.oauthClient || createOAuthClient()
  const readline = dependencies.readline || createReadlineInterface()

  const SCOPES = ['email', 'profile']

  // Check if current tokens are valid
  const isAuthenticated = async () => {
    try {
      if (!tokenStorage.exists()) {
        return false
      }

      const tokens = await tokenStorage.load()
      if (!tokens || !tokens.access_token) {
        return false
      }

      // Check if token is expired
      if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
        // Try to refresh token
        if (tokens.refresh_token) {
          return await refreshToken(tokens.refresh_token)
        }
        return false
      }

      return true
    } catch {
      return false
    }
  }

  // Refresh expired access token
  const refreshToken = async refreshToken => {
    try {
      oauthClient.setCredentials({ refresh_token: refreshToken })
      const { credentials } = await oauthClient.getAccessToken()

      if (credentials.access_token) {
        await tokenStorage.save(credentials)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // Perform initial OAuth authentication flow
  const authenticate = async () => {
    try {
      // Check if already authenticated
      if (await isAuthenticated()) {
        return {
          success: true,
          message: 'Already authenticated - using existing tokens',
        }
      }

      // Generate authorization URL
      const authUrl = oauthClient.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      })

      // Open browser for user authorization
      await browserLauncher.launch(authUrl)

      // Prompt user for authorization code
      const code = await readline.question(
        'Enter the authorization code from your browser: '
      )

      if (!code) {
        throw new Error('Authorization code is required')
      }

      // Exchange code for tokens
      const { tokens } = await oauthClient.getToken(code)

      // Store tokens securely
      await tokenStorage.save(tokens)

      // Set credentials for future use
      oauthClient.setCredentials(tokens)

      return {
        success: true,
        message:
          'Google OAuth authentication successful! Tokens saved securely.',
      }
    } catch (error) {
      return {
        success: false,
        message: `Authentication failed: ${error.message}`,
      }
    }
  }

  // Get current authentication status
  const getAuthStatus = async () => {
    const authenticated = await isAuthenticated()
    const tokens = authenticated ? await tokenStorage.load() : null

    return {
      authenticated,
      hasTokens: tokenStorage.exists(),
      expiryDate: tokens?.expiry_date || null,
    }
  }

  // Clear stored authentication
  const clearAuth = async () => {
    try {
      const tokenPath = path.join(__dirname, '..', '.auth-tokens.json')
      await fs.unlink(tokenPath)
      return { success: true, message: 'Authentication cleared' }
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear auth: ${error.message}`,
      }
    }
  }

  return {
    authenticate,
    isAuthenticated,
    refreshToken,
    getAuthStatus,
    clearAuth,
  }
}

// Default export for convenience
export default createAuthService
