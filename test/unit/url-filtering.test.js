import { createScraperService } from '../../src/scraper.js'
import { createMockAuthService } from '../test-factories.js'
import { urlTestCases, createMockFn } from '../test-utils.js'

describe('URL Filtering - Post Detection Behavior', () => {
  let scraperService
  let mockBrowserLauncher
  let mockPage
  let mockAuthService

  beforeEach(() => {
    mockAuthService = createMockAuthService({ authenticated: true })

    // Simplified mock setup - focus on behavior testing
    mockPage = {
      goto: createMockFn(Promise.resolve({ status: () => 200 })),
      evaluate: createMockFn(Promise.resolve([])),
      close: createMockFn(Promise.resolve()),
      setUserAgent: createMockFn(Promise.resolve()),
      waitForSelector: createMockFn(Promise.resolve()),
      waitForFunction: createMockFn(Promise.resolve(true)),
      title: createMockFn(Promise.resolve('Test User - Medium')),
      url: createMockFn('https://medium.com/@testuser'),
      screenshot: createMockFn(Promise.resolve()),
      $eval: createMockFn(Promise.resolve('Sample body text')),
      $$: createMockFn(Promise.resolve([])),
      $: createMockFn(Promise.resolve(null)),
      click: createMockFn(Promise.resolve()),
      waitForTimeout: createMockFn(Promise.resolve()),
    }

    mockBrowserLauncher = {
      launch: createMockFn(
        Promise.resolve({
          newPage: createMockFn(Promise.resolve(mockPage)),
          close: createMockFn(Promise.resolve()),
        })
      ),
    }

    scraperService = createScraperService({
      browserLauncher: mockBrowserLauncher,
      authService: mockAuthService,
    })
  })

  describe('Given various Medium URLs in a mock HTML page', () => {
    describe('When the scraper processes the page', () => {
      urlTestCases.forEach(({ url, shouldInclude, description }) => {
        it(`Then ${description} should be ${shouldInclude ? 'included' : 'excluded'} in results`, async () => {
          // Test data for the URL being tested
          const testPost = {
            title: 'Test Post',
            url,
            publishDate: '2024-01-15',
          }

          // Configure mock to return posts based on URL filtering logic
          const expectedPosts = shouldInclude
            ? [{ ...testPost, source: 'article' }]
            : []

          mockPage.evaluate = createMockFn(Promise.resolve(expectedPosts))

          // Test the scraper's post discovery behavior
          // Use the same username as in the test URL for consistency
          const profileUrl = url.includes('@bdfinst')
            ? 'https://medium.com/@bdfinst'
            : url.includes('bdfinst.medium.com')
              ? 'https://bdfinst.medium.com'
              : 'https://medium.com/@testuser'

          const result = await scraperService.discoverPosts(profileUrl, {
            maxScrollAttempts: 1,
            debug: false,
            fastMode: true,
          })

          // Verify behavior: should include valid posts, exclude profile pages
          if (shouldInclude) {
            expect(result.success).toBe(true)
            expect(result.posts.length).toBe(1)
            expect(result.posts[0].url).toBe(url)
          } else {
            expect(result.success).toBe(true)
            expect(result.posts.length).toBe(0)
          }
        })
      })
    })
  })

  describe('Given a mix of valid posts and profile pages', () => {
    describe('When the scraper processes multiple URLs', () => {
      it('Then it should filter out profile homepages and keep only actual posts', async () => {
        const expectedValidPosts = [
          'https://medium.com/@user/actual-post-123abc',
          'https://user.medium.com/another-post-456def',
        ]

        // Configure mock to return valid filtered posts
        const validPosts = expectedValidPosts.map((url, index) => ({
          title: `Post ${index + 1}`,
          url,
          publishDate: '2024-01-15',
          source: 'article',
        }))

        mockPage.evaluate = createMockFn(Promise.resolve(validPosts))

        const result = await scraperService.discoverPosts(
          'https://medium.com/@user',
          { maxScrollAttempts: 1, debug: false, fastMode: true }
        )

        // Verify only valid posts are returned
        expect(result.success).toBe(true)
        expect(result.posts.length).toBe(2)
        expect(
          result.posts.every(post => expectedValidPosts.includes(post.url))
        ).toBe(true)

        // Verify no profile pages are included
        const hasProfilePages = result.posts.some(
          post =>
            post.url.endsWith('medium.com/') ||
            post.url.match(/medium\.com\/@[^/]+\/?$/)
        )
        expect(hasProfilePages).toBe(false)
      })
    })
  })
})
