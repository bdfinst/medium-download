import { evaluateWithRetry } from './browser-manager.js'
import { ScraperError, ErrorTypes } from '../error-handling.js'

/**
 * Factory function for post extraction service
 * @returns {Object} Post extraction service
 */
export const createPostExtractionService = () => {
  /**
   * Extract posts from current page view
   */
  const extractPostsFromPage = async (page, options = {}) => {
    try {
      const posts = await evaluateWithRetry(
        page,
        extractionOptions => {
          /* eslint-env browser */
          const { debug = false } = extractionOptions || {}

          // Multiple selectors to find post links
          const selectors = [
            'article a[href*="medium.com"]',
            '.postArticle a[href*="medium.com"]',
            '[data-testid="post-preview"] a',
            'h1 a[href*="medium.com"]',
            'h2 a[href*="medium.com"]',
            'h3 a[href*="medium.com"]',
          ]

          const foundPosts = []
          const seenUrls = new Set()

          for (const selector of selectors) {
            const links = Array.from(
              globalThis.document.querySelectorAll(selector)
            )

            for (const link of links) {
              try {
                const href = link.href
                if (!href || seenUrls.has(href)) continue

                // Basic URL validation
                if (
                  !href.includes('medium.com') ||
                  href.includes('/followers') ||
                  href.includes('/following') ||
                  href.includes('/membership') ||
                  href.includes('/me/') ||
                  href.includes('/settings') ||
                  href.includes('#') ||
                  href.includes('?source=')
                ) {
                  continue
                }

                // Extract title from link text or nearby elements
                let title = link.textContent?.trim() || ''

                if (!title) {
                  const parentArticle = link.closest('article')
                  if (parentArticle) {
                    const titleElements = parentArticle.querySelectorAll(
                      'h1, h2, h3, [data-testid="storyTitle"]'
                    )
                    title =
                      Array.from(titleElements)
                        .map(el => el.textContent?.trim())
                        .find(text => text && text.length > 10) || ''
                  }
                }

                // Skip if no meaningful title found
                if (!title || title.length < 5) continue

                // Try to extract publish date
                let publishDate = null
                const parentElement = link.closest(
                  'article, .postArticle, [data-testid="post-preview"]'
                )
                if (parentElement) {
                  const timeElements = parentElement.querySelectorAll(
                    'time, [datetime], .publishedAt'
                  )
                  for (const timeEl of timeElements) {
                    const dateStr =
                      timeEl.getAttribute('datetime') || timeEl.textContent
                    if (dateStr) {
                      publishDate = dateStr
                      break
                    }
                  }
                }

                // Determine post source context
                let source = 'unknown'
                if (link.closest('article')) source = 'article'
                else if (link.closest('[data-testid="post-preview"]'))
                  source = 'preview'
                else if (link.closest('.postArticle')) source = 'postArticle'
                else if (
                  link.tagName.toLowerCase() === 'h1' ||
                  link.closest('h1')
                )
                  source = 'header'

                foundPosts.push({
                  title: title.substring(0, 200), // Limit title length
                  url: href,
                  publishDate,
                  source,
                })

                seenUrls.add(href)

                if (debug) {
                  console.log(`Found post: ${title} (${source})`)
                }
              } catch (linkError) {
                if (debug) {
                  console.warn('Error processing link:', linkError)
                }
                continue
              }
            }
          }

          return foundPosts
        },
        options
      )

      console.log(`Extracted ${posts.length} posts`)
      return posts
    } catch (error) {
      throw new ScraperError(
        `Failed to extract posts: ${error.message}`,
        ErrorTypes.PARSING
      )
    }
  }

  /**
   * Filter posts to only include user's own posts
   */
  const filterUserPosts = (posts, username, options = {}) => {
    const { includePublications = true } = options

    return posts.filter(post => {
      const url = post.url.toLowerCase()
      const cleanUsername = username.replace('@', '')

      // Check for personal posts
      const isPersonalPost =
        url.includes(`/@${cleanUsername}`) ||
        url.includes(`${cleanUsername}.medium.com`) ||
        url.includes(`medium.com/@${cleanUsername}`)

      if (isPersonalPost) return true

      // Check for publication posts if enabled
      if (includePublications) {
        const isPublicationPost =
          url.includes('medium.com/') &&
          !url.includes('medium.com/@') &&
          !url.includes('medium.com/m/') &&
          !url.includes('medium.com/me/')

        return isPublicationPost
      }

      return false
    })
  }

  /**
   * Enrich posts with additional metadata
   */
  const enrichPostData = async posts => {
    const enrichedPosts = []

    for (const post of posts) {
      try {
        // Add computed fields
        const enrichedPost = {
          ...post,
          slug: extractSlugFromUrl(post.url),
          domain: extractDomainFromUrl(post.url),
          isPublication: isPublicationPost(post.url),
          extractedAt: new Date().toISOString(),
        }

        enrichedPosts.push(enrichedPost)
      } catch (error) {
        // Skip problematic posts but don't fail the entire operation
        console.warn(`Failed to enrich post ${post.url}:`, error.message)
        enrichedPosts.push(post)
      }
    }

    return enrichedPosts
  }

  /**
   * Extract slug from Medium URL
   */
  const extractSlugFromUrl = url => {
    const match = url.match(/\/([^/?#]+)(?:-[a-f0-9]+)?(?:\?.*)?$/)
    return match ? match[1] : null
  }

  /**
   * Extract domain from URL
   */
  const extractDomainFromUrl = url => {
    try {
      return new globalThis.URL(url).hostname
    } catch {
      return null
    }
  }

  /**
   * Check if URL is a publication post
   */
  const isPublicationPost = url => {
    const urlLower = url.toLowerCase()
    return (
      urlLower.includes('medium.com/') &&
      !urlLower.includes('medium.com/@') &&
      !urlLower.includes('medium.com/m/') &&
      !urlLower.includes('medium.com/me/')
    )
  }

  return {
    extractPostsFromPage,
    filterUserPosts,
    enrichPostData,
    extractSlugFromUrl,
    extractDomainFromUrl,
    isPublicationPost,
  }
}
