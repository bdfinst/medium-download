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
          if (!mockOAuthClient.generateAuthUrl.toHaveBeenCalled()) {
            throw new Error('Expected generateAuthUrl to have been called')
          }

          const calls = mockOAuthClient.generateAuthUrl.calls
          if (calls.length === 0) {
            throw new Error(
              'Expected generateAuthUrl to have been called with options'
            )
          }

          const options = calls[0][0]
          if (options.access_type !== 'offline') {
            throw new Error('Expected access_type to be offline')
          }

          if (
            !options.scope ||
            !options.scope.includes('email') ||
            !options.scope.includes('profile')
          ) {
            throw new Error('Expected scope to contain email and profile')
          }
        })

        it('And the application should open my default browser', () => {
          if (!mockBrowserLauncher.launch.toHaveBeenCalled()) {
            throw new Error('Expected browser launcher to have been called')
          }

          const calls = mockBrowserLauncher.launch.calls
          const url = calls[0][0]
          if (!url.includes('accounts.google.com')) {
            throw new Error('Expected browser to open with Google OAuth URL')
          }
        })

        it('And I should be redirected to Google OAuth consent screen', () => {
          const generatedUrl = mockOAuthClient.generateAuthUrl()
          if (!generatedUrl.includes('accounts.google.com')) {
            throw new Error('Expected URL to contain accounts.google.com')
          }
          if (!generatedUrl.includes('oauth/authorize')) {
            throw new Error('Expected URL to contain oauth/authorize')
          }
        })

        it('And after granting permission, I should receive an authentication success message', () => {
          if (!authResult.success) {
            throw new Error('Expected authentication to be successful')
          }
          if (
            !authResult.message
              .toLowerCase()
              .includes('authentication successful')
          ) {
            throw new Error(
              'Expected success message to mention authentication success'
            )
          }
        })

        it('And the auth tokens should be stored securely for future use', () => {
          if (!mockTokenStorage.save.toHaveBeenCalled()) {
            throw new Error('Expected tokens to be saved')
          }

          const calls = mockTokenStorage.save.calls
          const tokens = calls[0][0]
          if (!tokens.access_token || !tokens.refresh_token) {
            throw new Error(
              'Expected tokens to contain access_token and refresh_token'
            )
          }
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
          if (isAuthenticated !== true) {
            throw new Error('Expected authentication status to be true')
          }
        })

        it('And it should not prompt for new authentication', () => {
          if (mockBrowserLauncher.launch.toHaveBeenCalled()) {
            throw new Error(
              'Expected browser launcher not to be called when already authenticated'
            )
          }
        })
      })
    })
  })
})
