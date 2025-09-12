/**
 * Browser Automation Service Interface
 * Provides a high-level abstraction over browser automation libraries
 * to decouple business logic from specific browser implementations
 */

/**
 * Creates a browser automation service that abstracts browser operations
 * @param {Object} dependencies - Dependencies injected into the service
 * @param {Object} dependencies.browserLauncher - Browser launcher implementation
 * @returns {Object} Browser automation service interface
 */
export const createBrowserAutomationService = ({ browserLauncher }) => {
  let browser = null
  let currentPage = null

  /**
   * Initialize browser and create a new page
   * @param {Object} options - Browser launch options
   * @returns {Promise<Object>} Operation result
   */
  const initializeBrowser = async (options = {}) => {
    try {
      browser = await browserLauncher.launch(options)
      currentPage = await browser.newPage()

      return {
        success: true,
        page: currentPage,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Navigate to a URL and verify successful load
   * @param {string} url - URL to navigate to
   * @param {Object} options - Navigation options
   * @returns {Promise<Object>} Navigation result with page info
   */
  const navigateToUrl = async (url, options = {}) => {
    if (!currentPage) {
      return { success: false, error: 'Browser not initialized' }
    }

    try {
      const response = await currentPage.goto(url, options)
      const pageTitle = await currentPage.title()
      const currentUrl = currentPage.url()

      return {
        success: true,
        url: currentUrl,
        title: pageTitle,
        status: response?.status?.() || 200,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Extract posts from the current page using business logic
   * @param {Object} extractionConfig - Configuration for post extraction
   * @returns {Promise<Object>} Extraction result with posts array
   */
  const extractPosts = async (extractionConfig = {}) => {
    if (!currentPage) {
      return { success: false, error: 'Browser not initialized' }
    }

    try {
      const posts = []
      const maxScrollAttempts = extractionConfig.maxScrollAttempts || 5
      let scrollAttempts = 0
      let hasMoreContent = true

      while (hasMoreContent && scrollAttempts < maxScrollAttempts) {
        // Extract posts from current view
        const currentPosts = await currentPage.evaluate(() => {
          // This would contain the actual DOM extraction logic
          // For now, return mock structure
          return []
        })

        if (currentPosts.length > 0) {
          posts.push(...currentPosts)
        }

        // Check if more content available by scrolling
        const scrollResult = await currentPage.evaluate(() => {
          const scrollTop = globalThis.document.documentElement.scrollTop
          globalThis.window.scrollTo(0, globalThis.document.body.scrollHeight)
          return globalThis.document.documentElement.scrollTop > scrollTop
        })

        hasMoreContent = scrollResult
        scrollAttempts++

        if (hasMoreContent) {
          await currentPage.waitForTimeout(1000) // Wait for content to load
        }
      }

      return {
        success: true,
        posts,
        totalExtracted: posts.length,
        scrollAttempts,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Check if user is authenticated on the current page
   * @returns {Promise<Object>} Authentication status
   */
  const checkAuthentication = async () => {
    if (!currentPage) {
      return { success: false, error: 'Browser not initialized' }
    }

    try {
      const isAuthenticated = await currentPage.evaluate(() => {
        // Check for authentication indicators in DOM
        // This is business logic, not browser implementation
        return (
          globalThis.document.querySelector('[data-testid="user-menu"]') !==
            null ||
          globalThis.document.querySelector('.logged-in') !== null ||
          globalThis.document.cookie.includes('uid=')
        )
      })

      return {
        success: true,
        authenticated: isAuthenticated,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Clean up browser resources
   * @returns {Promise<Object>} Cleanup result
   */
  const cleanup = async () => {
    try {
      if (currentPage) {
        await currentPage.close()
        currentPage = null
      }
      if (browser) {
        await browser.close()
        browser = null
      }
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Get current page information for debugging
   * @returns {Promise<Object>} Page information
   */
  const getPageInfo = async () => {
    if (!currentPage) {
      return { success: false, error: 'Browser not initialized' }
    }

    try {
      const title = await currentPage.title()
      const url = currentPage.url()

      return {
        success: true,
        title,
        url,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  return {
    initializeBrowser,
    navigateToUrl,
    extractPosts,
    checkAuthentication,
    cleanup,
    getPageInfo,
  }
}

/**
 * Creates a mock browser automation service for testing
 * @param {Object} mockResponses - Pre-configured responses for different operations
 * @returns {Object} Mock browser automation service
 */
export const createMockBrowserAutomationService = (mockResponses = {}) => {
  const defaults = {
    initializeBrowser: { success: true, page: {} },
    navigateToUrl: {
      success: true,
      url: 'https://medium.com/@testuser',
      title: 'Test User - Medium',
      status: 200,
    },
    extractPosts: {
      success: true,
      posts: [],
      totalExtracted: 0,
      scrollAttempts: 0,
    },
    checkAuthentication: { success: true, authenticated: true },
    cleanup: { success: true },
    getPageInfo: {
      success: true,
      title: 'Test Page',
      url: 'https://medium.com/@testuser',
    },
  }

  const responses = { ...defaults, ...mockResponses }

  return {
    initializeBrowser: async () => responses.initializeBrowser,
    navigateToUrl: async () => responses.navigateToUrl,
    extractPosts: async () => responses.extractPosts,
    checkAuthentication: async () => responses.checkAuthentication,
    cleanup: async () => responses.cleanup,
    getPageInfo: async () => responses.getPageInfo,
  }
}
