// Controlled concurrency utilities for batch processing

import { CONCURRENCY, DELAYS } from './constants.js'

// Create a concurrency-controlled batch processor
export const createConcurrentProcessor = (options = {}) => {
  const batchSize = options.batchSize || CONCURRENCY.DEFAULT_BATCH_SIZE
  const maxConcurrent = options.maxConcurrent || CONCURRENCY.MAX_CONCURRENT_POSTS
  const delay = options.delay || DELAYS.REQUEST

  const processBatch = async (items, processor) => {
    const results = []
    const errors = []

    // Split items into batches
    const batches = createBatches(items, batchSize)

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]

      try {
        // Process batch with controlled concurrency
        const batchResults = await Promise.allSettled(
          batch.map(async item => {
            try {
              return await processor(item)
            } catch (error) {
              throw { item, error }
            }
          })
        )

        // Separate successful and failed results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push({
              item: batch[index],
              result: result.value,
              success: true,
            })
          } else {
            const errorData = result.reason.item ? result.reason : { item: batch[index], error: result.reason }
            errors.push({
              item: errorData.item,
              error: errorData.error,
              success: false,
            })
          }
        })

        // Add delay between batches (except for the last one)
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error) {
        // Handle batch-level errors
        batch.forEach(item => {
          errors.push({
            item,
            error,
            success: false,
          })
        })
      }
    }

    return {
      results,
      errors,
      successCount: results.length,
      errorCount: errors.length,
      totalProcessed: items.length,
    }
  }

  return { processBatch }
}

// Create batches from an array of items
export const createBatches = (items, batchSize) => {
  const batches = []
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }
  return batches
}

// Rate limiter utility
export const createRateLimiter = (options = {}) => {
  const maxConcurrent = options.maxConcurrent || CONCURRENCY.MAX_CONCURRENT_POSTS
  const delay = options.delay || DELAYS.REQUEST

  let activePromises = 0
  let lastExecutionTime = 0

  const execute = async (fn) => {
    // Wait if we've hit the concurrent limit
    while (activePromises >= maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Ensure minimum delay between executions
    const now = Date.now()
    const timeSinceLastExecution = now - lastExecutionTime
    if (timeSinceLastExecution < delay) {
      await new Promise(resolve => 
        setTimeout(resolve, delay - timeSinceLastExecution)
      )
    }

    activePromises++
    lastExecutionTime = Date.now()

    try {
      return await fn()
    } finally {
      activePromises--
    }
  }

  return { execute }
}

// Connection pool for browser instances
export const createBrowserPool = (browserManager, options = {}) => {
  const poolSize = options.poolSize || CONCURRENCY.BROWSER_POOL_SIZE
  const timeout = options.timeout || CONCURRENCY.CONNECTION_POOL_TIMEOUT

  let availableBrowsers = []
  let busyBrowsers = []
  let waitingQueue = []

  const initializePool = async () => {
    const browsers = await Promise.all(
      Array(poolSize).fill(null).map(() => browserManager.launch())
    )
    availableBrowsers = browsers
  }

  const acquireBrowser = async () => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = waitingQueue.findIndex(item => item.resolve === resolve)
        if (index >= 0) {
          waitingQueue.splice(index, 1)
        }
        reject(new Error('Browser pool timeout'))
      }, timeout)

      const tryAcquire = () => {
        if (availableBrowsers.length > 0) {
          clearTimeout(timeoutId)
          const browser = availableBrowsers.pop()
          busyBrowsers.push(browser)
          resolve(browser)
        } else {
          waitingQueue.push({ resolve, reject, timeoutId })
        }
      }

      tryAcquire()
    })
  }

  const releaseBrowser = (browser) => {
    const busyIndex = busyBrowsers.indexOf(browser)
    if (busyIndex >= 0) {
      busyBrowsers.splice(busyIndex, 1)
      availableBrowsers.push(browser)

      // Process waiting queue
      if (waitingQueue.length > 0) {
        const { resolve, timeoutId } = waitingQueue.shift()
        clearTimeout(timeoutId)
        const nextBrowser = availableBrowsers.pop()
        busyBrowsers.push(nextBrowser)
        resolve(nextBrowser)
      }
    }
  }

  const cleanup = async () => {
    // Wait for all busy browsers to be released
    while (busyBrowsers.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Close all browsers
    await Promise.all(
      availableBrowsers.map(browser => browserManager.close(browser))
    )

    availableBrowsers = []
    busyBrowsers = []
    waitingQueue = []
  }

  return {
    initializePool,
    acquireBrowser,
    releaseBrowser,
    cleanup,
    getStats: () => ({
      available: availableBrowsers.length,
      busy: busyBrowsers.length,
      waiting: waitingQueue.length,
    }),
  }
}

// Utility to chunk an array into smaller arrays
export const chunk = (array, size) => {
  return array.reduce((chunks, item, index) => {
    const chunkIndex = Math.floor(index / size)
    chunks[chunkIndex] = [...(chunks[chunkIndex] || []), item]
    return chunks
  }, [])
}

// Controlled sequential processing with concurrency
export const processSequentiallyWithConcurrency = async (
  items,
  processor,
  options = {}
) => {
  const concurrency = options.concurrency || CONCURRENCY.DEFAULT_BATCH_SIZE
  const delay = options.delay || DELAYS.REQUEST

  const results = []
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    
    // Process batch concurrently
    const batchResults = await Promise.allSettled(
      batch.map(processor)
    )

    // Collect results
    batchResults.forEach((result, index) => {
      results.push({
        item: batch[index],
        success: result.status === 'fulfilled',
        result: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null,
      })
    })

    // Add delay between batches
    if (i + concurrency < items.length) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return results
}