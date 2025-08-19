// Functional pipeline for the Medium Scraper main workflow
import { pipeAsync, Result } from '../utils/functional.js'
import { createErrorHandlingService } from '../error-handling.js'

// Pipeline stage factories - each returns a function that takes context and returns updated context
export const createAuthenticationStage =
  (authService, logger) => async context => {
    logger.info('Checking authentication status...')

    const authStatus = await authService.getAuthStatus()

    if (!authStatus.authenticated) {
      return Result.error(
        'Authentication required. Please run authentication first.'
      )
    }

    logger.success('Authentication verified')

    return Result.ok({
      ...context,
      authenticated: true,
      authStatus,
    })
  }

export const createDirectoryInitStage = (storage, logger) => async context => {
  logger.info('Initializing output directories...')

  const dirResult = await storage.initializeDirectories()

  if (!dirResult.success) {
    return Result.error(dirResult.error)
  }

  logger.success(`Directories created: ${dirResult.directories.output}`)

  return Result.ok({
    ...context,
    outputDir: dirResult.directories.output,
    directories: dirResult.directories,
  })
}

export const createPostDiscoveryStage =
  (scraperService, logger) => async context => {
    logger.info(`Discovering posts from ${context.profileUrl}...`)

    const discoveryResult = await scraperService.discoverPosts(
      context.profileUrl,
      {
        maxScrollAttempts: context.options.maxScrollAttempts || 10,
      }
    )

    if (!discoveryResult.success) {
      return Result.error(`Failed to discover posts: ${discoveryResult.error}`)
    }

    if (discoveryResult.posts.length === 0) {
      logger.warn('No posts found on this profile')
      return Result.ok({
        ...context,
        posts: [],
        totalPosts: 0,
        completed: true,
      })
    }

    logger.success(
      `Found ${discoveryResult.posts.length} posts by ${discoveryResult.username}`
    )

    return Result.ok({
      ...context,
      posts: discoveryResult.posts,
      totalPosts: discoveryResult.posts.length,
      username: discoveryResult.username,
    })
  }

export const createIncrementalFilterStage =
  (storage, logger) => async context => {
    if (!context.options.incremental) {
      return Result.ok(context)
    }

    logger.info('Filtering posts for incremental processing...')

    // Get existing metadata to determine which posts are already processed
    const existingPosts = await storage.getExistingPostSlugs(context.outputDir)

    const newPosts = context.posts.filter(post => {
      const slug = storage.generateSlug(post.title)
      return !existingPosts.includes(slug)
    })

    if (newPosts.length === 0) {
      logger.info('No new posts to process (all posts already exist)')
      return Result.ok({
        ...context,
        posts: [],
        skippedCount: context.posts.length,
        completed: true,
      })
    }

    logger.info(
      `Found ${newPosts.length} new posts (${context.posts.length - newPosts.length} already exist)`
    )

    return Result.ok({
      ...context,
      posts: newPosts,
      skippedCount: context.posts.length - newPosts.length,
    })
  }

export const createPostProcessingStage =
  (scraperService, converter, storage, logger) => async context => {
    if (context.posts.length === 0) {
      return Result.ok(context)
    }

    logger.info(`Processing ${context.posts.length} posts...`)

    // Create centralized error handling service
    const errorHandler = createErrorHandlingService({
      logErrors: false, // We'll handle logging ourselves for better context
      throwOnCritical: false,
      enableRetry: true,
    })

    const processPost = async (post, index) => {
      const postNum = index + 1
      const totalPosts = context.posts.length
      const postContext = `Post ${postNum}/${totalPosts}: ${post.title}`

      logger.progress(postNum, totalPosts, `Processing: ${post.title}`)

      // Extract individual post content with centralized error handling
      const extractResult = await errorHandler.handleWithRecovery(
        () =>
          scraperService.extractPostContent(post.url, {
            debug: context.options.debug,
          }),
        `${postContext} - Extract content`,
        { skipOnNotFound: true, skipOnForbidden: true, fallbackValue: null }
      )

      if (extractResult.isError) {
        throw extractResult.error
      }

      const extractData = extractResult.value
      if (!extractData) {
        throw new Error(
          'Content extraction returned null (likely private/deleted post)'
        )
      }

      if (!extractData.success) {
        throw new Error(extractData.error)
      }

      // Convert to markdown with error handling
      const convertResult = await errorHandler.safeAsync(
        () =>
          converter.convertToMarkdown(
            extractData.content,
            extractData.metadata,
            post.title
          ),
        `${postContext} - Convert to markdown`
      )

      if (convertResult.isError) {
        throw convertResult.error
      }

      const convertData = convertResult.value
      if (!convertData.success) {
        throw new Error(convertData.error)
      }

      // Save post with images with error handling
      const saveResult = await errorHandler.safeAsync(
        () =>
          storage.savePostWithImages(
            extractData.metadata,
            convertData.markdown,
            convertData.referencedImages
          ),
        `${postContext} - Save to filesystem`
      )

      if (saveResult.isError) {
        throw saveResult.error
      }

      const saveData = saveResult.value
      if (!saveData.success) {
        throw new Error(saveData.error)
      }

      return {
        url: post.url,
        title: post.title,
        success: true,
        filePath: saveData.markdownFile,
        imagesCount: saveData.imagesDownloaded,
      }
    }

    // Process posts with batch error handling
    const batchResult = await errorHandler.batchProcess(
      context.posts,
      processPost,
      {
        concurrency: 1,
        stopOnError: false,
        context: 'Post processing',
      }
    )

    if (batchResult.isError) {
      return Result.error(batchResult.error.message)
    }

    const batchData = batchResult.value
    const results = [
      ...batchData.results.map(r => r.result),
      ...batchData.errors.map(e => ({
        url: e.item.url,
        title: e.item.title,
        success: false,
        error: e.error.message,
      })),
    ]

    // Log individual failures
    batchData.errors.forEach(e => {
      logger.error(`Failed to process "${e.item.title}": ${e.error.message}`)
    })

    return Result.ok({
      ...context,
      results,
      successful: batchData.successful,
      failed: batchData.failed,
    })
  }

