#!/usr/bin/env node

import { createAuthService } from './auth.js'
import { createScraperService } from './scraper.js'
import { createPostConverter } from './converter.js'
import { createStorageService } from './storage.js'
import { getCurrentConfig } from './config.js'
import {
  createErrorAwareOperation,
  ScraperError,
  ErrorTypes,
} from './error-handling.js'
import { logger } from './utils.js'
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

  // Main scraping workflow
  const scrapeProfile = async (profileUrl, options = {}) => {
    const startTime = Date.now()

    try {
      loggerInstance.info('Starting Medium profile scraping...')

      // Load configuration
      const config = await getCurrentConfig()
      const incrementalMode = options.incremental || config.resumeEnabled

      // Step 1: Validate authentication
      loggerInstance.info('Checking authentication status...')
      const authStatus = await authService.getAuthStatus()

      if (!authStatus.authenticated) {
        throw new Error(
          'Authentication required. Please run authentication first.'
        )
      }

      loggerInstance.success('Authentication verified')

      // Step 2: Initialize output directories
      loggerInstance.info('Initializing output directories...')
      const dirResult = await storage.initializeDirectories()
      if (!dirResult.success) {
        throw new Error(dirResult.error)
      }
      loggerInstance.success(
        `Directories created: ${dirResult.directories.output}`
      )

      // Step 3: Discover all posts
      loggerInstance.info(`Discovering posts from ${profileUrl}...`)
      const discoveryResult = await scraperService.discoverPosts(profileUrl, {
        maxScrollAttempts: options.maxScrollAttempts || 10,
      })

      if (!discoveryResult.success) {
        throw new Error(discoveryResult.error)
      }

      let posts = discoveryResult.posts
      loggerInstance.success(`Found ${posts.length} posts to process`)

      // Check for incremental mode - only process posts that need updating
      if (incrementalMode) {
        loggerInstance.info('Checking for posts that need updating...')
        const metadataResult = await storage.loadMetadata()

        if (metadataResult.success && metadataResult.metadata) {
          const postsNeedingUpdate = await storage.getPostsNeedingUpdate(
            posts,
            metadataResult.metadata
          )

          const skippedCount = posts.length - postsNeedingUpdate.length
          posts = postsNeedingUpdate

          loggerInstance.info(
            `Incremental mode: ${posts.length} posts need updating, ${skippedCount} skipped`
          )
        } else {
          loggerInstance.info(
            'No previous metadata found, processing all posts'
          )
        }
      }

      if (posts.length === 0) {
        loggerInstance.warn('No posts found to scrape')
        return {
          success: true,
          postsProcessed: 0,
          postsSuccessful: 0,
          postsFailed: 0,
          duration: Date.now() - startTime,
        }
      }

      // Step 4: Process each post with error handling
      let processedCount = 0
      let successCount = 0
      let failureCount = 0
      let skippedCount = 0
      const results = []

      // Create error-aware operation for post processing
      const errorAwareOperation = createErrorAwareOperation({
        retry: {
          maxAttempts: config.retryAttempts || 3,
          baseDelay: config.requestDelay || 2000,
        },
        recovery: {
          skipPrivatePosts: true,
          skipDeletedPosts: true,
          maxConsecutiveFailures: 5,
          onError: (error, consecutiveFailures) => {
            loggerInstance.warn(
              `Error #${consecutiveFailures}: ${error.message}`
            )
          },
        },
      })

      for (const post of posts) {
        processedCount++
        loggerInstance.progress(
          processedCount,
          posts.length,
          `Processing: ${post.title}`
        )

        const result = await errorAwareOperation.execute(async () => {
          // Extract detailed content and metadata
          const contentResult = await scraperService.extractPostContent(
            post.url
          )

          if (!contentResult.success) {
            throw new ScraperError(contentResult.error, ErrorTypes.PARSING)
          }

          // Convert HTML to markdown with frontmatter
          const conversionResult = await converter.convertPost(contentResult)

          if (!conversionResult.success) {
            throw new ScraperError(conversionResult.error, ErrorTypes.PARSING)
          }

          // Save post with images using the new integrated function
          const saveResult = await storage.savePostWithImages(
            {
              ...contentResult,
              slug: conversionResult.slug,
            },
            conversionResult.markdown,
            conversionResult.referencedImages
          )

          if (!saveResult.success) {
            throw new ScraperError(saveResult.error, ErrorTypes.FILE_SYSTEM)
          }

          return {
            url: post.url,
            title: post.title,
            slug: conversionResult.slug,
            filename: saveResult.markdownFile,
            imagesDownloaded: saveResult.imagesDownloaded || 0,
            postDir: saveResult.postDir,
          }
        }, `Post: ${post.title}`)

        // Handle the result from error-aware operation
        if (result.success) {
          successCount++
          results.push({
            ...result.result,
            success: true,
          })

          loggerInstance.success(
            `Saved: ${result.result.slug} (${result.result.imagesDownloaded} images)`
          )
        } else if (result.skipped) {
          skippedCount++
          results.push({
            url: post.url,
            title: post.title,
            skipped: true,
            reason: result.error,
            success: false,
          })
          // No need to log here as error handling already logged the skip
        } else {
          failureCount++
          results.push({
            url: post.url,
            title: post.title,
            error: result.error,
            success: false,
          })
          loggerInstance.error(
            `Failed to process "${post.title}": ${result.error}`
          )
        }

        // Add delay between requests to be respectful
        if (processedCount < posts.length) {
          await new Promise(resolve =>
            setTimeout(resolve, config.requestDelay || 2000)
          )
        }
      }

      // Step 5: Save operation metadata
      const metadata = {
        scrapedAt: new Date().toISOString(),
        profileUrl,
        username: discoveryResult.username,
        totalPostsFound: posts.length,
        postsProcessed: processedCount,
        postsSuccessful: successCount,
        postsFailed: failureCount,
        postsSkipped: skippedCount,
        duration: Date.now() - startTime,
        results,
      }

      await storage.saveMetadata(metadata)

      // Summary
      const duration = Math.round((Date.now() - startTime) / 1000)
      loggerInstance.success(`Scraping completed in ${duration} seconds`)
      loggerInstance.info(
        `Results: ${successCount} successful, ${failureCount} failed, ${skippedCount} skipped`
      )

      return {
        success: true,
        ...metadata,
      }
    } catch (error) {
      loggerInstance.error(`Scraping failed: ${error.message}`)

      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      }
    }
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
  const args = process.argv.slice(2)
  const command = args[0]
  const profileUrl = args[1]

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
        process.exit(1)
      }
      const debugMode = args.includes('--debug')
      await scraper.getProfileSummary(profileUrl, { debug: debugMode })
      break
    }

    case 'scrape': {
      if (!profileUrl) {
        console.error('❌ Profile URL required')
        process.exit(1)
      }
      const debugMode = args.includes('--debug')
      await scraper.scrapeProfile(profileUrl, { debug: debugMode })
      break
    }

    case 'incremental': {
      if (!profileUrl) {
        console.error('❌ Profile URL required')
        process.exit(1)
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
    process.exit(1)
  })
}

export default createMediumScraper
