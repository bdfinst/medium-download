import {
  withRetry,
  ScraperError,
  ErrorTypes,
  classifyHttpError,
  handleNetworkError,
} from '../error-handling.js'
import { TIMEOUTS, SELECTORS } from '../constants.js'

// Factory function for page navigation service
export const createPageNavigator = () => {
  const navigateTo = withRetry(async (page, url, options = {}) => {
    try {
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: TIMEOUTS.PAGE_LOAD,
        ...options,
      })

      if (!response) {
        throw new ScraperError(
          `No response received for ${url}`,
          ErrorTypes.NETWORK,
          null,
          true
        )
      }

      const status = response.status()

      if (status >= 400) {
        throw classifyHttpError(status, `Failed to load ${url}`, url)
      }

      return response
    } catch (error) {
      if (error.name === 'TimeoutError') {
        throw new ScraperError(
          `Timeout loading ${url}`,
          ErrorTypes.NETWORK,
          null,
          true
        )
      }

      if (error instanceof ScraperError) {
        throw error
      }

      throw handleNetworkError(error)
    }
  })

  const waitForContent = async (page, options = {}) => {
    const timeout = options.fastMode
      ? TIMEOUTS.ELEMENT_WAIT_FAST
      : TIMEOUTS.ELEMENT_WAIT_NORMAL

    try {
      await page.waitForFunction(
        selector => {
          /* eslint-disable no-undef */
          return document.querySelectorAll(selector).length > 0
          /* eslint-enable no-undef */
        },
        { timeout },
        SELECTORS.CONTENT_WAIT
      )
    } catch (error) {
      // Don't throw - content might still be extractable
      console.warn(`Content wait timeout: ${error.message}`)
    }
  }

  const waitForSelector = withRetry(async (page, selector, options = {}) => {
    try {
      return await page.waitForSelector(selector, {
        timeout: TIMEOUTS.CONTENT_WAIT,
        ...options,
      })
    } catch (error) {
      throw new ScraperError(
        `Selector not found: ${selector} - ${error.message}`,
        ErrorTypes.PARSING,
        null,
        true
      )
    }
  })

  const evaluate = withRetry(async (page, pageFunction, ...args) => {
    try {
      return await page.evaluate(pageFunction, ...args)
    } catch (error) {
      throw new ScraperError(
        `Page evaluation failed: ${error.message}`,
        ErrorTypes.PARSING,
        null,
        true
      )
    }
  })

  const takeScreenshot = async (page, options = {}) => {
    try {
      return await page.screenshot(options)
    } catch (error) {
      console.warn(`Screenshot failed: ${error.message}`)
      return null
    }
  }

  return {
    navigateTo,
    waitForContent,
    waitForSelector,
    evaluate,
    takeScreenshot,
  }
}

export default createPageNavigator
