#!/usr/bin/env node

import { createAuthService } from './auth.js'
import { config } from 'dotenv'

// Load environment variables from .env file
config()

const displayBanner = () => {
  console.log('🔐 Medium Scraper - Authentication Test')
  console.log('=====================================\n')
}

const displayStatus = status => {
  console.log('📊 Authentication Status:')
  console.log(`   Authenticated: ${status.authenticated ? '✅ Yes' : '❌ No'}`)
  console.log(`   Has Tokens: ${status.hasTokens ? '✅ Yes' : '❌ No'}`)

  if (status.expiryDate) {
    const expiry = new Date(status.expiryDate)
    const now = new Date()
    const isExpired = expiry <= now
    console.log(
      `   Token Expiry: ${expiry.toLocaleString()} ${isExpired ? '⚠️ EXPIRED' : '✅ Valid'}`
    )
  } else {
    console.log('   Token Expiry: ❌ Not available')
  }
  console.log()
}

const testAuthentication = async () => {
  displayBanner()

  try {
    const auth = createAuthService()

    // Check current status
    console.log('🔍 Checking current authentication status...\n')
    const status = await auth.getAuthStatus()
    displayStatus(status)

    if (status.authenticated) {
      console.log('✅ You are already authenticated!')
      console.log('💡 Run with "clear" argument to reset authentication\n')
      return
    }

    // Start authentication flow
    console.log('🚀 Starting authentication flow...\n')
    console.log('📋 This will:')
    console.log('   1. Open your browser to Google OAuth')
    console.log('   2. Ask you to grant permissions')
    console.log('   3. Provide an authorization code')
    console.log('   4. Store tokens securely\n')

    console.log('🌐 Opening browser for authentication...')
    const result = await auth.authenticate()

    console.log('\n📄 Authentication Result:')
    console.log(`   Success: ${result.success ? '✅' : '❌'}`)
    console.log(`   Message: ${result.message}\n`)

    if (result.success) {
      console.log('🎉 Authentication completed successfully!')
      console.log('💾 Tokens saved to .auth-tokens.json')

      // Display final status
      const finalStatus = await auth.getAuthStatus()
      console.log('\n📊 Final Status:')
      displayStatus(finalStatus)
    } else {
      console.log('❌ Authentication failed!')
      console.log('💡 Check the troubleshooting section in MANUAL_TESTING.md')
    }
  } catch (error) {
    console.error('💥 Error during authentication test:')
    console.error(`   ${error.message}\n`)
    console.log('💡 Common issues:')
    console.log(
      '   - Missing environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)'
    )
    console.log('   - Invalid OAuth credentials')
    console.log('   - Network connectivity issues')
    console.log('\n📖 See MANUAL_TESTING.md for setup instructions')
  }
}

const checkStatus = async () => {
  displayBanner()

  try {
    const auth = createAuthService()
    const status = await auth.getAuthStatus()
    displayStatus(status)

    if (status.authenticated) {
      console.log('✅ Ready to scrape Medium posts!')
    } else {
      console.log('❌ Authentication required')
      console.log('💡 Run: npm run test:manual')
    }
  } catch (error) {
    console.error('💥 Error checking status:', error.message)
  }
}

const clearAuth = async () => {
  displayBanner()

  try {
    const auth = createAuthService()
    const result = await auth.clearAuth()

    console.log('🗑️  Authentication Clear Result:')
    console.log(`   Success: ${result.success ? '✅' : '❌'}`)
    console.log(`   Message: ${result.message}\n`)

    if (result.success) {
      console.log('✅ Authentication cleared successfully!')
      console.log('💡 Run authentication again with: npm run test:manual')
    }
  } catch (error) {
    console.error('💥 Error clearing authentication:', error.message)
  }
}

const showHelp = () => {
  displayBanner()
  console.log('🛠️  Available Commands:')
  console.log('   npm run test:manual        - Interactive authentication test')
  console.log('   node src/manual-test.js    - Same as above')
  console.log('   node src/manual-test.js status - Check authentication status')
  console.log('   node src/manual-test.js clear  - Clear stored tokens')
  console.log('   node src/manual-test.js help   - Show this help\n')
  console.log('📖 For setup instructions, see: MANUAL_TESTING.md')
}

// Parse command line arguments
const command = process.argv[2]

switch (command) {
  case 'status':
    await checkStatus()
    break
  case 'clear':
    await clearAuth()
    break
  case 'help':
    showHelp()
    break
  case undefined:
    await testAuthentication()
    break
  default:
    console.log(`❌ Unknown command: ${command}`)
    showHelp()
}