export const createMetadataSavingStage = (storage, logger) => async context => {
  if (!context.results || context.results.length === 0) {
    return Result.ok(context)
  }

  logger.info('Saving processing metadata...')

  const metadata = {
    profileUrl: context.profileUrl,
    username: context.username,
    processedAt: new Date().toISOString(),
    totalPostsFound: context.totalPosts || 0,
    postsProcessed: context.successful || 0,
    postsFailed: context.failed || 0,
    postsSkipped: context.skippedCount || 0,
    results: context.results,
  }

  try {
    await storage.saveMetadata(metadata, context.directories.output)
    logger.success('Processing metadata saved')
  } catch (error) {
    logger.warn(`Failed to save metadata: ${error.message}`)
  }

  return Result.ok({
    ...context,
    metadata,
  })
}

export const createResultFormattingStage = logger => async context => {
  const endTime = Date.now()
  const duration = endTime - context.startTime

  const result = {
    success: true,
    profileUrl: context.profileUrl,
    username: context.username || 'Unknown',
    totalPosts: context.totalPosts || 0,
    processed: context.successful || 0,
    failed: context.failed || 0,
    skipped: context.skippedCount || 0,
    duration: Math.round(duration / 1000),
    outputDirectory: context.directories?.output,
    results: context.results || [],
  }

  // Log summary
  logger.success('✅ Scraping completed successfully!')
  logger.info(`📊 Summary:`)
  logger.info(`   👤 Profile: ${result.username}`)
  logger.info(`   📝 Posts found: ${result.totalPosts}`)
  logger.info(`   ✅ Successfully processed: ${result.processed}`)
  logger.info(`   ❌ Failed: ${result.failed}`)
  logger.info(`   ⏭️  Skipped (already exist): ${result.skipped}`)
  logger.info(`   ⏱️  Duration: ${result.duration}s`)
  logger.info(`   📁 Output: ${result.outputDirectory}`)

  return Result.ok(result)
}

// Main pipeline composition
export const createScrapingPipeline = dependencies => {
  const { authService, scraperService, converter, storage, logger } =
    dependencies

  return pipeAsync(
    // Input validation happens here
    context => {
      if (!context.profileUrl) {
        return Result.error('Profile URL is required')
      }
      return Result.ok({ ...context, startTime: Date.now() })
    },

    // Main pipeline stages
    createAuthenticationStage(authService, logger),
    createDirectoryInitStage(storage, logger),
    createPostDiscoveryStage(scraperService, logger),
    createIncrementalFilterStage(storage, logger),
    createPostProcessingStage(scraperService, converter, storage, logger),
    createMetadataSavingStage(storage, logger),
    createResultFormattingStage(logger)
  )
}

// Error handling wrapper for the entire pipeline
export const createSafePipeline = (pipeline, logger) => async context => {
  try {
    const result = await pipeline(context)

    if (result.isError) {
      logger.error(`❌ Scraping failed: ${result.error}`)
      return {
        success: false,
        error: result.error,
        duration: context.startTime
          ? Math.round((Date.now() - context.startTime) / 1000)
          : 0,
      }
    }

    return result.value
  } catch (error) {
    logger.error(`❌ Unexpected error: ${error.message}`)
    return {
      success: false,
      error: error.message,
      duration: context.startTime
        ? Math.round((Date.now() - context.startTime) / 1000)
        : 0,
    }
  }
}
