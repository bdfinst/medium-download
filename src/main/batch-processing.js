import { createErrorAwareOperation } from '../error-handling.js'

// Batch processing utilities for handling multiple posts

export const createBatchProcessor = (config, logger) => {
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
        logger.warn(`Error #${consecutiveFailures}: ${error.message}`)
      },
    },
  })

  return errorAwareOperation
}

export const processBatch = async (posts, processor, config, logger) => {
  const errorAwareOperation = createBatchProcessor(config, logger)
  const results = []
  let processedCount = 0
  let successCount = 0
  let failureCount = 0
  let skippedCount = 0

  for (const post of posts) {
    processedCount++
    logger.progress(processedCount, posts.length, `Processing: ${post.title}`)

    const result = await errorAwareOperation.execute(
      () => processor.process(post),
      `Post: ${post.title}`
    )

    // Handle the result from error-aware operation
    if (result.success) {
      successCount++
      results.push({ ...result.result, success: true })
      logger.success(
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
    } else {
      failureCount++
      results.push({
        url: post.url,
        title: post.title,
        error: result.error,
        success: false,
      })
      logger.error(`Failed to process "${post.title}": ${result.error}`)
    }

    // Add delay between requests to be respectful
    if (processedCount < posts.length) {
      await new Promise(resolve =>
        setTimeout(resolve, config.requestDelay || 2000)
      )
    }
  }

  return {
    processedCount,
    successCount,
    failureCount,
    skippedCount,
    results,
  }
}

export const createBatchProcessingService = (config, logger) => {
  return {
    process: (posts, processor) =>
      processBatch(posts, processor, config, logger),
  }
}
