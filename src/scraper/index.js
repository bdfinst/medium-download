import { createAuthService } from '../auth.js'
import { urlValidator } from '../utils.js'
import { createBrowserManager } from './browser-manager.js'
import { createPageNavigator } from './page-navigator.js'
import { createPostExtractor } from './post-extractor.js'
import { createScrollHandler } from './scroll-handler.js'
import { DELAYS, LIMITS, DEBUG_CONFIG } from '../constants.js'

// Main factory function for scraper service
export const createScraperService = (dependencies = {}) => {
  const browserManager = dependencies.browserManager || createBrowserManager()
  const authService = dependencies.authService || createAuthService()
  const urlValidatorInstance = dependencies.urlValidator || urlValidator

  // Create the navigator and dependent services
  const navigator = dependencies.navigator || createPageNavigator()
  const postExtractor =
    dependencies.postExtractor || createPostExtractor(navigator)
  const scrollHandler = dependencies.scrollHandler || createScrollHandler()

  // Discover all posts from a Medium profile
  const discoverPosts = async (profileUrl, options = {}) => {
    let browser = null
    let page = null

    try {
      // Validate authentication
      const isAuthenticated = await authService.isAuthenticated()
      if (!isAuthenticated) {
        return {
          success: false,
          error:
            'Authentication required. Please authenticate with Google OAuth first.',
          posts: [],
          totalCount: 0,
        }
      }

      // Normalize and validate Medium profile URL
      const normalizedUrl = urlValidatorInstance.normalizeProfileUrl(profileUrl)
      if (!normalizedUrl) {
        return {
          success: false,
          error:
            'Invalid Medium profile URL. Expected format: https://medium.com/@username',
          posts: [],
          totalCount: 0,
        }
      }

      const username = urlValidatorInstance.extractUsername(normalizedUrl)

      // Launch browser and create page
      browser = await browserManager.launch({
        headless: options.headless !== false,
      })
      page = await browserManager.createPage(browser)

      // Navigate to profile page
      await navigator.navigateTo(page, normalizedUrl)

      // Wait for the page to be more fully rendered
      const waitTime = options.fastMode ? 100 : DELAYS.CONTENT_LOAD
      await new Promise(resolve => setTimeout(resolve, waitTime))

      // Validate page navigation
      const currentUrl = page.url()
      if (currentUrl.includes('error') || currentUrl.includes('404')) {
        throw new Error(
          `Profile page not accessible: redirected to ${currentUrl}`
        )
      }

      // Wait for content to load
      await navigator.waitForContent(page, options)

      // Take a screenshot for debugging if enabled
      if (options.debug) {
        await navigator.takeScreenshot(page, {
          path: DEBUG_CONFIG.SCREENSHOT_PATH,
          fullPage: DEBUG_CONFIG.FULL_PAGE,
        })
      }

      // Collect posts with infinite scroll handling
      const allPosts = await collectAllPosts(page, options)

      // Filter to only include posts from this user
      const userPosts = filterUserPosts(allPosts, username)

      return {
        success: true,
        posts: userPosts,
        totalCount: userPosts.length,
        username,
        profileUrl: normalizedUrl,
        scrapedAt: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to discover posts: ${error.message}`,
        posts: [],
        totalCount: 0,
      }
    } finally {
      // Clean up browser resources
      await browserManager.closePage(page)
      await browserManager.close(browser)
    }
  }

  const collectAllPosts = async (page, options) => {
    let allPosts = []
    let previousPostCount = 0
    let attempts = 0
    const maxAttempts = options.maxScrollAttempts || LIMITS.MAX_SCROLL_ATTEMPTS

    while (attempts < maxAttempts) {
      // Extract posts from current page state
      const currentPosts = await postExtractor.extractPostsFromPage(page)

      // Merge with existing posts, avoiding duplicates
      const newPosts = currentPosts.filter(
        post => !allPosts.some(existing => existing.url === post.url)
      )

      allPosts = [...allPosts, ...newPosts]

      // Check if we found new content
      if (allPosts.length === previousPostCount) {
        // No new posts found, check if there's more content
        const hasMore = await postExtractor.hasMoreContent(page)
        if (!hasMore) {
          break
        }
      }

      previousPostCount = allPosts.length

      // Try to load more content
      const hasMore = await postExtractor.hasMoreContent(page)
      if (!hasMore) {
        break
      }

      await scrollHandler.scrollToLoadMore(page, options)
      attempts++
    }

    return allPosts
  }

  const filterUserPosts = (posts, username) => {
    return posts.filter(post => {
      if (!post.url) return false

      const urlLower = post.url.toLowerCase()
      const usernameLower = username.toLowerCase()
      const cleanUsername = usernameLower.replace('@', '')

      // Check if post is by this user on their profile or subdomain
      const isPersonalPost =
        urlLower.includes(`/@${cleanUsername}`) ||
        urlLower.includes(`${cleanUsername}.medium.com`) ||
        urlLower.includes(`medium.com/@${cleanUsername}`)

      // For publication posts, we need to check if they appear on this user's profile
      // Since we're scraping from the user's profile page, assume all posts found here are by them
      // (Medium shows user's posts including publication posts on their profile)
      const isPublicationPost =
        urlLower.includes('medium.com/') &&
        !urlLower.includes('medium.com/@') &&
        !urlLower.includes('medium.com/m/') &&
        !urlLower.includes('/search') &&
        !urlLower.includes('/signin') &&
        !urlLower.includes('/about') &&
        !urlLower.includes('/followers') &&
        !urlLower.includes('privacy-policy') &&
        !urlLower.includes('sitemap')

      return isPersonalPost || isPublicationPost
    })
  }

  // Get posts summary without full discovery
  const getPostsSummary = async (profileUrl, options = {}) => {
    try {
      const result = await discoverPosts(profileUrl, {
        maxScrollAttempts: 2, // Quick summary
        ...options,
      })

      if (!result.success) {
        return result
      }

      return {
        success: true,
        totalCount: result.totalCount,
        username: result.username,
        recentPosts: result.posts.slice(0, LIMITS.RECENT_POSTS_SUMMARY), // First 5 posts
        scrapedAt: result.scrapedAt,
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get posts summary: ${error.message}`,
      }
    }
  }

  // Extract detailed content and metadata from individual posts
  const extractPostContent = async postUrl => {
    let browser = null
    let page = null

    try {
      // Validate authentication
      const isAuthenticated = await authService.isAuthenticated()
      if (!isAuthenticated) {
        return {
          success: false,
          error:
            'Authentication required. Please authenticate with Google OAuth first.',
        }
      }

      // Validate Medium post URL
      if (!postUrl || !postUrl.includes('medium.com')) {
        return {
          success: false,
          error: 'Invalid Medium post URL provided',
        }
      }

      browser = await browserManager.launch({ headless: true })
      page = await browserManager.createPage(browser)

      // Navigate to post page
      await navigator.navigateTo(page, postUrl)

      // Wait for main content to load
      await navigator.waitForSelector(
        page,
        'article, [data-testid="storyContent"]'
      )

      // Extract post content
      const postData = await postExtractor.extractPostContent(page)

      return {
        success: true,
        ...postData,
        extractedAt: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to extract post content: ${error.message}`,
      }
    } finally {
      await browserManager.closePage(page)
      await browserManager.close(browser)
    }
  }

  return {
    discoverPosts,
    getPostsSummary,
    extractPostContent,
  }
}

// Export individual factory functions for testing
export {
  createBrowserManager,
  createPageNavigator,
  createPostExtractor,
  createScrollHandler,
}

// Default export for convenience
export default createScraperService
