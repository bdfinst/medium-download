// Shared test utilities for the Medium Scraper project

// Create a simple mock function replacement that works across test files
export const createMockFn = returnValue => {
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

// Create HTML fixtures for testing DOM extraction without browser dependencies
export const createMediumHtmlFixture = (posts = []) => {
  const postElements = posts
    .map(
      post => `
    <article>
      <div>
        <a href="${post.url}" data-testid="post-preview-title">
          <h2>${post.title}</h2>
        </a>
        <div data-testid="post-preview-metadata">
          <time dateTime="${post.publishDate}">${post.publishDate}</time>
        </div>
      </div>
    </article>
  `
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html>
      <head><title>Test User - Medium</title></head>
      <body>
        <main>
          ${postElements}
        </main>
      </body>
    </html>
  `
}

// Test data factories for consistent test data
export const createTestPost = (overrides = {}) => ({
  title: 'Test Post Title',
  url: 'https://medium.com/@testuser/test-post-123abc',
  publishDate: '2024-01-15T10:00:00Z',
  source: 'article',
  ...overrides,
})

export const createTestPostData = (overrides = {}) => ({
  slug: 'test-post-slug',
  title: 'Test Post Title',
  subtitle: 'Test Post Subtitle',
  content: '# Test Content\n\nSample post content.',
  publishDate: '2024-01-15T10:00:00Z',
  author: 'Test User',
  tags: ['test', 'example'],
  readingTime: '5 min read',
  url: 'https://medium.com/@testuser/test-post-123abc',
  featuredImage: 'https://example.com/featured.jpg',
  ...overrides,
})

// URL test cases for consistent testing across different test files
export const urlTestCases = [
  // Profile homepages - should be EXCLUDED
  {
    url: 'https://bdfinst.medium.com/',
    shouldInclude: false,
    description: 'Profile homepage with trailing slash',
  },
  {
    url: 'https://bdfinst.medium.com',
    shouldInclude: false,
    description: 'Profile homepage without trailing slash',
  },
  {
    url: 'https://medium.com/@bdfinst/',
    shouldInclude: false,
    description: 'Profile page with trailing slash',
  },
  {
    url: 'https://medium.com/@bdfinst',
    shouldInclude: false,
    description: 'Profile page without trailing slash',
  },

  // Actual posts - should be INCLUDED
  {
    url: 'https://bdfinst.medium.com/5-minute-devops-continuous-delivery-faq-4aadc02c1b6e',
    shouldInclude: true,
    description: 'Subdomain post',
  },
  {
    url: 'https://medium.com/@bdfinst/5-minute-devops-continuous-delivery-faq-4aadc02c1b6e',
    shouldInclude: true,
    description: 'Profile post',
  },
  {
    url: 'https://medium.com/publication/some-article-title-123abc',
    shouldInclude: true,
    description: 'Publication post',
  },

  // Edge cases with query parameters
  {
    url: 'https://bdfinst.medium.com/?source=user_profile',
    shouldInclude: false,
    description: 'Homepage with query params',
  },
  {
    url: 'https://bdfinst.medium.com/some-post?source=user_profile',
    shouldInclude: true,
    description: 'Post with query params',
  },
]
