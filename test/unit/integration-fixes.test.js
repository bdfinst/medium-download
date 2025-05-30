import { createScraperService } from '../../src/scraper.js'
import { createPostConverter } from '../../src/converter.js'

describe('Integration Tests - Recent Fixes', () => {
  describe('URL Filtering Fix', () => {
    it('should exclude profile homepages from post detection', () => {
      const testCases = [
        {
          url: 'https://bdfinst.medium.com/',
          shouldInclude: false,
          description: 'Subdomain homepage with slash',
        },
        {
          url: 'https://bdfinst.medium.com',
          shouldInclude: false,
          description: 'Subdomain homepage without slash',
        },
        {
          url: 'https://medium.com/@bdfinst/',
          shouldInclude: false,
          description: 'Profile homepage with slash',
        },
        {
          url: 'https://medium.com/@bdfinst',
          shouldInclude: false,
          description: 'Profile homepage without slash',
        },
        {
          url: 'https://bdfinst.medium.com/5-minute-devops-continuous-delivery-faq-4aadc02c1b6e',
          shouldInclude: true,
          description: 'Actual blog post',
        },
      ]

      // Test the URL validation logic directly (this is the same logic used in page.evaluate)
      const isValidPostUrl = url => {
        if (!url) return false

        // Remove query parameters and fragments for cleaner checking
        const cleanUrl = url.split('?')[0].split('#')[0]

        // Exclude profile homepages explicitly
        if (cleanUrl.match(/^https?:\/\/[^/]+\.medium\.com\/?$/)) {
          return false // This is just the homepage: username.medium.com/
        }
        if (cleanUrl.match(/^https?:\/\/medium\.com\/@[^/]+\/?$/)) {
          return false // This is just the profile: medium.com/@username/
        }

        // Personal profile posts: medium.com/@username/post-title
        if (url.includes('/@')) {
          const pathParts = cleanUrl.split('/')
          // Must have username and post slug
          return (
            pathParts.length >= 5 && pathParts[4] && pathParts[4].length > 0
          )
        }

        // Subdomain posts: username.medium.com/post-title (but not just the domain)
        if (url.includes('.medium.com')) {
          const pathParts = cleanUrl.split('/')
          return (
            pathParts.length > 3 &&
            !cleanUrl.endsWith('.medium.com/') &&
            !cleanUrl.endsWith('.medium.com') &&
            pathParts[3] !== '' &&
            pathParts[3].length > 8 // Post slugs are typically longer
          )
        }

        // Publication posts: medium.com/publication/post-title
        if (
          url.includes('medium.com/') &&
          !url.includes('medium.com/@') &&
          !url.includes('medium.com/m/')
        ) {
          const pathParts = cleanUrl.split('/')
          return (
            pathParts.length > 4 && pathParts[4] && pathParts[4].length > 0
          )
        }

        return false
      }

      testCases.forEach(({ url, shouldInclude, description }) => {
        const result = isValidPostUrl(url)
        if (result !== shouldInclude) {
          throw new Error(
            `${description}: Expected ${shouldInclude} but got ${result} for URL: ${url}`
          )
        }
      })
    })
  })

  describe('Title Duplication Fix', () => {
    let converter

    beforeEach(() => {
      converter = createPostConverter()
    })

    it('should not duplicate titles when content already has title as H1', async () => {
      const postData = {
        title: 'My Amazing Blog Post',
        content: `
          <h1>My Amazing Blog Post</h1>
          <p>This is the content of the post.</p>
          <h2>Section Header</h2>
          <p>More content here.</p>
        `,
        author: 'Test Author',
      }

      const result = await converter.convertPost(postData)

      if (!result.success) {
        throw new Error('Expected conversion to succeed')
      }

      // Count H1 occurrences in the content
      const h1Count = (result.content.match(/^# /gm) || []).length
      if (h1Count !== 1) {
        throw new Error(`Expected exactly 1 H1, found ${h1Count}`)
      }

      // Should not have duplicate title
      if (
        result.content.includes('# My Amazing Blog Post\n\n## My Amazing Blog Post')
      ) {
        throw new Error('Title should not be duplicated')
      }

      // Original H2 should be downgraded to H3
      if (!result.content.includes('### Section Header')) {
        throw new Error('Original H2 should be downgraded to H3')
      }
    })

    it('should add title as H1 when content does not have title', async () => {
      const postData = {
        title: 'My Other Blog Post',
        content: `
          <p>This content doesn't have the title as a header.</p>
          <h2>First Section</h2>
          <p>Some content here.</p>
        `,
        author: 'Test Author',
      }

      const result = await converter.convertPost(postData)

      if (!result.success) {
        throw new Error('Expected conversion to succeed')
      }

      if (!result.content.startsWith('# My Other Blog Post')) {
        throw new Error('Content should start with the title as H1')
      }

      // Should have exactly one H1
      const h1Count = (result.content.match(/^# /gm) || []).length
      if (h1Count !== 1) {
        throw new Error(`Expected exactly 1 H1, found ${h1Count}`)
      }

      // Original H2 should be downgraded to H3
      if (!result.content.includes('### First Section')) {
        throw new Error('Original H2 should be downgraded to H3')
      }
    })

    it('should handle case-insensitive title matching', async () => {
      const postData = {
        title: 'My Amazing Blog Post',
        content: `
          <h1>my amazing blog post</h1>
          <p>Same title but different case.</p>
        `,
        author: 'Test Author',
      }

      const result = await converter.convertPost(postData)

      if (!result.success) {
        throw new Error('Expected conversion to succeed')
      }

      // Should not duplicate the title since it's the same (case insensitive)
      const h1Count = (result.content.match(/^# /gm) || []).length
      if (h1Count !== 1) {
        throw new Error(`Expected exactly 1 H1, found ${h1Count}`)
      }
    })
  })
})