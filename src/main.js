#!/usr/bin/env node

import { createAuthService } from './auth.js'
import { createScraperService } from './scraper.js'
import { createPostConverter } from './converter.js'
import { createStorageService } from './storage.js'
import { config } from 'dotenv'

// Load environment variables
config()

// Factory function for creating logger
const createLogger = () => ({
  info: message => console.log(`ℹ️  ${message}`),
  success: message => console.log(`✅ ${message}`),
  warn: message => console.warn(`⚠️  ${message}`),
  error: message => console.error(`❌ ${message}`),
  progress: (current, total, message) => {
    const percentage = Math.round((current / total) * 100)
    console.log(`📊 [${current}/${total}] ${percentage}% - ${message}`)
  },
})

// Factory function for creating the main scraper orchestrator
export const createMediumScraper = (dependencies = {}) => {
  const authService = dependencies.authService || createAuthService()
  const scraperService = dependencies.scraperService || createScraperService()
  const converter = dependencies.converter || createPostConverter()
  const storage = dependencies.storage || createStorageService()
  const logger = dependencies.logger || createLogger()

  // Main scraping workflow
  const scrapeProfile = async (profileUrl, options = {}) => {
    const startTime = Date.now()

    try {
      logger.info('Starting Medium profile scraping...')

      // Step 1: Validate authentication
      logger.info('Checking authentication status...')
      const authStatus = await authService.getAuthStatus()

      if (!authStatus.authenticated) {
        throw new Error(
          'Authentication required. Please run authentication first.'
        )
      }

      logger.success('Authentication verified')

      // Step 2: Initialize output directories
      logger.info('Initializing output directories...')
      const dirResult = await storage.initializeDirectories()
      if (!dirResult.success) {
        throw new Error(dirResult.error)
      }
      logger.success(`Directories created: ${dirResult.directories.output}`)

      // Step 3: Discover all posts
      logger.info(`Discovering posts from ${profileUrl}...`)
      const discoveryResult = await scraperService.discoverPosts(profileUrl, {
        maxScrollAttempts: options.maxScrollAttempts || 10,
      })

      if (!discoveryResult.success) {
        throw new Error(discoveryResult.error)
      }

      const posts = discoveryResult.posts
      logger.success(`Found ${posts.length} posts to process`)

      if (posts.length === 0) {
        logger.warn('No posts found to scrape')
        return {
          success: true,
          postsProcessed: 0,
          postsSuccessful: 0,
          postsFailed: 0,
          duration: Date.now() - startTime,
        }
      }

      // Step 4: Process each post
      let processedCount = 0
      let successCount = 0
      let failureCount = 0
      const results = []

      for (const post of posts) {
        processedCount++
        logger.progress(
          processedCount,
          posts.length,
          `Processing: ${post.title}`
        )

        try {
          // Extract detailed content and metadata
          const contentResult = await scraperService.extractPostContent(
            post.url
          )

          if (!contentResult.success) {
            throw new Error(contentResult.error)
          }

          // Convert HTML to markdown with frontmatter
          const conversionResult = await converter.convertPost(contentResult)

          if (!conversionResult.success) {
            throw new Error(conversionResult.error)
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
            throw new Error(saveResult.error)
          }

          successCount++
          results.push({
            url: post.url,
            title: post.title,
            slug: conversionResult.slug,
            filename: saveResult.markdownFile,
            imagesDownloaded: saveResult.imagesDownloaded || 0,
            postDir: saveResult.postDir,
            success: true,
          })

          logger.success(
            `Saved: ${conversionResult.slug} (${saveResult.imagesDownloaded} images)`
          )
        } catch (error) {
          failureCount++
          logger.error(`Failed to process "${post.title}": ${error.message}`)

          results.push({
            url: post.url,
            title: post.title,
            error: error.message,
            success: false,
          })
        }

        // Add delay between requests to be respectful
        if (processedCount < posts.length) {
          await new Promise(resolve => setTimeout(resolve, 2000))
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
        duration: Date.now() - startTime,
        results,
      }

      await storage.saveMetadata(metadata)

      // Summary
      const duration = Math.round((Date.now() - startTime) / 1000)
      logger.success(`Scraping completed in ${duration} seconds`)
      logger.info(`Results: ${successCount} successful, ${failureCount} failed`)

      return {
        success: true,
        ...metadata,
      }
    } catch (error) {
      logger.error(`Scraping failed: ${error.message}`)

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
      logger.info('Getting profile summary...')

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

      logger.success(`Found ${summaryResult.totalCount} posts`)

      return summaryResult
    } catch (error) {
      logger.error(`Failed to get summary: ${error.message}`)
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
      console.log('')
      console.log('Options:')
      console.log(
        '  --debug                      - Enable debug mode with detailed logging'
      )
      console.log('')
      console.log('Examples:')
      console.log('  node src/main.js scrape https://medium.com/@username')
      console.log('  node src/main.js scrape https://username.medium.com')
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
