// Error handling utilities for Medium scraper
import { logger } from './utils.js'
import { Result } from './utils/functional.js'

// Error types for better categorization
export const ErrorTypes = {
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION',
  RATE_LIMIT: 'RATE_LIMIT',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  PARSING: 'PARSING',
  FILE_SYSTEM: 'FILE_SYSTEM',
  VALIDATION: 'VALIDATION',
}

// Custom error classes
export class ScraperError extends Error {
  constructor(
    message,
    type = ErrorTypes.NETWORK,
    statusCode = null,
    retryable = true
  ) {
    super(message)
    this.name = 'ScraperError'
    this.type = type
    this.statusCode = statusCode
    this.retryable = retryable
    this.timestamp = new Date().toISOString()
  }
}

export class RateLimitError extends ScraperError {
  constructor(message, retryAfter = null) {
    super(message, ErrorTypes.RATE_LIMIT, 429, true)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

export class NotFoundError extends ScraperError {
  constructor(message) {
    super(message, ErrorTypes.NOT_FOUND, 404, false)
    this.name = 'NotFoundError'
  }
}

export class ForbiddenError extends ScraperError {
  constructor(message) {
    super(message, ErrorTypes.FORBIDDEN, 403, false)
    this.name = 'ForbiddenError'
  }
}

// Retry configuration
const defaultRetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  jitter: true,
}

// Calculate delay with exponential backoff
const calculateDelay = (attempt, config = defaultRetryConfig) => {
  const baseDelay =
    config.baseDelay * Math.pow(config.backoffFactor, attempt - 1)
  const cappedDelay = Math.min(baseDelay, config.maxDelay)

  if (config.jitter) {
    // Add random jitter (±25%)
    const jitterRange = cappedDelay * 0.25
    const jitter = (Math.random() - 0.5) * 2 * jitterRange
    return Math.max(0, cappedDelay + jitter)
  }

  return cappedDelay
}

// Retry wrapper with exponential backoff
export const withRetry =
  (fn, config = defaultRetryConfig) =>
  async (...args) => {
    let lastError = null

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await fn(...args)

        // Success - return result
        if (attempt > 1) {
          logger.success(`Operation succeeded after ${attempt} attempts`)
        }

        return result
      } catch (error) {
        lastError = error

        // Check if error is retryable
        if (error instanceof ScraperError && !error.retryable) {
          logger.error(`Non-retryable error: ${error.message}`)
          throw error
        }

        // Rate limiting - respect retry-after header
        if (error instanceof RateLimitError) {
          const retryAfter = error.retryAfter || calculateDelay(attempt, config)
          logger.warn(
            `Rate limited, waiting ${Math.round(retryAfter / 1000)}s before retry ${attempt}/${config.maxAttempts}`
          )
          await sleep(retryAfter)
          continue
        }

        // Last attempt - don't wait
        if (attempt === config.maxAttempts) {
          logger.error(
            `Operation failed after ${config.maxAttempts} attempts: ${error.message}`
          )
          break
        }

        // Calculate delay for next attempt
        const delay = calculateDelay(attempt, config)
        logger.warn(
          `Attempt ${attempt}/${config.maxAttempts} failed: ${error.message}. Retrying in ${Math.round(delay / 1000)}s...`
        )

        await sleep(delay)
      }
    }

    throw lastError
  }

// Sleep utility
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// HTTP error classification
export const classifyHttpError = (statusCode, message = '') => {
  switch (statusCode) {
    case 401:
      return new ScraperError(
        `Authentication required: ${message}`,
        ErrorTypes.AUTHENTICATION,
        401,
        false
      )
    case 403:
      return new ForbiddenError(
        `Access forbidden - post may be private or restricted: ${message}`
      )
    case 404:
      return new NotFoundError(
        `Content not found - post may have been deleted: ${message}`
      )
    case 429: {
      // Parse retry-after header if available
      const retryAfter = parseRetryAfter(message)
      return new RateLimitError(`Rate limit exceeded: ${message}`, retryAfter)
    }
    case 500:
    case 502:
    case 503:
    case 504:
      return new ScraperError(
        `Server error (${statusCode}): ${message}`,
        ErrorTypes.NETWORK,
        statusCode,
        true
      )
    default:
      if (statusCode >= 400 && statusCode < 500) {
        return new ScraperError(
          `Client error (${statusCode}): ${message}`,
          ErrorTypes.NETWORK,
          statusCode,
          false
        )
      }
      return new ScraperError(
        `HTTP error (${statusCode}): ${message}`,
        ErrorTypes.NETWORK,
        statusCode,
        true
      )
  }
}

