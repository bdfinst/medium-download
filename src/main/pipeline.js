// Main scraping pipeline composed of smaller functions

import { validateAuthentication } from './authentication.js'
import { initializeOutputDirectories } from './initialization.js'
import {
  discoverPostsWithRetry,
  filterPostsForIncremental,
} from './post-discovery.js'
import { createPostProcessor } from './post-processing.js'
import { processBatch } from './batch-processing.js'
import { saveScrapingMetadata } from './metadata.js'

// Compose the main scraping pipeline from smaller functions
export const createScrapePipeline = ({
  authService,
  scraperService,
  converter,
  storage,
  config,
  logger,
}) => {
  const postProcessor = createPostProcessor({
    scraperService,
    converter,
    storage,
  })

  const scrapeProfile = async (profileUrl, options = {}) => {
    const startTime = Date.now()

    try {
      logger.info('Starting Medium profile scraping...')

      const incrementalMode = options.incremental || config.resumeEnabled

      // Step 1: Validate authentication
      logger.info('Checking authentication status...')
      await validateAuthentication(authService)
      logger.success('Authentication verified')

      // Step 2: Initialize output directories
      logger.info('Initializing output directories...')
      const directories = await initializeOutputDirectories(storage)
      logger.success(`Directories created: ${directories.output}`)

      // Step 3: Discover all posts
      logger.info(`Discovering posts from ${profileUrl}...`)
      const discoveryResult = await discoverPostsWithRetry(
        scraperService,
        profileUrl,
        {
          maxScrollAttempts: options.maxScrollAttempts || 10,
        }
      )

      let posts = discoveryResult.posts
      logger.success(`Found ${posts.length} posts to process`)

      // Step 4: Filter posts for incremental mode
      if (incrementalMode) {
        logger.info('Checking for posts that need updating...')
        const { posts: filteredPosts, skippedCount } =
          await filterPostsForIncremental(posts, storage, incrementalMode)

        posts = filteredPosts
        logger.info(
          `Incremental mode: ${posts.length} posts need updating, ${skippedCount} skipped`
        )
      }

      if (posts.length === 0) {
        logger.warn('No posts found to scrape')
        return createEmptyResult(startTime)
      }

      // Step 5: Process posts in batch
      const batchResult = await processBatch(
        posts,
        postProcessor,
        config,
        logger
      )

      // Step 6: Save operation metadata
      const metadata = await saveScrapingMetadata(storage, {
        profileUrl,
        username: discoveryResult.username,
        totalPostsFound: posts.length,
        ...batchResult,
        duration: Date.now() - startTime,
      })

      // Summary
      const duration = Math.round((Date.now() - startTime) / 1000)
      logger.success(`Scraping completed in ${duration} seconds`)
      logger.info(
        `Results: ${batchResult.successCount} successful, ${batchResult.failureCount} failed, ${batchResult.skippedCount} skipped`
      )

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

  return { scrapeProfile }
}

const createEmptyResult = startTime => ({
  success: true,
  postsProcessed: 0,
  postsSuccessful: 0,
  postsFailed: 0,
  duration: Date.now() - startTime,
})

export default createScrapePipeline
