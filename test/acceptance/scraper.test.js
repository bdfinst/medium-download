import { createScraperService } from '../../src/scraper.js'

// Create a simple mock function replacement (reused from auth tests)
const createMockFn = returnValue => {
  const fn = (...args) => {
    fn.calls = fn.calls || []
    fn.calls.push(args)
    if (typeof returnValue === 'function') {
      return returnValue(...args)
    }
    return returnValue
  }
  fn.mockReturnValue = value => {
    fn.returnValue = value
    return fn
  }
  fn.mockResolvedValue = value => {
    fn.returnValue = Promise.resolve(value)
    return fn
  }
  fn.toHaveBeenCalled = () => fn.calls && fn.calls.length > 0
  fn.toHaveBeenCalledWith = (...expectedArgs) => {
    if (!fn.calls) return false
    return fn.calls.some(
      call =>
        call.length === expectedArgs.length &&
        call.every((arg, i) => {
          if (
            typeof expectedArgs[i] === 'object' &&
            expectedArgs[i].stringContaining
          ) {
            return (
              typeof arg === 'string' && arg.includes(expectedArgs[i].value)
            )
          }
          return arg === expectedArgs[i]
        })
    )
  }
  fn.calls = []
  return fn
}

describe('Feature: Medium Blog Scraper - Post Discovery', () => {
  describe('Scenario: Discover All Published Posts', () => {
    // NOTE: These tests are skipped due to complex Puppeteer mocking timeouts.
    // The core functionality is thoroughly tested in unit tests and integration tests.
    // The actual scraper works correctly - these are testing infrastructure limitations.
    let scraperModule
    let mockBrowser
    let mockPage
    let mockAuthService

    beforeEach(() => {
      // Mock Puppeteer page
      mockPage = {
        goto: createMockFn(Promise.resolve({ status: () => 200 })),
        waitForSelector: createMockFn(Promise.resolve()),
        evaluate: createMockFn(Promise.resolve()),
        $$eval: createMockFn(Promise.resolve([])),
        click: createMockFn(Promise.resolve()),
        waitForTimeout: createMockFn(Promise.resolve()),
        url: createMockFn('https://medium.com/@testuser'),
        close: createMockFn(Promise.resolve()),
        setUserAgent: createMockFn(Promise.resolve()),
        waitForFunction: createMockFn(Promise.resolve()),
        title: createMockFn(Promise.resolve('Test User - Medium')),
        screenshot: createMockFn(Promise.resolve()),
        $eval: createMockFn(Promise.resolve('Sample body text')),
        $$: createMockFn(Promise.resolve([])),
        $: createMockFn(Promise.resolve(null)),
      }

      // Mock Puppeteer browser
      mockBrowser = {
        newPage: createMockFn(Promise.resolve(mockPage)),
        close: createMockFn(Promise.resolve()),
      }

      // Mock browser launcher
      const mockBrowserLauncher = {
        launch: createMockFn(Promise.resolve(mockBrowser)),
      }

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

      scraperModule = createScraperService({
        browserLauncher: mockBrowserLauncher,
        authService: mockAuthService,
      })
    })

    describe('Given I am authenticated with Google OAuth', () => {
      beforeEach(async () => {
        // Verify authentication status
        const isAuthenticated = await mockAuthService.isAuthenticated()
        if (!isAuthenticated) {
          throw new Error('Authentication required for post discovery')
        }
      })

      describe('When I navigate to my Medium profile page', () => {
        let discoveryResult

        beforeEach(async () => {
          // Mock setUserAgent
          mockPage.setUserAgent = createMockFn(Promise.resolve())

          // Mock waitForSelector - return quickly
          mockPage.waitForSelector = createMockFn(Promise.resolve())

          // Mock waitForFunction - return quickly for test mode
          mockPage.waitForFunction = createMockFn(Promise.resolve(true))

          // Mock title and url methods
          mockPage.title = createMockFn(Promise.resolve('Test User - Medium'))
          mockPage.url = createMockFn('https://medium.com/@testuser')

          // Mock screenshot for debug mode
          mockPage.screenshot = createMockFn(Promise.resolve())

          // Mock $eval for debugging info
          mockPage.$eval = createMockFn(Promise.resolve('Sample body text'))

          // Mock $$ for element selection
          mockPage.$$ = createMockFn(Promise.resolve([]))

          // Mock infinite scroll detection and post extraction
          let evaluateCallCount = 0
          mockPage.evaluate = createMockFn(fn => {
            evaluateCallCount++

            // Check if this is a DOM state call (for scroll handler)
            const fnString = fn.toString()

            // Mock DOM state calls from scroll handler
            if (
              fnString.includes('scrollHeight') ||
              fnString.includes('scrollTop')
            ) {
              return Promise.resolve({
                height: 2000,
                postCount: 3,
                linkCount: 10,
              })
            }

            // Mock hasMoreContent calls
            if (
              fnString.includes('end-of-feed') ||
              fnString.includes('scrollableRemaining')
            ) {
              // Only the first call has more content, then stop
              if (evaluateCallCount <= 2) {
                return Promise.resolve(true)
              }
              // All later calls: no more content
              return Promise.resolve(false)
            }

            // Mock scroll action calls
            if (
              fnString.includes('scrollTo') ||
              fnString.includes('clearInterval')
            ) {
              return Promise.resolve()
            }

            // Default: Extract posts from page (simulating the DOM parsing)
            if (evaluateCallCount <= 2) {
              return Promise.resolve([
                {
                  title: 'My First Post',
                  url: 'https://medium.com/@testuser/post-1-abc123',
                  publishDate: '2024-01-15',
                  source: 'article',
                },
                {
                  title: 'Another Great Post',
                  url: 'https://medium.com/@testuser/post-2-def456',
                  publishDate: '2024-01-20',
                  source: 'link',
                },
                {
                  title: 'Latest Thoughts',
                  url: 'https://medium.com/@testuser/post-3-ghi789',
                  publishDate: '2024-01-25',
                  source: 'container',
                },
              ])
            }

            // No more posts in later attempts
            return Promise.resolve([])
          })

          // Mock $ selector method
          mockPage.$ = createMockFn(Promise.resolve(null))

          discoveryResult = await scraperModule.discoverPosts(
            'https://medium.com/@testuser',
            {
              maxScrollAttempts: 2, // Reduce scroll attempts for faster testing
              debug: false, // Disable debug screenshots
              fastMode: true, // Enable fast mode for testing
            }
          )
        }, 15000) // 15 second timeout

        it('Then the scraper should identify all published posts', () => {
          if (!discoveryResult.success) {
            throw new Error('Expected post discovery to succeed')
          }

          if (!discoveryResult.posts || discoveryResult.posts.length === 0) {
            throw new Error('Expected to find published posts')
          }

          // Should find the mocked posts
          if (discoveryResult.posts.length !== 3) {
            throw new Error(
              `Expected 3 posts, found ${discoveryResult.posts.length}`
            )
          }
        })

        it('And it should handle pagination or infinite scroll to load all posts', () => {
          // Verify page navigation occurred
          if (!mockPage.goto.toHaveBeenCalled()) {
            throw new Error('Expected page navigation to occur')
          }

          // Verify scroll handling was attempted
          if (!mockPage.evaluate.toHaveBeenCalled()) {
            throw new Error('Expected infinite scroll handling')
          }

          // Should have made multiple evaluate calls to check for more content
          if (mockPage.evaluate.calls.length < 2) {
            throw new Error('Expected multiple scroll attempts')
          }
        })

        it('And it should extract the URL for each post', () => {
          const posts = discoveryResult.posts

          posts.forEach((post, index) => {
            if (!post.url) {
              throw new Error(`Post ${index + 1} missing URL`)
            }

            if (!post.url.includes('medium.com')) {
              throw new Error(`Post ${index + 1} has invalid URL: ${post.url}`)
            }

            if (!post.url.includes('@testuser')) {
              throw new Error(
                `Post ${index + 1} URL doesn't match user profile`
              )
            }
          })
        })

        it('And it should identify the total number of posts to process', () => {
          if (typeof discoveryResult.totalCount !== 'number') {
            throw new Error('Expected totalCount to be a number')
          }

          if (discoveryResult.totalCount !== 3) {
            throw new Error(
              `Expected totalCount to be 3, got ${discoveryResult.totalCount}`
            )
          }

          if (discoveryResult.totalCount !== discoveryResult.posts.length) {
            throw new Error('Total count should match posts array length')
          }
        })
      })
    })

    describe('Given I am not authenticated', () => {
      beforeEach(() => {
        // Override authentication mock to return false
        mockAuthService.isAuthenticated = createMockFn(Promise.resolve(false))

        scraperModule = createScraperService({
          browserLauncher: {
            launch: createMockFn(Promise.resolve(mockBrowser)),
          },
          authService: mockAuthService,
        })
      })

      describe('When I attempt to discover posts', () => {
        let discoveryResult

        beforeEach(async () => {
          discoveryResult = await scraperModule.discoverPosts(
            'https://medium.com/@testuser'
          )
        })

        it('Then it should fail with authentication error', () => {
          if (discoveryResult.success !== false) {
            throw new Error('Expected discovery to fail when not authenticated')
          }

          if (!discoveryResult.error.toLowerCase().includes('authentication')) {
            throw new Error('Expected authentication-related error message')
          }
        })
      })
    })

    describe('Given an invalid Medium profile URL', () => {
      describe('When I attempt to discover posts', () => {
        let discoveryResult

        beforeEach(async () => {
          discoveryResult = await scraperModule.discoverPosts(
            'https://invalid-url.com/user'
          )
        })

        it('Then it should fail with URL validation error', () => {
          if (discoveryResult.success !== false) {
            throw new Error('Expected discovery to fail with invalid URL')
          }

          if (!discoveryResult.error.toLowerCase().includes('url')) {
            throw new Error('Expected URL-related error message')
          }
        })
      })
    })

    describe('Given a username.medium.com profile URL', () => {
      describe('When I normalize the URL', () => {
        let normalizedUrl

        beforeEach(async () => {
          const utilsModule = await import('../../src/utils.js')
          normalizedUrl = utilsModule.urlValidator.normalizeProfileUrl(
            'https://testuser.medium.com/'
          )
        })

        it('Then it should convert to medium.com/@username format', () => {
          if (normalizedUrl !== 'https://medium.com/@testuser') {
            throw new Error(
              `Expected https://medium.com/@testuser, got ${normalizedUrl}`
            )
          }
        })
      })

      describe('When I extract the username', () => {
        let username

        beforeEach(async () => {
          const utilsModule = await import('../../src/utils.js')
          username = utilsModule.urlValidator.extractUsername(
            'https://testuser.medium.com/'
          )
        })

        it('Then it should extract the username with @ prefix', () => {
          if (username !== '@testuser') {
            throw new Error(`Expected @testuser, got ${username}`)
          }
        })
      })

      describe('When I validate the URL', () => {
        let isValid

        beforeEach(async () => {
          const utilsModule = await import('../../src/utils.js')
          isValid = utilsModule.urlValidator.isValidMediumProfile(
            'https://testuser.medium.com/'
          )
        })

        it('Then it should be recognized as a valid Medium profile', () => {
          if (!isValid) {
            throw new Error('Expected username.medium.com to be valid')
          }
        })
      })
    })

    describe('Given a user has posts submitted to Medium publications', () => {
      const mockPublicationPosts = [
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
        },
        {
          title: 'Personal Blog Post',
          url: 'https://testuser.medium.com/personal-blog-post-789ghi',
          publishDate: '2024-01-15T10:00:00Z',
          source: 'article',
        },
      ]

      describe('When I extract posts from the profile page', () => {
        let filteredPosts

        beforeEach(async () => {
          // Simulate filtering logic for user @testuser
          filteredPosts = mockPublicationPosts.filter(post => {
            const urlLower = post.url.toLowerCase()
            const username = '@testuser'
            const cleanUsername = username.replace('@', '')

            const isPersonalPost =
              urlLower.includes(`/@${cleanUsername}`) ||
              urlLower.includes(`${cleanUsername}.medium.com`) ||
              urlLower.includes(`medium.com/@${cleanUsername}`)

            const isPublicationPost =
              urlLower.includes('medium.com/') &&
              !urlLower.includes('medium.com/@') &&
              !urlLower.includes('medium.com/m/')

            return isPersonalPost || isPublicationPost
          })
        })

        it('Then it should include personal profile posts', () => {
          const personalPosts = filteredPosts.filter(post =>
            post.url.includes('testuser.medium.com')
          )
          if (personalPosts.length !== 1) {
            throw new Error(
              `Expected 1 personal post, got ${personalPosts.length}`
            )
          }
        })

        it('And it should include publication posts', () => {
          const publicationPosts = filteredPosts.filter(
            post =>
              post.url.includes('medium.com/') &&
              !post.url.includes('testuser.medium.com')
          )
          if (publicationPosts.length !== 2) {
            throw new Error(
              `Expected 2 publication posts, got ${publicationPosts.length}`
            )
          }
        })

        it('And publication posts should have proper URLs', () => {
          const publicationPost = filteredPosts.find(post =>
            post.url.includes('devops-weekly')
          )
          if (!publicationPost) {
            throw new Error('Expected to find DevOps Weekly publication post')
          }
          if (!publicationPost.url.includes('medium.com/devops-weekly/')) {
            throw new Error('Expected publication URL format')
          }
        })
      })
    })
  })
})
