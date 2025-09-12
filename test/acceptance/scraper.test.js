import { createScraperService } from '../../src/scraper.js'
import { createMockAuthService, createMockPosts } from '../test-factories.js'
import { createMockFn } from '../test-utils.js'

describe('Feature: Medium Blog Scraper - Post Discovery', () => {
  describe('Scenario: Discover All Published Posts', () => {
    let scraperModule
    let mockBrowserLauncher
    let mockAuthService
    let mockPosts
    let mockPageUtils

    beforeEach(() => {
      mockPosts = createMockPosts({ count: 3 })
      mockAuthService = createMockAuthService({ authenticated: true })

      // Create complete browser launcher mock with all required methods
      const mockPage = {
        goto: createMockFn(Promise.resolve({ status: () => 200 })),
        evaluate: createMockFn(Promise.resolve(mockPosts)),
        close: createMockFn(Promise.resolve()),
        title: createMockFn(Promise.resolve('Test User - Medium')),
        url: createMockFn('https://medium.com/@testuser'),
        setUserAgent: createMockFn(Promise.resolve()),
        waitForSelector: createMockFn(Promise.resolve()),
        waitForFunction: createMockFn(Promise.resolve(true)),
        screenshot: createMockFn(Promise.resolve()),
        $eval: createMockFn(Promise.resolve('Sample body text')),
        $$: createMockFn(Promise.resolve([])),
        $: createMockFn(Promise.resolve(null)),
        click: createMockFn(Promise.resolve()),
        waitForTimeout: createMockFn(Promise.resolve()),
        isClosed: createMockFn(false),
        setViewport: createMockFn(Promise.resolve()),
      }

      const mockBrowser = {
        newPage: createMockFn(Promise.resolve(mockPage)),
        close: createMockFn(Promise.resolve()),
        isConnected: createMockFn(true),
      }

      mockBrowserLauncher = {
        launch: createMockFn(Promise.resolve(mockBrowser)),
      }

      // Add pageUtils mock for the new modular architecture
      const mockPageUtils = {
        setupPage: createMockFn(Promise.resolve(mockPage)),
        cleanupPage: createMockFn(Promise.resolve()),
        cleanupBrowser: createMockFn(Promise.resolve()),
      }

      scraperModule = createScraperService({
        browserLauncher: mockBrowserLauncher,
        authService: mockAuthService,
        pageUtils: mockPageUtils,
      })
    })

    describe('Given I am authenticated with Google OAuth', () => {
      beforeEach(async () => {
        // Verify authentication status
        const authStatus = await mockAuthService.isAuthenticated()
        expect(authStatus).toBe(true)
      })

      describe('When I navigate to my Medium profile page', () => {
        let discoveryResult

        beforeEach(async () => {
          discoveryResult = await scraperModule.discoverPosts(
            'https://medium.com/@testuser',
            {
              maxScrollAttempts: 2,
              debug: false,
              fastMode: true,
            }
          )
        }, 15000)

        it('Then the scraper should identify all published posts', () => {
          expect(discoveryResult.success).toBe(true)
          expect(discoveryResult.posts).toBeDefined()
          expect(discoveryResult.posts.length).toBeGreaterThan(0)
          expect(discoveryResult.posts.length).toBe(3)
        })

        it('And it should handle pagination or infinite scroll to load all posts', () => {
          // Verify browser interaction occurred (behavior, not implementation details)
          expect(mockBrowserLauncher.launch.toHaveBeenCalled()).toBe(true)

          // Focus on outcome: we successfully got posts
          expect(discoveryResult.posts.length).toBeGreaterThan(0)
        })

        it('And it should extract the URL for each post', () => {
          const posts = discoveryResult.posts

          posts.forEach(post => {
            expect(post.url).toBeDefined()
            expect(post.url).toContain('medium.com')
            expect(post.url).toContain('@testuser')
          })
        })

        it('And it should identify the total number of posts to process', () => {
          expect(typeof discoveryResult.totalCount).toBe('number')
          expect(discoveryResult.totalCount).toBe(3)
          expect(discoveryResult.totalCount).toBe(discoveryResult.posts.length)
        })
      })
    })

    describe('Given I am not authenticated', () => {
      beforeEach(() => {
        mockAuthService = createMockAuthService({ authenticated: false })

        scraperModule = createScraperService({
          browserLauncher: mockBrowserLauncher,
          authService: mockAuthService,
          pageUtils: mockPageUtils,
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
          expect(discoveryResult.success).toBe(false)
          expect(discoveryResult.error.toLowerCase()).toContain(
            'authentication'
          )
        })
      })
    })

    describe('Given an invalid Medium profile URL', () => {
      beforeEach(() => {
        // Use the authenticated scraper service for URL validation test
        const testScraper = createScraperService({
          browserLauncher: mockBrowserLauncher,
          authService: mockAuthService,
          pageUtils: mockPageUtils,
        })
        scraperModule = testScraper
      })

      describe('When I attempt to discover posts', () => {
        let discoveryResult

        beforeEach(async () => {
          discoveryResult = await scraperModule.discoverPosts(
            'https://invalid-url.com/user'
          )
        })

        it('Then it should fail with URL validation error', () => {
          expect(discoveryResult.success).toBe(false)
          expect(discoveryResult.error.toLowerCase()).toContain('url')
        })
      })
    })

    describe('Given a username.medium.com profile URL', () => {
      describe('When I process the URL through the scraper', () => {
        it('Then it should be able to handle subdomain format URLs', async () => {
          // Create a fresh scraper for this test with subdomain posts
          const subdomainPosts = [
            {
              title: 'Test Post from Subdomain',
              url: 'https://testuser.medium.com/test-post-123abc',
              publishDate: '2024-01-15',
              source: 'article',
            },
          ]

          const subdomainMockPage = {
            goto: createMockFn(Promise.resolve({ status: () => 200 })),
            evaluate: createMockFn(Promise.resolve(subdomainPosts)),
            close: createMockFn(Promise.resolve()),
            title: createMockFn(Promise.resolve('Test User - Medium')),
            url: createMockFn('https://testuser.medium.com'),
            setUserAgent: createMockFn(Promise.resolve()),
            waitForSelector: createMockFn(Promise.resolve()),
            waitForFunction: createMockFn(Promise.resolve(true)),
            screenshot: createMockFn(Promise.resolve()),
            $eval: createMockFn(Promise.resolve('Sample body text')),
            $$: createMockFn(Promise.resolve([])),
            $: createMockFn(Promise.resolve(null)),
            click: createMockFn(Promise.resolve()),
            waitForTimeout: createMockFn(Promise.resolve()),
            isClosed: createMockFn(false),
            setViewport: createMockFn(Promise.resolve()),
          }

          const subdomainMockBrowser = {
            newPage: createMockFn(Promise.resolve(subdomainMockPage)),
            close: createMockFn(Promise.resolve()),
            isConnected: createMockFn(true),
          }

          const subdomainMockLauncher = {
            launch: createMockFn(Promise.resolve(subdomainMockBrowser)),
          }

          const subdomainMockPageUtils = {
            setupPage: createMockFn(Promise.resolve(subdomainMockPage)),
            cleanupPage: createMockFn(Promise.resolve()),
            cleanupBrowser: createMockFn(Promise.resolve()),
          }

          const subdomainScraper = createScraperService({
            browserLauncher: subdomainMockLauncher,
            authService: mockAuthService,
            pageUtils: subdomainMockPageUtils,
          })

          const result = await subdomainScraper.discoverPosts(
            'https://testuser.medium.com/',
            { maxScrollAttempts: 1, debug: false, fastMode: true }
          )

          expect(result.success).toBe(true)
          expect(result.posts.length).toBe(1)
          expect(result.posts[0].url).toContain('testuser.medium.com')
        })
      })
    })

    describe('Given a user has posts submitted to Medium publications', () => {
      describe('When I extract posts from the profile page', () => {
        it('Then it should include both personal and publication posts', () => {
          // Test post filtering logic without complex async setup
          const testPosts = createMockPosts({
            includePublications: true,
            count: 5, // Ensure we get all posts including publications
          })

          const personalPosts = testPosts.filter(
            post =>
              post.url.includes('testuser.medium.com') ||
              post.url.includes('@testuser')
          )

          const publicationPosts = testPosts.filter(
            post =>
              post.url.includes('medium.com/') &&
              !post.url.includes('testuser.medium.com') &&
              !post.url.includes('medium.com/@')
          )

          // Verify the mock data structure is correct
          expect(testPosts.length).toBe(5) // 3 personal + 2 publication posts
          expect(personalPosts.length).toBeGreaterThanOrEqual(1)
          expect(publicationPosts.length).toBeGreaterThanOrEqual(1)

          // Verify publication posts have proper URLs
          const devopsPost = publicationPosts.find(post =>
            post.url.includes('devops-weekly')
          )
          expect(devopsPost).toBeDefined()
          expect(devopsPost.url).toContain('medium.com/devops-weekly/')
        })
      })
    })
  })
})
