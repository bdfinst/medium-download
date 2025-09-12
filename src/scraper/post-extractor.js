import { SELECTORS, LIMITS, EXCLUDED_PATHS } from '../constants.js'

// Factory function for post extraction service
export const createPostExtractor = navigator => {
  const isValidPostUrl = url => {
    if (!url) return false

    // Remove query parameters and fragments for cleaner checking
    const cleanUrl = url.split('?')[0].split('#')[0]

    // Exclude profile homepages explicitly
    if (/^https?:\/\/[^/]+\.medium\.com\/?$/.test(cleanUrl)) {
      return false // This is just the homepage: username.medium.com/
    }
    if (/^https?:\/\/medium\.com\/@[^/]+\/?$/.test(cleanUrl)) {
      return false // This is just the profile: medium.com/@username/
    }

    // Personal profile posts: medium.com/@username/post-title
    if (url.includes('/@')) {
      const pathParts = cleanUrl.split('/')
      // Must have username and post slug
      return pathParts.length >= 5 && pathParts[4] && pathParts[4].length > 0
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
      return pathParts.length > 4 && pathParts[4] && pathParts[4].length > 0
    }

    return false
  }

  const extractPostsFromPage = async page => {
    try {
      // First, let's debug what elements are available on the page
      await navigator.evaluate(page, () => {
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
      const posts = await navigator.evaluate(
        page,
        (selectors, isValidPostUrlStr, limits, excludedPaths) => {
          /* eslint-disable no-undef */

          // Recreate the validation function in browser context
          const isValidPostUrl = new Function('return ' + isValidPostUrlStr)()

          const extractedPosts = []

          // Strategy 1: Traditional article elements
          const articles = document.querySelectorAll(selectors.ARTICLE)
          articles.forEach(article => {
            const titleElement = article.querySelector(selectors.TITLES)
            const linkElement = article.querySelector(selectors.MEDIUM_LINKS)
            const dateElement = article.querySelector(selectors.DATES)

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
          const profileLinks = document.querySelectorAll(selectors.MEDIUM_LINKS)
          profileLinks.forEach(link => {
            if (isValidPostUrl(link.href)) {
              // Find associated title (look in parent containers)
              let titleElement = null
              const container = link.closest('div, article, section')
              if (container) {
                titleElement = container.querySelector(selectors.TITLES)
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
            selectors.POST_CONTAINERS
          )
          postContainers.forEach(container => {
            const titleElement = container.querySelector(selectors.TITLES)
            const linkElement = container.querySelector(selectors.MEDIUM_LINKS)
            const dateElement = container.querySelector(selectors.DATES)

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
                  const titleElement = container.querySelector(selectors.TITLES)
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
              if (
                cleanUrl.includes('signin') &&
                cleanUrl.includes('redirect=')
              ) {
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
                !excludedPaths.some(path => url.includes(path)) &&
                isValidPostUrl(post.url)
              )
            })

          return cleanedPosts
          /* eslint-enable no-undef */
        },
        SELECTORS,
        isValidPostUrl.toString(),
        LIMITS,
        EXCLUDED_PATHS
      )

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
  }

  const hasMoreContent = async page => {
    try {
      const hasMore = await navigator.evaluate(
        page,
        selectors => {
          /* eslint-disable no-undef */
          // Check for explicit end indicators
          const endOfFeed = document.querySelector(selectors.END_OF_FEED)
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
          const scrollableRemaining =
            documentHeight - (scrollTop + windowHeight)

          // If there's significant content below, definitely more to load
          if (scrollableRemaining > 500) return true

          // Check for loading indicators
          const loadingIndicators = document.querySelectorAll(
            selectors.LOADING_INDICATORS
          )

          // Check for "Load more" or "Show more" buttons
          const loadMoreButtons = document.querySelectorAll(
            selectors.LOAD_MORE_BUTTONS
          )

          // Be more aggressive - assume there's more content unless we're sure there isn't
          return (
            loadingIndicators.length > 0 ||
            loadMoreButtons.length > 0 ||
            scrollableRemaining > 50
          )
          /* eslint-enable no-undef */
        },
        SELECTORS
      )

      return hasMore
    } catch {
      return true // Default to true to be more aggressive
    }
  }

  const extractPostContent = async page => {
    try {
      // Extract comprehensive post metadata and content
      const postData = await navigator.evaluate(
        page,
        selectors => {
          /* eslint-disable no-undef */
          const result = {}

          // Extract title
          const titleElement = document.querySelector(selectors.STORY_TITLE)
          result.title = titleElement ? titleElement.textContent.trim() : ''

          // Extract subtitle
          const subtitleElement = document.querySelector(
            selectors.STORY_SUBTITLE
          )
          result.subtitle = subtitleElement
            ? subtitleElement.textContent.trim()
            : ''

          // Extract main content
          const contentElement = document.querySelector(selectors.STORY_CONTENT)
          result.content = contentElement ? contentElement.innerHTML : ''

          // Extract author information
          const authorElement = document.querySelector(selectors.AUTHOR)
          result.author = authorElement ? authorElement.textContent.trim() : ''

          // Extract publication date
          const dateElement = document.querySelector(
            '[data-testid="storyPublishDate"], time'
          )
          result.publishDate = dateElement
            ? dateElement.getAttribute('datetime') ||
              dateElement.textContent.trim()
            : ''

          // Extract tags with comprehensive selectors
          const tagElements = document.querySelectorAll(selectors.TAGS)
          result.tags = Array.from(tagElements)
            .map(tag => tag.textContent.trim())
            .filter(Boolean)
            .filter(tag => tag.length > 0 && tag.length < 50) // Reasonable tag length

          // Extract reading time
          const readingTimeElement = document.querySelector(
            selectors.READING_TIME
          )
          result.readingTime = readingTimeElement
            ? readingTimeElement.textContent.trim()
            : ''

          // Extract claps count
          const clapsElement = document.querySelector(selectors.CLAP_COUNT)
          result.claps = clapsElement
            ? parseInt(clapsElement.textContent.trim()) || 0
            : 0

          // Extract responses count
          const responsesElement = document.querySelector(
            selectors.RESPONSES_COUNT
          )
          result.responses = responsesElement
            ? parseInt(responsesElement.textContent.trim()) || 0
            : 0

          // Extract featured image
          const featuredImageElement = document.querySelector(
            selectors.FEATURED_IMAGE
          )
          result.featuredImage = featuredImageElement
            ? featuredImageElement.src
            : ''

          // Current URL is canonical URL
          result.canonicalUrl = window.location.href
          result.mediumUrl = window.location.href

          // Extract all images in content
          const imageElements = document.querySelectorAll(
            selectors.CONTENT_IMAGES
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
        },
        SELECTORS
      )

      return postData
    } catch (error) {
      throw new Error(`Failed to extract post content: ${error.message}`)
    }
  }

  return {
    extractPostsFromPage,
    hasMoreContent,
    extractPostContent,
  }
}

export default createPostExtractor
