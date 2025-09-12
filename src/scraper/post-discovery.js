import { navigateToPage } from './browser-manager.js'
import { ScraperError, ErrorTypes } from '../error-handling.js'
import { Result } from '../utils/functional.js'

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
 * Factory function for post discovery pipeline
 * @param {Object} dependencies - Required dependencies
 * @returns {Object} Post discovery service
 */
export const createPostDiscoveryPipeline = (dependencies = {}) => {
  const {
    authService,
    urlValidator,
    browserLauncher,
    postExtractor,
    scrollHandler,
    pageUtils,
  } = dependencies

  /**
   * Validate user authentication
   */
  const validateAuth = async context => {
    try {
      const isAuthenticated = await authService.isAuthenticated()
      if (!isAuthenticated) {
        return Result.error(
          new ScraperError(
            'Authentication required. Please authenticate with Google OAuth first.',
            ErrorTypes.AUTHENTICATION
          )
        )
      }
      return Result.ok({ ...context, authenticated: true })
    } catch (error) {
      return Result.error(error)
    }
  }

  /**
   * Normalize and validate URL
   */
  const normalizeUrl = context => {
    try {
      const { profileUrl } = context
      const normalizedUrl = urlValidator.normalizeProfileUrl(profileUrl)

      if (!normalizedUrl) {
        return Result.error(
          new ScraperError(
            'Invalid Medium profile URL. Expected format: https://medium.com/@username',
            ErrorTypes.VALIDATION
          )
        )
      }

      const username = urlValidator.extractUsername(normalizedUrl)

      return Result.ok({
        ...context,
        normalizedUrl,
        username,
      })
    } catch (error) {
      return Result.error(error)
    }
  }

  /**
   * Setup browser and page
   */
  const setupBrowser = async context => {
    const { options = {} } = context

    const browser = await browserLauncher.launch({
      headless: options.headless !== false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await pageUtils.setupPage(page, options)

    return {
      ...context,
      browser,
      page,
    }
  }

  /**
   * Navigate to profile page
   */
  const navigateToProfile = async context => {
    const { page, normalizedUrl, options = {} } = context

    if (options.debug) {
      console.log(`Navigating to: ${normalizedUrl}`)
    }

    await navigateToPage(page, normalizedUrl)

    // Wait for page to be ready
    await page.waitForSelector('body', { timeout: 10000 })

    return {
      ...context,
      navigated: true,
    }
  }

  /**
   * Collect posts from profile page with scrolling
   */
  const collectPosts = async context => {
    const { page, username, options = {} } = context
    const {
      maxScrollAttempts = 10,
      debug = false,
      includePublications = true,
    } = options

    const allPosts = []
    let attempts = 0
    let hasMore = true

    while (attempts < maxScrollAttempts && hasMore) {
      // Extract posts from current view
      const currentPosts = await postExtractor.extractPostsFromPage(page, {
        debug,
      })

      if (currentPosts.length > 0) {
        // Filter for user's posts
        const userPosts = postExtractor.filterUserPosts(
          currentPosts,
          username,
          {
            includePublications,
          }
        )

        // Add new posts (avoid duplicates)
        const existingUrls = new Set(allPosts.map(p => p.url))
        const newPosts = userPosts.filter(p => !existingUrls.has(p.url))

        allPosts.push(...newPosts)

        if (debug) {
          console.log(
            `Attempt ${attempts + 1}: Found ${currentPosts.length} posts, ${userPosts.length} user posts, ${newPosts.length} new`
          )
        }
      }

      // Try to load more content
      const scrollResult = await scrollHandler.scrollToLoadMore(page, {
        strategy: options.scrollStrategy || 'adaptive',
        scrollDelay: options.scrollDelay || 2000,
        debug,
      })

      hasMore = scrollResult.newContentFound
      attempts++

      if (hasMore) {
        // Wait a bit for new content to load
        await waitForTimeout(page, options.waitBetweenAttempts || 3000)
      }
    }

    if (debug) {
      console.log(
        `Collection complete: ${allPosts.length} total posts found in ${attempts} attempts`
      )
    }

    return {
      ...context,
      posts: allPosts,
      attempts,
    }
  }

  /**
   * Enrich posts with additional metadata
   */
  const enrichPosts = async context => {
    const { posts } = context

    const enrichedPosts = await postExtractor.enrichPostData(posts)

    return {
      ...context,
      posts: enrichedPosts,
    }
  }

  /**
   * Format final discovery result
   */
  const formatResult = context => {
    const { posts, attempts } = context

    return {
      success: true,
      posts,
      totalCount: posts.length,
      metadata: {
        attempts,
        discoveredAt: new Date().toISOString(),
      },
    }
  }

  /**
   * Cleanup resources
   */
  const cleanup = async context => {
    const { browser, page } = context

    if (page) {
      await pageUtils.cleanupPage(page)
    }

    if (browser) {
      await pageUtils.cleanupBrowser(browser)
    }

    return context
  }

  // Error handler that ensures cleanup (available if needed)
  // const handleError = async (error, context = {}) => {
  //   await cleanup(context).catch(cleanupError => {
  //     console.warn('Cleanup failed:', cleanupError.message)
  //   })
  //   return {
  //     success: false,
  //     error: error.message,
  //     posts: [],
  //     totalCount: 0,
  //   }
  // }

  /**
   * Main discovery pipeline
   */
  const discoverPosts = async (profileUrl, options = {}) => {
    const context = { profileUrl, options }

    // Pipeline composition (simplified implementation)
    // const pipeline = pipeResultAsync(
    //   validateAuth,
    //   normalizeUrl
    //   // Note: setupBrowser and other functions would need to be updated to return Results
    // )

    const result = await Result.tryCatchAsync(async () => {
      // For now, use the simpler approach until all functions are converted
      const authResult = await validateAuth(context)
      if (authResult.isError) {
        throw authResult.error
      }

      const urlResult = normalizeUrl(authResult.value)
      if (urlResult.isError) {
        throw urlResult.error
      }

      // Continue with rest of pipeline (simplified for this refactoring)
      const finalContext = urlResult.value

      // Setup browser and complete discovery
      const browser = await browserLauncher.launch({
        headless: options.headless !== false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })

      const page = await browser.newPage()
      await pageUtils.setupPage(page, options)

      // Context is ready for post extraction

      // Navigate and collect posts
      await navigateToPage(page, finalContext.normalizedUrl)
      await page.waitForSelector('body', { timeout: 10000 })

      const posts = []
      let attempts = 0
      const maxAttempts = options.maxScrollAttempts || 10
      let hasMore = true

      while (attempts < maxAttempts && hasMore) {
        const currentPosts = await postExtractor.extractPostsFromPage(
          page,
          options
        )

        if (currentPosts.length > 0) {
          const userPosts = postExtractor.filterUserPosts(
            currentPosts,
            finalContext.username,
            {
              includePublications: options.includePublications !== false,
            }
          )

          const existingUrls = new Set(posts.map(p => p.url))
          const newPosts = userPosts.filter(p => !existingUrls.has(p.url))
          posts.push(...newPosts)
        }

        const scrollResult = await scrollHandler.scrollToLoadMore(page, {
          strategy: options.scrollStrategy || 'adaptive',
          scrollDelay: options.scrollDelay || 2000,
          debug: options.debug,
        })

        hasMore = scrollResult.newContentFound
        attempts++

        if (hasMore) {
          await waitForTimeout(page, options.waitBetweenAttempts || 3000)
        }
      }

      // Cleanup
      await pageUtils.cleanupPage(page)
      await pageUtils.cleanupBrowser(browser)

      return Result.ok({
        success: true,
        posts,
        totalCount: posts.length,
        metadata: {
          attempts,
          discoveredAt: new Date().toISOString(),
        },
      })
    })

    return result.fold(
      error => ({
        success: false,
        error: error.message,
        posts: [],
        totalCount: 0,
      }),
      value => (value.isOk ? value.value : value)
    )
  }

  return {
    discoverPosts,
    validateAuth,
    normalizeUrl,
    setupBrowser,
    navigateToProfile,
    collectPosts,
    enrichPosts,
    formatResult,
    cleanup,
  }
}
