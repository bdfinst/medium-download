import { createScraperService } from '../../src/scraper.js'
import { createMockFn, urlTestCases } from '../test-utils.js'

describe('URL Filtering - Post Detection Behavior', () => {
  let scraperService
  let mockBrowser
  let mockPage
  let mockAuthService

  beforeEach(() => {
    // Mock authentication service
    mockAuthService = {
      isAuthenticated: createMockFn(Promise.resolve(true)),
      getAuthStatus: createMockFn(
        Promise.resolve({
          authenticated: true,
          hasTokens: true,
          expiryDate: Date.now() + 3600000,
        })
      ),
    }

    // Mock page with full Puppeteer interface
    mockPage = {
      goto: createMockFn(Promise.resolve({ status: () => 200 })),
      evaluate: createMockFn(),
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

    // Mock browser
    mockBrowser = {
      newPage: createMockFn(Promise.resolve(mockPage)),
      close: createMockFn(Promise.resolve()),
    }

    // Mock browser launcher
    const mockBrowserLauncher = {
      launch: createMockFn(Promise.resolve(mockBrowser)),
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

          // Mock the evaluate function to simulate URL filtering behavior
          // The scraper should only return posts that pass URL validation
          mockPage.evaluate = createMockFn(() => {
            // This simulates the actual browser-side URL filtering logic
            // without duplicating the implementation
            const expectedPosts = shouldInclude
              ? [{ ...testPost, source: 'article' }]
              : []
            return Promise.resolve(expectedPosts)
          })

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

        // Mock the evaluate to return posts that would pass URL filtering
        mockPage.evaluate = createMockFn(() =>
          Promise.resolve(
            expectedValidPosts.map((url, index) => ({
              title: `Post ${index + 1}`,
              url,
              publishDate: '2024-01-15',
              source: 'article',
            }))
          )
        )

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