// Parse retry-after header (seconds or HTTP date)
const parseRetryAfter = retryAfterHeader => {
  if (!retryAfterHeader) return null

  // If it's a number, it's seconds
  const seconds = parseInt(retryAfterHeader, 10)
  if (!isNaN(seconds)) {
    return seconds * 1000 // Convert to milliseconds
  }

  // Try parsing as HTTP date
  try {
    const date = new Date(retryAfterHeader)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    return Math.max(0, diff)
  } catch {
    return null
  }
}

// Network error handling
export const handleNetworkError = error => {
  if (error.code === 'ENOTFOUND') {
    return new ScraperError(
      'Network error: Domain not found. Check your internet connection.',
      ErrorTypes.NETWORK,
      null,
      true
    )
  }

  if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
    return new ScraperError(
      'Network error: Connection failed. This may be temporary.',
      ErrorTypes.NETWORK,
      null,
      true
    )
  }

  if (error.code === 'ETIMEDOUT') {
    return new ScraperError(
      'Network error: Request timed out. The server may be slow.',
      ErrorTypes.NETWORK,
      null,
      true
    )
  }

  return new ScraperError(
    `Network error: ${error.message}`,
    ErrorTypes.NETWORK,
    null,
    true
  )
}

// Graceful error handling for operations
export const handleGracefully = async (
  operation,
  context = '',
  fallbackValue = null
) => {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      logger.warn(`${context}: ${error.message} - Skipping...`)
      return fallbackValue
    }

    // Re-throw other errors for retry logic
    throw error
  }
}

// Error recovery strategies
export const createErrorRecovery = (options = {}) => {
  const {
    skipPrivatePosts = true,
    skipDeletedPosts = true,
    maxConsecutiveFailures = 5,
    onError = null,
  } = options

  let consecutiveFailures = 0

  return {
    shouldSkip: error => {
      if (error instanceof ForbiddenError && skipPrivatePosts) {
        return true
      }

      if (error instanceof NotFoundError && skipDeletedPosts) {
        return true
      }

      return false
    },

    recordFailure: error => {
      consecutiveFailures++

      if (onError) {
        onError(error, consecutiveFailures)
      }

      if (consecutiveFailures >= maxConsecutiveFailures) {
        throw new ScraperError(
          `Too many consecutive failures (${consecutiveFailures}). Stopping operation.`,
          ErrorTypes.VALIDATION,
          null,
          false
        )
      }
    },

    recordSuccess: () => {
      consecutiveFailures = 0
    },

    getFailureCount: () => consecutiveFailures,
  }
}

// Factory for creating error-aware operations
export const createErrorAwareOperation = (config = {}) => {
  const retryConfig = { ...defaultRetryConfig, ...config.retry }
  const recovery = createErrorRecovery(config.recovery)

  return {
    execute: async (operation, context = '') => {
      try {
        // Create a wrapper that checks for skippable errors before retrying
        const wrappedOperation = async (...args) => {
          try {
            return await operation(...args)
          } catch (error) {
            // If this is a skippable error, don't retry - throw immediately
            if (recovery.shouldSkip(error)) {
              throw error
            }
            // Otherwise, let withRetry handle it
            throw error
          }
        }

        const result = await withRetry(wrappedOperation, retryConfig)()
        recovery.recordSuccess()
        return { success: true, result }
      } catch (error) {
        // Check if we should skip this type of error
        if (recovery.shouldSkip(error)) {
          // Don't count skipped errors as consecutive failures
          logger.warn(
            `${context}: Skipping due to ${error.name}: ${error.message}`
          )
          return { success: false, skipped: true, error: error.message }
        }

        recovery.recordFailure(error)
        return { success: false, skipped: false, error: error.message }
      }
    },

    getStats: () => ({
      consecutiveFailures: recovery.getFailureCount(),
    }),
  }
}

