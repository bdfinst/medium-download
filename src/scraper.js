import puppeteer from 'puppeteer'

import { createAuthService } from './auth.js'
import { urlValidator } from './utils.js'

// Factory function for creating browser launcher
const createBrowserLauncher = () => ({
  launch: async (options = {}) => {
    const browser = await puppeteer.launch({
      headless: true,
      ...options,
    })
    return browser
  },
})

// Factory function for post extraction logic
const createPostExtractor = () => ({
  extractPostsFromPage: async page => {
    try {
      // First, let's debug what elements are available on the page
      await page.evaluate(() => {
        /* eslint-disable no-undef */
        const articles = document.querySelectorAll('article')
        const divs = document.querySelectorAll('div[data-testid]')
        const mediumLinks = document.querySelectorAll('a[href*="/@"]')
        const subdomainLinks = document.querySelectorAll(
          'a[href*=".medium.com"]'
        )
        const allLinks = document.querySelectorAll('a[href]')

        // Look specifically for potential post URLs
        const potentialPostLinks = Array.from(allLinks).filter(link => {
          const href = link.href
          return (
            href.includes('medium.com') &&
            (href.includes('redirect=') ||
              href.includes('actionUrl=') ||
              href.match(/[a-f0-9]{12}/) || // 12-char hex string common in Medium post IDs
              href.includes('source=user_profile'))
          )
        })

        return {
          articleCount: articles.length,
          testIdDivs: Array.from(divs).map(div =>
            div.getAttribute('data-testid')
          ),
          mediumLinkCount: mediumLinks.length,
          subdomainLinkCount: subdomainLinks.length,
          totalLinkCount: allLinks.length,
          potentialPostLinks: potentialPostLinks.slice(0, 5).map(link => ({
            href: link.href,
            text: link.textContent?.trim()?.substring(0, 50),
          })),
          firstFewLinks: Array.from(allLinks)
            .slice(0, 10)
            .map(link => ({
              href: link.href,
              text: link.textContent?.trim()?.substring(0, 50),
            }))
            .filter(link => link.href.includes('medium.com')),
        }
        /* eslint-enable no-undef */
      })

      // Try multiple selector strategies to find posts
      const posts = await page.evaluate(() => {
        /* eslint-disable no-undef */

        // Helper function to validate if URL is an actual post (not profile/domain)
        const isValidPostUrl = url => {
          if (!url) return false

          // Remove query parameters and fragments for cleaner checking
          const cleanUrl = url.split('?')[0].split('#')[0]

          // Exclude profile homepages explicitly
          if (cleanUrl.match(/^https?:\/\/[^/]+\.medium\.com\/?$/)) {
            return false // This is just the homepage: username.medium.com/
          }
          if (cleanUrl.match(/^https?:\/\/medium\.com\/@[^/]+\/?$/)) {
            return false // This is just the profile: medium.com/@username/
          }

          // Personal profile posts: medium.com/@username/post-title
          if (url.includes('/@')) {
            const pathParts = cleanUrl.split('/')
            // Must have username and post slug
            return (
              pathParts.length >= 5 && pathParts[4] && pathParts[4].length > 0
            )
          }

          // Subdomain posts: username.medium.com/post-title (but not just the domain)
          if (url.includes('.medium.com')) {
            const pathParts = cleanUrl.split('/')
            return (
              pathParts.length > 3 &&
              !cleanUrl.endsWith('.medium.com/') &&
              !cleanUrl.endsWith('.medium.com') &&
              pathParts[3] !== '' &&
              pathParts[3].length > 8 // Post slugs are typically longer
            )
          }

          // Publication posts: medium.com/publication/post-title
          if (
            url.includes('medium.com/') &&
            !url.includes('medium.com/@') &&
            !url.includes('medium.com/m/')
          ) {
            const pathParts = cleanUrl.split('/')
            return (
              pathParts.length > 4 && pathParts[4] && pathParts[4].length > 0
            )
          }

          return false
        }

        const extractedPosts = []

        // Strategy 1: Traditional article elements
        const articles = document.querySelectorAll('article')
        articles.forEach(article => {
          const titleElement = article.querySelector(
            'h1, h2, h3, [data-testid*="title"], .h4, .h5'
          )
          const linkElement = article.querySelector(
            'a[href*="/@"], a[href*=".medium.com"], a[href*="medium.com/"]'
          )
          const dateElement = article.querySelector(
            'time, [datetime], .date, [data-testid*="date"]'
          )

          if (titleElement && linkElement) {
            const url = linkElement.href
            if (isValidPostUrl(url)) {
              extractedPosts.push({
                title: titleElement.textContent?.trim() || 'Untitled',
                url,
                publishDate:
                  dateElement?.textContent?.trim() ||
                  dateElement?.getAttribute('datetime') ||
                  null,
                source: 'article',
              })
            }
          }
        })

        // Strategy 2: Direct link-based extraction (including publication posts)
        const profileLinks = document.querySelectorAll(
          'a[href*="/@"], a[href*=".medium.com"], a[href*="medium.com/"]'
        )
        profileLinks.forEach(link => {
          if (isValidPostUrl(link.href)) {
            // Find associated title (look in parent containers)
            let titleElement = null
            const container = link.closest('div, article, section')
            if (container) {
              titleElement = container.querySelector(
                'h1, h2, h3, h4, h5, [data-testid*="title"]'
              )
            }

            if (!titleElement) {
              titleElement = link.querySelector('h1, h2, h3, h4, h5')
            }

            if (titleElement || link.textContent?.trim()) {
              const title =
                titleElement?.textContent?.trim() ||
                link.textContent?.trim() ||
                'Untitled'
              // Avoid duplicate posts
              if (!extractedPosts.some(post => post.url === link.href)) {
                extractedPosts.push({
                  title,
                  url: link.href,
                  publishDate: null,
                  source: 'link',
                })
              }
            }
          }
        })

        // Strategy 3: Look for Medium's newer data structures
        const postContainers = document.querySelectorAll(
          '[data-testid*="post"], [data-testid*="story"], .postArticle, .streamItem'
        )
        postContainers.forEach(container => {
          const titleElement = container.querySelector(
            'h1, h2, h3, h4, [data-testid*="title"], .graf--title'
          )
          const linkElement = container.querySelector(
            'a[href*="/@"], a[href*=".medium.com"], a[href*="medium.com/"]'
          )
          const dateElement = container.querySelector(
            'time, [datetime], .readingTime'
          )

          if (titleElement && linkElement) {
            const url = linkElement.href
            if (isValidPostUrl(url)) {
              if (!extractedPosts.some(post => post.url === url)) {
                extractedPosts.push({
                  title: titleElement.textContent?.trim() || 'Untitled',
                  url,
                  publishDate:
                    dateElement?.textContent?.trim() ||
                    dateElement?.getAttribute('datetime') ||
                    null,
                  source: 'container',
                })
              }
            }
          }
        })

        // Strategy 4: Comprehensive link search for wrapped/encoded URLs
        const allPageLinks = document.querySelectorAll('a[href]')
        allPageLinks.forEach(link => {
          const href = link.href

          // Look for URLs that might contain post references
          if (
            href.includes('medium.com') &&
            (href.includes('redirect=') ||
              href.includes('actionUrl=') ||
              href.match(/[a-f0-9]{12}/))
          ) {
            // Extract title from the link text or nearby elements
            let title = link.textContent?.trim() || ''

            // If link has no text, look in parent elements
            if (!title || title.length < 5) {
              const container = link.closest('article, div, section')
              if (container) {
                const titleElement = container.querySelector(
                  'h1, h2, h3, h4, h5, [data-testid*="title"]'
                )
                if (titleElement) {
                  title = titleElement.textContent?.trim() || 'Untitled'
                }
              }
            }

            // Only include if we have a meaningful title and haven't seen this URL
            if (
              title &&
              title.length > 5 &&
              !extractedPosts.some(post => post.url === href)
            ) {
              extractedPosts.push({
                title,
                url: href,
                publishDate: null,
                source: 'comprehensive',
              })
            }
          }
        })

        // Clean up URLs to extract actual post URLs from signin/redirect URLs
        const cleanedPosts = extractedPosts
          .map(post => {
            let cleanUrl = post.url

            // Extract the actual URL from signin redirect parameters
            if (cleanUrl.includes('signin') && cleanUrl.includes('redirect=')) {
              const urlParams = new URLSearchParams(cleanUrl.split('?')[1])
              const redirectUrl = urlParams.get('redirect')
              if (redirectUrl) {
                cleanUrl = decodeURIComponent(redirectUrl)
              }
            }

            // Extract actual URL from actionUrl parameters (bookmark URLs)
            if (cleanUrl.includes('actionUrl=')) {
              const urlParams = new URLSearchParams(cleanUrl.split('?')[1])
              const actionUrl = urlParams.get('actionUrl')
              if (actionUrl) {
                cleanUrl = decodeURIComponent(actionUrl)
              }
            }

            return {
              ...post,
              url: cleanUrl,
              originalUrl: post.url,
            }
          })
          .filter(post => {
            // Filter out non-post URLs
            const url = post.url.toLowerCase()
            return (
              !url.includes('/m/signin') &&
              !url.includes('/search') &&
              !url.includes('/followers') &&
              !url.includes('/about') &&
              !url.includes('privacy-policy') &&
              !url.includes('sitemap') &&
              // Use the same validation as our helper function
              isValidPostUrl(post.url)
            )
          })

        return cleanedPosts
        /* eslint-enable no-undef */
      })

      console.log(`Extracted ${posts.length} posts`)

      return posts.filter(
        post =>
          post.url &&
          (post.url.includes('/@') ||
            post.url.includes('.medium.com') ||
            (post.url.includes('medium.com/') &&
              !post.url.includes('medium.com/m/') &&
              !post.url.includes('medium.com/@')))
      )
    } catch (error) {
      throw new Error(`Failed to extract posts: ${error.message}`)
    }
  },

  hasMoreContent: async page => {
    try {
      const hasMore = await page.evaluate(() => {
        /* eslint-disable no-undef */
        // Check for explicit end indicators
        const endOfFeed = document.querySelector(
          '[data-testid="end-of-feed"], .end-of-feed'
        )
        if (endOfFeed) return false

        // Check for "no more posts" type messages
        const noMoreText = document.querySelector('*')?.textContent || ''
        if (
          noMoreText.includes('No more posts') ||
          noMoreText.includes('End of results')
        ) {
          return false
        }

        // Check scroll position - be more lenient about what constitutes "more content"
        const documentHeight = document.documentElement.scrollHeight
        const windowHeight = window.innerHeight
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop
        const scrollableRemaining = documentHeight - (scrollTop + windowHeight)

        // If there's significant content below, definitely more to load
        if (scrollableRemaining > 500) return true

        // Check for loading indicators
        const loadingIndicators = document.querySelectorAll(
          '[data-testid="loading"], .loading, [aria-label*="loading"], [role="progressbar"], .spinner'
        )

        // Check for "Load more" or "Show more" buttons
        const loadMoreButtons = document.querySelectorAll(
          'button[aria-label*="more"], button[aria-label*="load"], [data-testid*="load-more"]'
        )

        // Be more aggressive - assume there's more content unless we're sure there isn't
        return (
          loadingIndicators.length > 0 ||
          loadMoreButtons.length > 0 ||
          scrollableRemaining > 50
        )
        /* eslint-enable no-undef */
      })

      return hasMore
    } catch {
      return true // Default to true to be more aggressive
    }
  },
})

