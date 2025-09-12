/**
 * Test Factories for Creating Mock Objects and Test Data
 * Simplifies test setup and reduces mock complexity
 */

import { createMockFn } from './test-utils.js'

/**
 * Creates a mock browser automation service for testing
 * @param {Object} overrides - Override specific responses
 * @returns {Object} Mock browser service
 */
export const createMockBrowserService = (overrides = {}) => {
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

  const responses = { ...defaults, ...overrides }

  return {
    initializeBrowser: createMockFn(
      Promise.resolve(responses.initializeBrowser)
    ),
    navigateToUrl: createMockFn(Promise.resolve(responses.navigateToUrl)),
    extractPosts: createMockFn(Promise.resolve(responses.extractPosts)),
    checkAuthentication: createMockFn(
      Promise.resolve(responses.checkAuthentication)
    ),
    cleanup: createMockFn(Promise.resolve(responses.cleanup)),
    getPageInfo: createMockFn(Promise.resolve(responses.getPageInfo)),
  }
}

/**
 * Creates mock authentication service
 * @param {Object} config - Authentication configuration
 * @returns {Object} Mock auth service
 */
export const createMockAuthService = (config = {}) => {
  const {
    authenticated = true,
    hasTokens = true,
    expiryDate = Date.now() + 3600000,
  } = config

  return {
    isAuthenticated: createMockFn(Promise.resolve(authenticated)),
    getAuthStatus: createMockFn(
      Promise.resolve({
        authenticated,
        hasTokens,
        expiryDate,
      })
    ),
  }
}

/**
 * Creates sample post data for testing
 * @param {Object} options - Post generation options
 * @returns {Array} Array of mock post objects
 */
export const createMockPosts = (options = {}) => {
  const {
    count = 3,
    username = 'testuser',
    includePublications = false,
  } = options

  const posts = [
    {
      title: 'My First Post',
      url: `https://medium.com/@${username}/my-first-post-abc123`,
      publishDate: '2024-01-15',
      source: 'article',
    },
    {
      title: 'Another Great Post',
      url: `https://medium.com/@${username}/another-great-post-def456`,
      publishDate: '2024-01-20',
      source: 'link',
    },
    {
      title: 'Latest Thoughts',
      url: `https://medium.com/@${username}/latest-thoughts-ghi789`,
      publishDate: '2024-01-25',
      source: 'container',
    },
  ]

  if (includePublications) {
    posts.push(
      {
        title: 'DevOps Best Practices',
        url: 'https://medium.com/devops-weekly/devops-best-practices-123abc',
        publishDate: '2024-01-10T08:00:00Z',
        source: 'article',
      },
      {
        title: 'CI/CD Pipeline Guide',
        url: 'https://better-programming.medium.com/ci-cd-pipeline-guide-456def',
        publishDate: '2024-01-05T12:00:00Z',
        source: 'container',
      }
    )
  }

  return posts.slice(0, count)
}

/**
 * Creates error scenario configurations for testing
 * @param {string} type - Error type ('network', 'auth', 'rate-limit', etc.)
 * @returns {Object} Error configuration
 */
export const createErrorScenario = type => {
  const scenarios = {
    network: {
      error: new Error('ECONNRESET'),
      retryable: true,
      expectedAttempts: 3,
    },
    authentication: {
      error: { statusCode: 401, message: 'Unauthorized' },
      retryable: false,
      expectedAttempts: 1,
    },
    'rate-limit': {
      error: { statusCode: 429, message: 'Rate Limited', retryAfter: 1000 },
      retryable: true,
      expectedAttempts: 2,
    },
    'not-found': {
      error: { statusCode: 404, message: 'Post not found' },
      retryable: false,
      expectedAttempts: 1,
    },
  }

  return scenarios[type] || scenarios['network']
}

/**
 * Builder pattern for creating test scenarios
 */
export class TestScenarioBuilder {
  constructor() {
    this.scenario = {
      posts: createMockPosts(),
      authentication: { authenticated: true },
      navigation: { success: true },
      extraction: { success: true },
    }
  }

  withPosts(posts) {
    this.scenario.posts = posts
    return this
  }

  withAuthentication(authenticated) {
    this.scenario.authentication = { authenticated }
    return this
  }

  withNavigationFailure(error) {
    this.scenario.navigation = { success: false, error }
    return this
  }

  withExtractionFailure(error) {
    this.scenario.extraction = { success: false, error }
    return this
  }

  withUnauthenticatedUser() {
    this.scenario.authentication = { authenticated: false }
    return this
  }

  withPublicationPosts() {
    this.scenario.posts = createMockPosts({ includePublications: true })
    return this
  }

  build() {
    return this.scenario
  }
}

/**
 * Creates a complete test scenario with browser service configured
 * @param {Object} scenario - Scenario configuration
 * @returns {Object} Complete test setup
 */
export const createTestSetup = (scenario = {}) => {
  const builder = new TestScenarioBuilder()

  if (scenario.unauthenticated) {
    builder.withUnauthenticatedUser()
  }

  if (scenario.posts) {
    builder.withPosts(scenario.posts)
  }

  if (scenario.includePublications) {
    builder.withPublicationPosts()
  }

  const testScenario = builder.build()

  const browserService = createMockBrowserService({
    extractPosts: {
      success: testScenario.extraction.success,
      posts: testScenario.posts,
      totalExtracted: testScenario.posts.length,
      scrollAttempts: 2,
    },
    checkAuthentication: {
      success: true,
      authenticated: testScenario.authentication.authenticated,
    },
  })

  const authService = createMockAuthService({
    authenticated: testScenario.authentication.authenticated,
  })

  return {
    browserService,
    authService,
    scenario: testScenario,
  }
}