// Centralized error handling using Result types and functional patterns
export const createErrorHandlingService = (config = {}) => {
  const defaultConfig = {
    logErrors: true,
    throwOnCritical: true,
    enableRetry: true,
    retryConfig: defaultRetryConfig,
  }

  const finalConfig = { ...defaultConfig, ...config }

  // Result-based error handling operations
  const safeAsync = async (operation, context = '') => {
    try {
      const result = await operation()
      return Result.ok(result)
    } catch (error) {
      if (finalConfig.logErrors) {
        logger.error(`${context}: ${error.message}`)
      }

      if (error instanceof ScraperError && finalConfig.throwOnCritical) {
        throw error
      }

      return Result.error(error)
    }
  }

  const safeAsyncWithRetry = async (operation, context = '') => {
    if (!finalConfig.enableRetry) {
      return safeAsync(operation, context)
    }

    try {
      const result = await withRetry(operation, finalConfig.retryConfig)()
      return Result.ok(result)
    } catch (error) {
      if (finalConfig.logErrors) {
        logger.error(`${context} (with retry): ${error.message}`)
      }
      return Result.error(error)
    }
  }

  const safe = (operation, context = '') => {
    try {
      const result = operation()
      return Result.ok(result)
    } catch (error) {
      if (finalConfig.logErrors) {
        logger.error(`${context}: ${error.message}`)
      }
      return Result.error(error)
    }
  }

  const classifyError = error => {
    if (error instanceof ScraperError) {
      return error
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
      return handleNetworkError(error)
    }

    if (error.name === 'TimeoutError') {
      return new ScraperError(
        `Operation timed out: ${error.message}`,
        ErrorTypes.NETWORK,
        null,
        true
      )
    }

    return new ScraperError(
      error.message || 'Unknown error',
      ErrorTypes.PARSING,
      null,
      false
    )
  }

  const handleWithRecovery = async (operation, context = '', recovery = {}) => {
    const {
      skipOnNotFound = true,
      skipOnForbidden = true,
      fallbackValue = null,
    } = recovery

    const result = await safeAsyncWithRetry(operation, context)

    return result.fold(
      error => {
        const classified = classifyError(error)

        if (skipOnNotFound && classified instanceof NotFoundError) {
          logger.warn(`${context}: Content not found - skipping`)
          return Result.ok(fallbackValue)
        }

        if (skipOnForbidden && classified instanceof ForbiddenError) {
          logger.warn(`${context}: Access forbidden - skipping`)
          return Result.ok(fallbackValue)
        }

        return Result.error(classified)
      },
      value => Result.ok(value)
    )
  }

  const batchProcess = async (items, processor, options = {}) => {
    const {
      concurrency = 1,
      stopOnError = false,
      context = 'Batch processing',
    } = options

    const results = []
    const errors = []

    if (concurrency === 1) {
      // Sequential processing
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const itemContext = `${context} [${i + 1}/${items.length}]`

        const result = await safeAsyncWithRetry(
          () => processor(item, i),
          itemContext
        )

        result.fold(
          error => {
            errors.push({ item, index: i, error })
            if (stopOnError) {
              return Result.error(
                new ScraperError(
                  `Batch processing stopped at item ${i + 1}: ${error.message}`,
                  ErrorTypes.PARSING,
                  null,
                  false
                )
              )
            }
          },
          value => results.push({ item, index: i, result: value })
        )
      }
    } else {
      // Concurrent processing (for future enhancement)
      throw new Error('Concurrent processing not yet implemented')
    }

    return Result.ok({
      results,
      errors,
      totalProcessed: items.length,
      successful: results.length,
      failed: errors.length,
    })
  }

  return {
    safe,
    safeAsync,
    safeAsyncWithRetry,
    classifyError,
    handleWithRecovery,
    batchProcess,
    createOperation: createErrorAwareOperation,
  }
}

export default {
  withRetry,
  classifyHttpError,
  handleNetworkError,
  handleGracefully,
  createErrorRecovery,
  createErrorAwareOperation,
  createErrorHandlingService,
  ErrorTypes,
  ScraperError,
  RateLimitError,
  NotFoundError,
  ForbiddenError,
}
