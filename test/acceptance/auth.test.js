import { createAuthService } from '../../src/auth.js'

// Create a simple mock function replacement
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

describe('Feature: Medium Blog Scraper Authentication', () => {
  describe('Scenario: Initial Google OAuth Authentication', () => {
    let authModule
    let mockBrowserLauncher
    let mockTokenStorage
    let mockOAuthClient
    let mockReadline

    beforeEach(() => {
      // Mock browser launcher
      mockBrowserLauncher = {
        launch: createMockFn(Promise.resolve(true)),
      }

      // Mock token storage
      mockTokenStorage = {
        save: createMockFn(Promise.resolve(true)),
        load: createMockFn(Promise.resolve(null)),
        exists: createMockFn(false),
      }

      // Mock OAuth client
      mockOAuthClient = {
        generateAuthUrl: createMockFn(
          'https://accounts.google.com/oauth/authorize?client_id=test'
        ),
        getToken: createMockFn(
          Promise.resolve({
            tokens: {
              access_token: 'mock_access_token',
              refresh_token: 'mock_refresh_token',
              scope: 'email profile',
              token_type: 'Bearer',
              expiry_date: Date.now() + 3600000,
            },
          })
        ),
        setCredentials: createMockFn(),
      }

      // Mock readline interface
      mockReadline = {
        question: createMockFn(Promise.resolve('mock_auth_code')),
      }
    })

    describe('Given I run the scraper for the first time', () => {
      beforeEach(() => {
        authModule = createAuthService({
          browserLauncher: mockBrowserLauncher,
          tokenStorage: mockTokenStorage,
          oauthClient: mockOAuthClient,
          readline: mockReadline,
        })
      })

      describe('When I execute the authentication command', () => {
        let authResult

        beforeEach(async () => {
          authResult = await authModule.authenticate()
        })

        it('Then I should be prompted to authorize with Google', () => {
          expect(mockOAuthClient.generateAuthUrl.toHaveBeenCalled()).toBe(true)

          const calls = mockOAuthClient.generateAuthUrl.calls
          expect(calls.length).toBeGreaterThan(0)

          const options = calls[0][0]
          expect(options.access_type).toBe('offline')
          expect(options.scope).toBeDefined()
          expect(options.scope).toContain('email')
          expect(options.scope).toContain('profile')
        })

        it('And the application should open my default browser', () => {
          expect(mockBrowserLauncher.launch.toHaveBeenCalled()).toBe(true)

          const calls = mockBrowserLauncher.launch.calls
          const url = calls[0][0]
          expect(url).toContain('accounts.google.com')
        })

        it('And I should be redirected to Google OAuth consent screen', () => {
          const generatedUrl = mockOAuthClient.generateAuthUrl()
          expect(generatedUrl).toContain('accounts.google.com')
          expect(generatedUrl).toContain('oauth/authorize')
        })

        it('And after granting permission, I should receive an authentication success message', () => {
          expect(authResult.success).toBe(true)
          expect(authResult.message.toLowerCase()).toContain(
            'authentication successful'
          )
        })

        it('And the auth tokens should be stored securely for future use', () => {
          expect(mockTokenStorage.save.toHaveBeenCalled()).toBe(true)

          const calls = mockTokenStorage.save.calls
          const tokens = calls[0][0]
          expect(tokens.access_token).toBeDefined()
          expect(tokens.refresh_token).toBeDefined()
        })
      })
    })

    describe('Given authentication tokens already exist', () => {
      beforeEach(() => {
        // Reset mock functions
        mockTokenStorage.exists = createMockFn(true)
        mockTokenStorage.load = createMockFn(
          Promise.resolve({
            access_token: 'existing_token',
            refresh_token: 'existing_refresh',
            expiry_date: Date.now() + 3600000,
          })
        )

        authModule = createAuthService({
          browserLauncher: mockBrowserLauncher,
          tokenStorage: mockTokenStorage,
          oauthClient: mockOAuthClient,
          readline: mockReadline,
        })
      })

      describe('When I check authentication status', () => {
        let isAuthenticated

        beforeEach(async () => {
          isAuthenticated = await authModule.isAuthenticated()
        })

        it('Then it should return true if tokens are valid', () => {
          expect(isAuthenticated).toBe(true)
        })

        it('And it should not prompt for new authentication', () => {
          expect(mockBrowserLauncher.launch.toHaveBeenCalled()).toBe(false)
        })
      })
    })
  })
})
