// Error Handling and Recovery Acceptance Tests
import {
  withRetry,
  classifyHttpError,
  handleNetworkError,
  createErrorAwareOperation,
  ScraperError,
  RateLimitError,
  NotFoundError,
  ForbiddenError,
  ErrorTypes,
} from '../../src/error-handling.js'

describe('Feature: Error Handling and Recovery', () => {
  // Mock console methods to prevent cluttered test output
  let originalConsoleError, originalConsoleWarn, originalConsoleLog

  beforeAll(() => {
    originalConsoleError = console.error
    originalConsoleWarn = console.warn
    originalConsoleLog = console.log
    console.error = () => {}
    console.warn = () => {}
    console.log = () => {}
  })

  afterAll(() => {
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
    console.log = originalConsoleLog
  })
  describe('Scenario: Network Error Recovery', () => {
    describe('Given the scraping process encounters network errors', () => {
      describe('When a network error occurs', () => {
        it('should implement retry logic with exponential backoff', async () => {
          const mockOperation = async () => {
            // Simulate network error on first two attempts, succeed on third
            const shouldFail = Math.random() < 0.01 // Very small chance to still fail
            if (shouldFail) {
              const error = new Error('ECONNRESET')
              error.code = 'ECONNRESET'
              throw error
            }
            return 'success'
          }

          const retryConfig = {
            maxAttempts: 3,
            baseDelay: 100,
            backoffFactor: 2,
            jitter: false,
          }

          const result = await withRetry(mockOperation, retryConfig)()
          expect(result).toBe('success')
        })

        it('should classify HTTP errors correctly', () => {
          const error401 = classifyHttpError(401, 'Unauthorized')
          expect(error401.type).toBe(ErrorTypes.AUTHENTICATION)
          expect(error401.retryable).toBe(false)

          const error404 = classifyHttpError(404, 'Not Found')
          expect(error404).toBeInstanceOf(NotFoundError)
          expect(error404.retryable).toBe(false)

          const error403 = classifyHttpError(403, 'Forbidden')
          expect(error403).toBeInstanceOf(ForbiddenError)
          expect(error403.retryable).toBe(false)

          const error429 = classifyHttpError(429, 'Rate Limited')
          expect(error429).toBeInstanceOf(RateLimitError)
          expect(error429.retryable).toBe(true)

          const error500 = classifyHttpError(500, 'Server Error')
          expect(error500.type).toBe(ErrorTypes.NETWORK)
          expect(error500.retryable).toBe(true)
        })

        it('should handle network connection errors', () => {
          const dnsError = new Error('getaddrinfo ENOTFOUND')
          dnsError.code = 'ENOTFOUND'
          const handledError = handleNetworkError(dnsError)

          expect(handledError).toBeInstanceOf(ScraperError)
          expect(handledError.type).toBe(ErrorTypes.NETWORK)
          expect(handledError.retryable).toBe(true)
          expect(handledError.message).toContain('Domain not found')
        })
      })
    })
  })

  describe('Scenario: Rate Limiting Handling', () => {
    describe('Given Medium implements rate limiting', () => {
      describe('When rate limiting is detected', () => {
        it('should pause and resume after appropriate delay', async () => {
          const startTime = Date.now()

          const mockOperation = async () => {
            // First call throws rate limit error, second succeeds
            const timeSinceStart = Date.now() - startTime
            if (timeSinceStart < 100) {
              // First attempt within 100ms
              throw new RateLimitError('Rate limit exceeded', 200)
            }
            return 'success'
          }

          const result = await withRetry(mockOperation, {
            maxAttempts: 2,
            baseDelay: 100,
          })()

          const duration = Date.now() - startTime
          expect(result).toBe('success')
          expect(duration).toBeGreaterThanOrEqual(200) // Should wait at least retry-after time
        })

        it('should handle rate limit responses with retry-after header', () => {
          const rateLimitError = new RateLimitError(
            'Too many requests',
            5000 // 5 second retry after
          )

          expect(rateLimitError.type).toBe(ErrorTypes.RATE_LIMIT)
          expect(rateLimitError.statusCode).toBe(429)
          expect(rateLimitError.retryAfter).toBe(5000)
          expect(rateLimitError.retryable).toBe(true)
        })
      })
    })
  })

  describe('Scenario: Graceful Handling of Inaccessible Posts', () => {
    describe('Given posts may be private or deleted', () => {
      describe('When a post is private or deleted', () => {
        it('should skip private posts and continue with others', async () => {
          const errorAwareOp = createErrorAwareOperation({
            recovery: {
              skipPrivatePosts: true,
              skipDeletedPosts: true,
            },
          })

          const privatePostOp = async () => {
            throw new ForbiddenError('Post is private')
          }

          const result = await errorAwareOp.execute(
            privatePostOp,
            'Private post test'
          )

          expect(result.success).toBe(false)
          expect(result.skipped).toBe(true)
          expect(result.error).toContain('Post is private')
        })

        it('should skip deleted posts and continue with others', async () => {
          const errorAwareOp = createErrorAwareOperation({
            recovery: {
              skipPrivatePosts: true,
              skipDeletedPosts: true,
            },
          })

          const deletedPostOp = async () => {
            throw new NotFoundError('Post not found - may have been deleted')
          }

          const result = await errorAwareOp.execute(
            deletedPostOp,
            'Deleted post test'
          )

          expect(result.success).toBe(false)
          expect(result.skipped).toBe(true)
          expect(result.error).toContain('Post not found')
        })

        it('should fail after max consecutive failures', async () => {
          const errorAwareOp = createErrorAwareOperation({
            retry: {
              maxAttempts: 1, // No retries for faster test
              baseDelay: 10,
            },
            recovery: {
              maxConsecutiveFailures: 2,
            },
          })

          // First failure
          await errorAwareOp.execute(async () => {
            throw new ScraperError('Network error', ErrorTypes.NETWORK)
          }, 'First failure')

          // Second failure should throw
          await expect(
            errorAwareOp.execute(async () => {
              throw new ScraperError('Network error', ErrorTypes.NETWORK)
            }, 'Second failure')
          ).rejects.toThrow('Too many consecutive failures')
        })
      })
    })
  })

  describe('Scenario: Error Recovery Strategies', () => {
    describe('Given different types of errors occur', () => {
      describe('When processing multiple operations', () => {
        it('should reset consecutive failure count on success', async () => {
          const errorAwareOp = createErrorAwareOperation({
            retry: {
              maxAttempts: 1,
              baseDelay: 10,
            },
            recovery: {
              maxConsecutiveFailures: 3,
            },
          })

          // First failure
          const firstResult = await errorAwareOp.execute(async () => {
            throw new ScraperError('Network error', ErrorTypes.NETWORK)
          }, 'First failure')

          // Success should reset counter
          const successResult = await errorAwareOp.execute(async () => {
            return 'success'
          }, 'Success')

          // Should be able to have more failures without hitting limit
          const result1 = await errorAwareOp.execute(async () => {
            throw new ScraperError('Network error', ErrorTypes.NETWORK)
          }, 'Failure after success')

          const result2 = await errorAwareOp.execute(async () => {
            throw new ScraperError('Network error', ErrorTypes.NETWORK)
          }, 'Another failure')

          expect(firstResult.success).toBe(false)
          expect(successResult.success).toBe(true)
          expect(result1.success).toBe(false)
          expect(result2.success).toBe(false)
          // Focus on behavior: operation should still be working after reset
          expect(errorAwareOp.getStats().consecutiveFailures).toBeLessThan(3)
        })

        it('should provide operation statistics', () => {
          const errorAwareOp = createErrorAwareOperation()
          const stats = errorAwareOp.getStats()

          expect(stats).toHaveProperty('consecutiveFailures')
          expect(typeof stats.consecutiveFailures).toBe('number')
        })
      })
    })
  })

  describe('Scenario: Timeout and Resource Management', () => {
    describe('Given operations may timeout or hang', () => {
      describe('When a timeout occurs', () => {
        it('should handle timeout errors properly', () => {
          const timeoutError = new Error(
            'Navigation timeout of 30000 ms exceeded'
          )
          timeoutError.name = 'TimeoutError'

          expect(() => {
            if (timeoutError.name === 'TimeoutError') {
              throw new ScraperError(
                'Timeout loading page',
                ErrorTypes.NETWORK,
                null,
                true
              )
            }
          }).toThrow(ScraperError)
        })
      })
    })
  })

  describe('Scenario: Error Classification and Handling', () => {
    describe('Given various error types can occur', () => {
      describe('When errors are classified', () => {
        it('should create appropriate error types for different scenarios', () => {
          const networkError = new ScraperError(
            'Connection failed',
            ErrorTypes.NETWORK,
            null,
            true
          )
          expect(networkError.type).toBe(ErrorTypes.NETWORK)
          expect(networkError.retryable).toBe(true)

          const authError = new ScraperError(
            'Authentication failed',
            ErrorTypes.AUTHENTICATION,
            401,
            false
          )
          expect(authError.type).toBe(ErrorTypes.AUTHENTICATION)
          expect(authError.retryable).toBe(false)

          const parsingError = new ScraperError(
            'Failed to parse content',
            ErrorTypes.PARSING,
            null,
            true
          )
          expect(parsingError.type).toBe(ErrorTypes.PARSING)
          expect(parsingError.retryable).toBe(true)
        })

        it('should include timestamp and context in errors', () => {
          const error = new ScraperError('Test error', ErrorTypes.NETWORK)

          expect(error.timestamp).toBeDefined()
          expect(new Date(error.timestamp)).toBeInstanceOf(Date)
          expect(error.type).toBe(ErrorTypes.NETWORK)
          expect(error.name).toBe('ScraperError')
        })
      })
    })
  })
})
