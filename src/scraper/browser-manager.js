import puppeteer from 'puppeteer'
import { ErrorTypes, ScraperError, withRetry } from '../error-handling.js'

/**
 * Factory function for creating browser launcher with error handling
 * @returns {Object} Browser launcher service
 */
export const createBrowserLauncher = () => ({
  launch: withRetry(async (options = {}) => {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ...options,
      })
      return browser
    } catch (error) {
      throw new ScraperError(
        `Failed to launch browser: ${error.message}`,
        ErrorTypes.NETWORK,
        null,
        true
      )
    }
  }),
})

/**
 * Error-aware page navigation with retries
 */
export const navigateToPage = withRetry(async (page, url, options = {}) => {
  try {
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
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
      throw new ScraperError(
        `HTTP ${status} error for ${url}`,
        ErrorTypes.NETWORK,
        status,
        status >= 500
      )
    }

    return response
  } catch (error) {
    if (error instanceof ScraperError) {
      throw error
    }

    throw new ScraperError(
      `Navigation failed: ${error.message}`,
      ErrorTypes.NETWORK,
      null,
      true
    )
  }
})

/**
 * Enhanced page evaluation with retry logic
 */
export const evaluateWithRetry = withRetry(
  async (page, pageFunction, ...args) => {
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
  }
)

/**
 * Factory for creating page setup utilities
 * @returns {Object} Page utilities
 */
export const createPageUtils = () => ({
  /**
   * Set up page with common configurations
   */
  setupPage: async (page, options = {}) => {
    const { userAgent = 'Mozilla/5.0 (compatible; MediumScraper/1.0)' } =
      options

    await page.setUserAgent(userAgent)

    // Set viewport for consistency
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    })

    return page
  },

  /**
   * Clean up page resources
   */
  cleanupPage: async page => {
    if (page && !page.isClosed()) {
      await page.close()
    }
  },

  /**
   * Clean up browser resources
   */
  cleanupBrowser: async browser => {
    if (browser && browser.isConnected()) {
      await browser.close()
    }
  },
})
