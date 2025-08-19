// Composable post extraction strategies
import { curry } from '../utils/functional.js'

// Helper functions for DOM manipulation
const getText = element => element?.textContent?.trim() || ''
const getAttribute = curry((attr, element) => element?.getAttribute(attr))
const querySelector = curry((selector, container) =>
  container?.querySelector(selector)
)
const querySelectorAll = curry((selector, container) =>
  Array.from(container?.querySelectorAll(selector) || [])
)

// Post factory function
const createPost = (title, url, publishDate = null, source = 'unknown') => ({
  title: title || 'Untitled',
  url,
  publishDate,
  source,
})

// Strategy 1: Traditional article elements
export const createArticleStrategy = isValidUrl => ({
  name: 'article',
  extract: document => {
    const articles = querySelectorAll('article', document)

    return articles
      .map(extractPostFromArticle)
      .filter(post => post && isValidUrl(post.url))
  },
})

const extractPostFromArticle = article => {
  const titleElement = querySelector(
    'h1, h2, h3, [data-testid*="title"], .h4, .h5',
    article
  )
  const linkElement = querySelector(
    'a[href*="/@"], a[href*=".medium.com"], a[href*="medium.com/"]',
    article
  )
  const dateElement = querySelector(
    'time, [datetime], .date, [data-testid*="date"]',
    article
  )

  if (!titleElement || !linkElement) return null

  const title = getText(titleElement)
  const url = linkElement.href
  const publishDate =
    getText(dateElement) || getAttribute('datetime', dateElement)

  return createPost(title, url, publishDate, 'article')
}

// Strategy 2: Direct link-based extraction
export const createLinkStrategy = isValidUrl => ({
  name: 'link',
  extract: document => {
    const links = querySelectorAll(
      'a[href*="/@"], a[href*=".medium.com"], a[href*="medium.com/"]',
      document
    )

    return links
      .filter(link => isValidUrl(link.href))
      .map(extractPostFromLink)
      .filter(Boolean)
  },
})

const extractPostFromLink = link => {
  const title = findTitleForLink(link)

  if (!title) return null

  return createPost(title, link.href, null, 'link')
}

const findTitleForLink = link => {
  // Look in parent containers
  const container = link.closest('div, article, section')
  let titleElement = null

  if (container) {
    titleElement = querySelector(
      'h1, h2, h3, h4, h5, [data-testid*="title"]',
      container
    )
  }

  // Fallback to link itself
  if (!titleElement) {
    titleElement = querySelector('h1, h2, h3, h4, h5', link)
  }

  // Use link text as last resort
  return getText(titleElement) || getText(link) || null
}

// Strategy 3: Medium's data structures
export const createContainerStrategy = isValidUrl => ({
  name: 'container',
  extract: document => {
    const containers = querySelectorAll(
      '[data-testid*="post"], [data-testid*="story"], .postArticle, .streamItem',
      document
    )

    return containers
      .map(extractPostFromContainer)
      .filter(post => post && isValidUrl(post.url))
  },
})

const extractPostFromContainer = container => {
  const titleElement = querySelector(
    'h1, h2, h3, h4, [data-testid*="title"], .graf--title',
    container
  )
  const linkElement = querySelector(
    'a[href*="/@"], a[href*=".medium.com"], a[href*="medium.com/"]',
    container
  )
  const dateElement = querySelector('time, [datetime], .readingTime', container)

  if (!titleElement || !linkElement) return null

  const title = getText(titleElement)
  const url = linkElement.href
  const publishDate =
    getText(dateElement) || getAttribute('datetime', dateElement)

  return createPost(title, url, publishDate, 'container')
}

// Strategy 4: Comprehensive fallback strategy
export const createComprehensiveStrategy = isValidUrl => ({
  name: 'comprehensive',
  extract: document => {
    const allLinks = querySelectorAll('a[href]', document)

    const candidateLinks = allLinks
      .filter(
        link =>
          link.href.includes('medium.com') &&
          (link.href.includes('redirect=') ||
            link.href.includes('actionUrl=') ||
            link.href.match(/[a-f0-9]{12}/) || // 12-char hex string common in Medium post IDs
            link.href.includes('source=user_profile'))
      )
      .filter(link => isValidUrl(link.href))

    return candidateLinks.map(extractPostFromLink).filter(Boolean)
  },
})

// Main extraction orchestrator
export const createPostExtractor = isValidUrl => {
  const strategies = [
    createArticleStrategy(isValidUrl),
    createLinkStrategy(isValidUrl),
    createContainerStrategy(isValidUrl),
    createComprehensiveStrategy(isValidUrl),
  ]

  return {
    extractAll: document => {
      // Use Map to deduplicate by URL automatically
      const postsMap = new Map()

      strategies.forEach(strategy => {
        try {
          const posts = strategy.extract(document)
          posts.forEach(post => {
            if (post && post.url) {
              postsMap.set(post.url, post)
            }
          })
        } catch (error) {
          console.warn(`Strategy ${strategy.name} failed:`, error.message)
        }
      })

      return Array.from(postsMap.values())
    },

    // For testing individual strategies
    strategies,
  }
}
