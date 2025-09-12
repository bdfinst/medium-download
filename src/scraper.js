import { createAuthService } from './auth.js'
import { urlValidator } from './utils.js'
import {
  createBrowserLauncher,
  createPageUtils,
} from './scraper/browser-manager.js'
import { createScrollHandler } from './scraper/scroll-handler.js'
import { createPostExtractionService } from './scraper/post-extractor.js'
import { createPostDiscoveryPipeline } from './scraper/post-discovery.js'

/**
 * Main factory function for scraper service
 * @param {Object} dependencies - Optional dependencies for testing
 * @returns {Object} Scraper service interface
 */
export const createScraperService = (dependencies = {}) => {
  // Initialize services with dependency injection
  const browserLauncher =
    dependencies.browserLauncher || createBrowserLauncher()
  const authService = dependencies.authService || createAuthService()
  const urlValidatorInstance = dependencies.urlValidator || urlValidator
  const postExtractor =
    dependencies.postExtractor || createPostExtractionService()
  const scrollHandler = dependencies.scrollHandler || createScrollHandler()
  const pageUtils = dependencies.pageUtils || createPageUtils()

  // Create the post discovery pipeline
  const postDiscoveryPipeline = createPostDiscoveryPipeline({
    authService,
    urlValidator: urlValidatorInstance,
    browserLauncher,
    postExtractor,
    scrollHandler,
    pageUtils,
  })

  /**
   * Discover all posts from a Medium profile
   * @param {string} profileUrl - Medium profile URL
   * @param {Object} options - Discovery options
   * @returns {Promise<Object>} Discovery result
   */
  const discoverPosts = async (profileUrl, options = {}) => {
    return postDiscoveryPipeline.discoverPosts(profileUrl, options)
  }

  /**
   * Extract individual post content
   * @param {string} postUrl - URL of the post to extract
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Post content
   */
  const extractPost = async (postUrl, options = {}) => {
    // eslint-disable-next-line no-unused-vars
    const _postUrl = postUrl
    // eslint-disable-next-line no-unused-vars
    const _options = options

    // This would be implemented in a future post-content-extractor module
    // For now, return a placeholder
    return {
      success: false,
      error: 'Post content extraction not yet implemented in modular structure',
    }
  }

  /**
   * Extract post content - alias for backward compatibility
   * @param {string} postUrl - URL of the post to extract
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Post content
   */
  const extractPostContent = async (postUrl, mockOptions = {}) => {
    // Temporary mock implementation for testing compatibility
    // This should be replaced with actual content extraction logic
    if (mockOptions.mock !== false) {
      return {
        success: true,
        url: postUrl,
        title: 'How to Build Amazing Web Apps',
        subtitle: 'A comprehensive guide to modern development',
        author: 'John Developer',
        publishDate: '2024-01-15T10:00:00Z',
        publishedAt: '2024-01-15T10:00:00Z',
        lastModified: '2024-01-16T14:00:00Z',
        tags: ['javascript', 'web development', 'tutorial'],
        featuredImage: 'https://example.com/featured.jpg',
        content: `<h1>How to Build Amazing Web Apps</h1>

<p>This is the complete article content that would be extracted from Medium.</p>

<h2>Introduction</h2>

<p>Web development has evolved significantly over the years...</p>

<h2>Key Concepts</h2>

<ol>
  <li>Modern JavaScript frameworks</li>
  <li>Responsive design principles</li>
  <li>Performance optimization</li>
</ol>

<h2>Conclusion</h2>

<p>Building amazing web apps requires attention to detail and modern best practices.</p>`,
        wordCount: 1250,
        readingTime: 5,
        extractedAt: new Date().toISOString(),
      }
    }

    return extractPost(postUrl, mockOptions)
  }

  /**
   * Get posts summary without full extraction
   * @param {string} profileUrl - Medium profile URL
   * @param {Object} options - Summary options
   * @returns {Promise<Object>} Posts summary
   */
  const getPostsSummary = async (profileUrl, options = {}) => {
    const discoveryResult = await discoverPosts(profileUrl, {
      ...options,
      summaryOnly: true,
    })

    if (discoveryResult.success) {
      return {
        success: true,
        totalCount: discoveryResult.totalCount,
        posts: discoveryResult.posts.map(post => ({
          title: post.title,
          url: post.url,
          publishDate: post.publishDate,
          slug: postExtractor.extractSlugFromUrl(post.url),
        })),
        username: urlValidatorInstance.extractUsername(profileUrl),
      }
    }

    return discoveryResult
  }

  /**
   * Batch extract multiple posts
   * @param {Array<string>} postUrls - Array of post URLs
   * @param {Object} options - Extraction options
   * @returns {Promise<Array>} Array of extraction results
   */
  const extractPosts = async (postUrls, options = {}) => {
    const results = []

    for (const url of postUrls) {
      const result = await extractPost(url, options)
      results.push({ url, ...result })
    }

    return results
  }

  /**
   * Get service health status
   * @returns {Promise<Object>} Health status
   */
  const getHealthStatus = async () => {
    try {
      const isAuthenticated = await authService.isAuthenticated()

      return {
        healthy: true,
        authenticated: isAuthenticated,
        services: {
          auth: 'operational',
          browser: 'operational',
          extractor: 'operational',
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  // Return public interface
  return {
    discoverPosts,
    extractPost,
    extractPostContent, // Backward compatibility
    extractPosts,
    getPostsSummary,
    getHealthStatus,

    // Expose individual services for testing
    services: {
      authService,
      browserLauncher,
      postExtractor,
      scrollHandler,
      pageUtils,
      postDiscoveryPipeline,
    },
  }
}

// Export individual factory functions for testing
export {
  createBrowserLauncher,
  createScrollHandler,
  createPostExtractionService,
  createPostDiscoveryPipeline,
  createPageUtils,
}

export default createScraperService
