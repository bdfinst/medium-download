import { evaluateWithRetry } from './browser-manager.js'

/**
 * Wait for a specified amount of time (Puppeteer version-agnostic)
 * @param {Object} page - Puppeteer page object
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
const waitForTimeout = async (page, ms) => {
  await page.evaluate(
    delay => new Promise(resolve => setTimeout(resolve, delay)),
    ms
  )
}

/**
 * Factory function for scroll handling with multiple strategies
 * @returns {Object} Scroll handler service
 */
export const createScrollHandler = () => {
  /**
   * Slow scroll strategy - gradually scroll to simulate human behavior
   */
  const slowScrollStrategy = async (page, options) => {
    const scrollHeight = await page.evaluate(
      () => globalThis.document.body.scrollHeight
    )
    const viewportHeight = await page.evaluate(
      () => globalThis.window.innerHeight
    )
    let currentPosition = 0
    let newContentFound = false

    while (currentPosition < scrollHeight) {
      currentPosition += viewportHeight * 0.8
      await page.evaluate(
        pos => globalThis.window.scrollTo(0, pos),
        currentPosition
      )
      await waitForTimeout(page, options.scrollDelay || 2000)

      const newScrollHeight = await page.evaluate(
        () => globalThis.document.body.scrollHeight
      )
      if (newScrollHeight > scrollHeight) {
        newContentFound = true
        break
      }
    }

    return { newContentFound, strategy: 'slow' }
  }

  /**
   * Jump scroll strategy - jump to bottom quickly
   */
  const jumpScrollStrategy = async (page, options) => {
    const initialHeight = await page.evaluate(
      () => globalThis.document.body.scrollHeight
    )

    await page.evaluate(() =>
      globalThis.window.scrollTo(0, globalThis.document.body.scrollHeight)
    )
    await waitForTimeout(page, options.scrollDelay || 3000)

    const newHeight = await page.evaluate(
      () => globalThis.document.body.scrollHeight
    )
    const newContentFound = newHeight > initialHeight

    return { newContentFound, strategy: 'jump' }
  }

  /**
   * Incremental scroll strategy - scroll in small increments
   */
  const incrementalScrollStrategy = async (page, options) => {
    const scrollStep = options.scrollStep || 500
    let previousHeight = await page.evaluate(
      () => globalThis.document.body.scrollHeight
    )
    let scrollPosition = 0
    let stableCount = 0
    let newContentFound = false

    while (stableCount < 3) {
      scrollPosition += scrollStep
      await page.evaluate(
        pos => globalThis.window.scrollTo(0, pos),
        scrollPosition
      )
      await waitForTimeout(page, options.scrollDelay || 1000)

      const currentHeight = await page.evaluate(
        () => globalThis.document.body.scrollHeight
      )

      if (currentHeight > previousHeight) {
        newContentFound = true
        stableCount = 0
        previousHeight = currentHeight
      } else {
        stableCount++
      }

      if (scrollPosition >= currentHeight) {
        break
      }
    }

    return { newContentFound, strategy: 'incremental' }
  }

  /**
   * Scroll to load more content using adaptive strategy
   */
  const scrollToLoadMore = async (page, options = {}) => {
    const { strategy = 'adaptive', maxAttempts = 3 } = options
    let result = { newContentFound: false }

    if (strategy === 'adaptive') {
      // Try different strategies until one works or we exhaust attempts
      const strategies = [
        slowScrollStrategy,
        jumpScrollStrategy,
        incrementalScrollStrategy,
      ]

      for (
        let attempt = 0;
        attempt < maxAttempts && !result.newContentFound;
        attempt++
      ) {
        const currentStrategy = strategies[attempt % strategies.length]
        result = await currentStrategy(page, options)

        if (options.debug) {
          console.log(
            `Scroll attempt ${attempt + 1}: ${result.strategy} - ${result.newContentFound ? 'found new content' : 'no new content'}`
          )
        }
      }
    } else {
      // Use specific strategy
      const strategyMap = {
        slow: slowScrollStrategy,
        jump: jumpScrollStrategy,
        incremental: incrementalScrollStrategy,
      }

      const selectedStrategy =
        strategyMap[strategy] || incrementalScrollStrategy
      result = await selectedStrategy(page, options)
    }

    return result
  }

  /**
   * Check if more content is available to load
   */
  const hasMoreContent = async page => {
    try {
      return await evaluateWithRetry(page, () => {
        // Check for common loading indicators
        const loadingIndicators = [
          '.loading',
          '.spinner',
          '[data-testid="loading"]',
          '.js-progressiveLoading',
        ]

        const hasLoader = loadingIndicators.some(selector =>
          globalThis.document.querySelector(selector)
        )

        // Check if we're near the bottom
        const scrollTop =
          globalThis.window.pageYOffset ||
          globalThis.document.documentElement.scrollTop
        const windowHeight = globalThis.window.innerHeight
        const docHeight = globalThis.document.documentElement.scrollHeight
        const distanceFromBottom = docHeight - (scrollTop + windowHeight)

        // Consider more content available if:
        // 1. There's a loading indicator, OR
        // 2. We're not very close to the bottom (more than 100px away)
        return hasLoader || distanceFromBottom > 100
      })
    } catch {
      // If we can't determine, assume no more content
      return false
    }
  }

  return {
    scrollToLoadMore,
    hasMoreContent,
    strategies: {
      slow: slowScrollStrategy,
      jump: jumpScrollStrategy,
      incremental: incrementalScrollStrategy,
    },
  }
}