// Factory function for scroll handling
const createScrollHandler = () => ({
  scrollToLoadMore: async page => {
    try {
      // Get current page height and post count before scrolling
      const beforeState = await page.evaluate(() => {
        /* eslint-disable no-undef */
        return {
          height: document.documentElement.scrollHeight,
          postCount: document.querySelectorAll(
            'article, [data-testid*="post"], [data-testid*="story"]'
          ).length,
          linkCount: document.querySelectorAll('a[href*="medium.com"]').length,
        }
        /* eslint-enable no-undef */
      })

      // Try multiple scroll strategies
      for (let strategy = 0; strategy < 3; strategy++) {
        if (strategy === 0) {
          // Strategy 1: Slow scroll to bottom
          await page.evaluate(() => {
            /* eslint-disable no-undef */
            const scrollStep = window.innerHeight * 0.8
            const totalHeight = document.documentElement.scrollHeight
            let currentScroll = window.pageYOffset

            const scrollInterval = setInterval(() => {
              currentScroll += scrollStep
              window.scrollTo(0, currentScroll)

              if (currentScroll >= totalHeight) {
                clearInterval(scrollInterval)
              }
            }, 300) // Scroll every 300ms

            // Clear after 3 seconds
            setTimeout(() => clearInterval(scrollInterval), 3000)
            /* eslint-enable no-undef */
          })

          await new Promise(resolve => setTimeout(resolve, 3500))
        } else if (strategy === 1) {
          // Strategy 2: Jump to bottom and trigger events
          await page.evaluate(() => {
            /* eslint-disable no-undef */
            window.scrollTo(0, document.documentElement.scrollHeight)

            // Trigger scroll events manually
            window.dispatchEvent(new Event('scroll'))
            window.dispatchEvent(new Event('resize'))
            /* eslint-enable no-undef */
          })

          await new Promise(resolve => setTimeout(resolve, 4000))
        } else {
          // Strategy 3: Multiple small scrolls with pauses
          await page.evaluate(() => {
            /* eslint-disable no-undef */
            const viewHeight = window.innerHeight
            const totalHeight = document.documentElement.scrollHeight
            let currentScroll = window.pageYOffset

            // Scroll in 5 increments
            for (let i = 0; i < 5; i++) {
              setTimeout(() => {
                currentScroll += viewHeight * 0.6
                window.scrollTo(0, Math.min(currentScroll, totalHeight))
              }, i * 800)
            }
            /* eslint-enable no-undef */
          })

          await new Promise(resolve => setTimeout(resolve, 5000))
        }

        // Check for new content after each strategy
        const afterState = await page.evaluate(() => {
          /* eslint-disable no-undef */
          return {
            height: document.documentElement.scrollHeight,
            postCount: document.querySelectorAll(
              'article, [data-testid*="post"], [data-testid*="story"]'
            ).length,
            linkCount: document.querySelectorAll('a[href*="medium.com"]')
              .length,
          }
          /* eslint-enable no-undef */
        })

        // If we found new content, break early
        if (
          afterState.height > beforeState.height ||
          afterState.postCount > beforeState.postCount ||
          afterState.linkCount > beforeState.linkCount
        ) {
          break
        }
      }

      // Try clicking any load more buttons
      try {
        const loadMoreButtons = await page.$$(
          'button[aria-label*="more"], button[aria-label*="load"], [data-testid*="load-more"]'
        )
        for (const button of loadMoreButtons) {
          await button.click()
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.error(
          'No load more buttons found or click failed:',
          error.message
        )
      }

      // Final wait for any async content loading
      await new Promise(resolve => setTimeout(resolve, 2000))

      return true
    } catch (error) {
      console.error(`Scroll error: ${error.message}`)
      return false
    }
  },
})

// Main factory function for scraper service
export const createScraperService = (dependencies = {}) => {
  const browserLauncher =
    dependencies.browserLauncher || createBrowserLauncher()
  const authService = dependencies.authService || createAuthService()
  const urlValidatorInstance = dependencies.urlValidator || urlValidator
  const postExtractor = dependencies.postExtractor || createPostExtractor()
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

      // Launch browser
      browser = await browserLauncher.launch({
        headless: options.headless !== false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })

      page = await browser.newPage()

      // Set user agent to avoid blocking
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )

      // Navigate to profile page using normalized URL
      await page.goto(normalizedUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      console.log(`Looking for posts by user: ${username}`)

      // Wait for Medium's content to fully load
      console.log('Waiting for page content to load...')

      // Wait for the page to be more fully rendered
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Get page title and basic info for debugging
      const currentUrl = page.url()

      // Check if we were redirected or if there's an error
      if (currentUrl.includes('error') || currentUrl.includes('404')) {
        throw new Error(
          `Profile page not accessible: redirected to ${currentUrl}`
        )
      }

      // Wait for content to load - try multiple selectors with longer timeout
      try {
        await page.waitForFunction(
          () => {
            /* eslint-disable no-undef */
            return (
              document.querySelectorAll(
                'article, [data-testid*="post"], [data-testid*="story"], a[href*="/@"]'
              ).length > 0
            )
            /* eslint-enable no-undef */
          },
          { timeout: 20000 }
        )
      } catch (error) {
        console.error(error)
      }

      // Take a screenshot for debugging if enabled
      if (options.debug) {
        try {
          await page.screenshot({
            path: 'debug-medium-page.png',
            fullPage: true,
          })
        } catch (error) {
          console.log('Failed to save screenshot:', error.message)
        }
      }

      let allPosts = []
      let previousPostCount = 0
      let attempts = 0
      const maxAttempts = options.maxScrollAttempts || 20

      // Collect posts with infinite scroll handling
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

        await scrollHandler.scrollToLoadMore(page)
        attempts++
      }

      // Filter to only include posts from this user (including publication posts)
      const userPosts = allPosts.filter(post => {
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

      console.log(
        `Debug - After filtering for user ${username}: ${userPosts.length} posts`
      )

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
      try {
        if (page) await page.close()
        if (browser) await browser.close()
      } catch {
        // Ignore cleanup errors
      }
    }
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
        recentPosts: result.posts.slice(0, 5), // First 5 posts
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

      browser = await browserLauncher.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })

      page = await browser.newPage()
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )

      await page.goto(postUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      // Wait for main content to load
      await page.waitForSelector('article, [data-testid="storyContent"]', {
        timeout: 15000,
      })

      // Extract comprehensive post metadata and content
      const postData = await page.evaluate(() => {
        /* eslint-disable no-undef */
        const result = {}

        // Extract title
        const titleElement = document.querySelector(
          'h1, [data-testid="storyTitle"]'
        )
        result.title = titleElement ? titleElement.textContent.trim() : ''

        // Extract subtitle
        const subtitleElement = document.querySelector(
          'h2, [data-testid="storySubtitle"]'
        )
        result.subtitle = subtitleElement
          ? subtitleElement.textContent.trim()
          : ''

        // Extract main content
        const contentElement = document.querySelector(
          'article, [data-testid="storyContent"]'
        )
        result.content = contentElement ? contentElement.innerHTML : ''

        // Extract author information
        const authorElement = document.querySelector(
          '[data-testid="authorName"], .author-name'
        )
        result.author = authorElement ? authorElement.textContent.trim() : ''

        // Extract publication date
        const dateElement = document.querySelector(
          'time, [data-testid="storyPublishDate"]'
        )
        result.publishDate = dateElement
          ? dateElement.getAttribute('datetime') ||
            dateElement.textContent.trim()
          : ''

        // Extract tags
        const tagElements = document.querySelectorAll(
          '[data-testid="tag"], .tag'
        )
        result.tags = Array.from(tagElements)
          .map(tag => tag.textContent.trim())
          .filter(Boolean)

        // Extract reading time
        const readingTimeElement = document.querySelector(
          '[data-testid="readingTime"], .reading-time'
        )
        result.readingTime = readingTimeElement
          ? readingTimeElement.textContent.trim()
          : ''

        // Extract claps count
        const clapsElement = document.querySelector(
          '[data-testid="clap-count"], .clap-count'
        )
        result.claps = clapsElement
          ? parseInt(clapsElement.textContent.trim()) || 0
          : 0

        // Extract responses count
        const responsesElement = document.querySelector(
          '[data-testid="responses-count"], .responses-count'
        )
        result.responses = responsesElement
          ? parseInt(responsesElement.textContent.trim()) || 0
          : 0

        // Extract featured image
        const featuredImageElement = document.querySelector(
          'img[data-testid="featured-image"], article img:first-of-type'
        )
        result.featuredImage = featuredImageElement
          ? featuredImageElement.src
          : ''

        // Current URL is canonical URL
        result.canonicalUrl = window.location.href
        result.mediumUrl = window.location.href

        // Extract all images in content
        const imageElements = document.querySelectorAll(
          'article img, [data-testid="storyContent"] img'
        )
        result.images = Array.from(imageElements).map(img => ({
          src: img.src,
          alt: img.alt || '',
          title: img.title || '',
        }))

        // Extract last modified date (if available)
        const lastModifiedElement = document.querySelector(
          '[data-testid="lastModified"]'
        )
        result.lastModified = lastModifiedElement
          ? lastModifiedElement.textContent.trim()
          : result.publishDate

        return result
        /* eslint-enable no-undef */
      })

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
      try {
        if (page) await page.close()
        if (browser) await browser.close()
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  return {
    discoverPosts,
    getPostsSummary,
    extractPostContent,
  }
}

// Export individual factory functions for testing
export { createBrowserLauncher, createPostExtractor, createScrollHandler }

// Default export for convenience
export default createScraperService
