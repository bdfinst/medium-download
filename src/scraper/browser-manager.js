import puppeteer from 'puppeteer'
import { withRetry, ScraperError, ErrorTypes } from '../error-handling.js'
import { USER_AGENT, BROWSER_ARGS } from '../constants.js'

// Factory function for creating browser management service
export const createBrowserManager = () => {
  const launch = withRetry(async (options = {}) => {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: BROWSER_ARGS,
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
  })

  const createPage = async browser => {
    try {
      const page = await browser.newPage()
      await page.setUserAgent(USER_AGENT)
      return page
    } catch (error) {
      throw new ScraperError(
        `Failed to create new page: ${error.message}`,
        ErrorTypes.NETWORK,
        null,
        true
      )
    }
  }

  const close = async browser => {
    try {
      if (browser) {
        await browser.close()
      }
    } catch (error) {
      // Ignore cleanup errors - browser might already be closed
      console.warn(`Browser cleanup warning: ${error.message}`)
    }
  }

  const closePage = async page => {
    try {
      if (page) {
        await page.close()
      }
    } catch (error) {
      // Ignore cleanup errors - page might already be closed
      console.warn(`Page cleanup warning: ${error.message}`)
    }
  }

  return {
    launch,
    createPage,
    close,
    closePage,
  }
}

export default createBrowserManager
