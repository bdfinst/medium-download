#!/usr/bin/env node

import { createAuthService } from './auth.js'
import { createScraperService } from './scraper/index.js'
import { createPostConverter } from './converter.js'
import { createStorageService } from './storage.js'
import { getCurrentConfig } from './config.js'
import { createScrapePipeline } from './main/pipeline.js'
import { logger } from './utils.js'
import { CLI } from './constants.js'
import { config } from 'dotenv'

// Load environment variables
config()

// Factory function for creating the main scraper orchestrator
export const createMediumScraper = (dependencies = {}) => {
  const authService = dependencies.authService || createAuthService()
  const scraperService = dependencies.scraperService || createScraperService()
  const converter = dependencies.converter || createPostConverter()
  const storage = dependencies.storage || createStorageService()
  const loggerInstance = dependencies.logger || logger

  // Main scraping workflow using pipeline
  const scrapeProfile = async (profileUrl, options = {}) => {
    // Load configuration for pipeline
    const config = await getCurrentConfig()

    // Create pipeline with dependencies
    const pipeline = createScrapePipeline({
      authService,
      scraperService,
      converter,
      storage,
      config,
      logger: loggerInstance,
    })

    return await pipeline.scrapeProfile(profileUrl, options)
  }

  // Quick summary without full scraping
  const getProfileSummary = async (profileUrl, options = {}) => {
    try {
      loggerInstance.info('Getting profile summary...')

      const authStatus = await authService.getAuthStatus()
      if (!authStatus.authenticated) {
        throw new Error('Authentication required')
      }

      const summaryResult = await scraperService.getPostsSummary(
        profileUrl,
        options
      )

      if (!summaryResult.success) {
        throw new Error(summaryResult.error)
      }

      loggerInstance.success(`Found ${summaryResult.totalCount} posts`)

      return summaryResult
    } catch (error) {
      loggerInstance.error(`Failed to get summary: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  return {
    scrapeProfile,
    getProfileSummary,
    auth: authService,
    scraper: scraperService,
    converter,
    storage,
  }
}

// CLI interface when run directly
const runCLI = async () => {
  const args = process.argv.slice(CLI.ARG_OFFSET)
  const command = args[CLI.COMMAND_INDEX]
  const profileUrl = args[CLI.PROFILE_URL_INDEX]

  const scraper = createMediumScraper()

  switch (command) {
    case 'auth': {
      console.log('🔐 Starting authentication...')
      const authResult = await scraper.auth.authenticate()
      console.log(authResult.message)
      break
    }

    case 'summary': {
      if (!profileUrl) {
        console.error('❌ Profile URL required')
        process.exit(CLI.EXIT_ERROR)
      }
      const debugMode = args.includes('--debug')
      await scraper.getProfileSummary(profileUrl, { debug: debugMode })
      break
    }

    case 'scrape': {
      if (!profileUrl) {
        console.error('❌ Profile URL required')
        process.exit(CLI.EXIT_ERROR)
      }
      const debugMode = args.includes('--debug')
      await scraper.scrapeProfile(profileUrl, { debug: debugMode })
      break
    }

    case 'incremental': {
      if (!profileUrl) {
        console.error('❌ Profile URL required')
        process.exit(CLI.EXIT_ERROR)
      }
      const debugMode = args.includes('--debug')
      await scraper.scrapeProfile(profileUrl, {
        debug: debugMode,
        incremental: true,
      })
      break
    }

    case 'status': {
      const status = await scraper.auth.getAuthStatus()
      console.log('Authentication Status:', status)
      break
    }

    default: {
      console.log('📖 Medium Scraper Commands:')
      console.log(
        '  auth                         - Authenticate with Google OAuth'
      )
      console.log(
        '  status                       - Check authentication status'
      )
      console.log('  summary <profile-url>        - Get profile summary')
      console.log(
        '  scrape <profile-url>         - Scrape all posts from profile'
      )
      console.log(
        '  incremental <profile-url>    - Scrape only new/updated posts'
      )
      console.log('')
      console.log('Options:')
      console.log(
        '  --debug                      - Enable debug mode with detailed logging'
      )
      console.log('')
      console.log('Examples:')
      console.log('  node src/main.js scrape https://medium.com/@username')
      console.log('  node src/main.js scrape https://username.medium.com')
      console.log('  node src/main.js incremental https://medium.com/@username')
      console.log(
        '  node src/main.js scrape https://medium.com/@username --debug'
      )
    }
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI().catch(error => {
    console.error('❌ Error:', error.message)
    process.exit(CLI.EXIT_ERROR)
  })
}

export default createMediumScraper
