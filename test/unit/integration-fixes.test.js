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
          return pathParts.length > 4 && pathParts[4] && pathParts[4].length > 0
        }

        return false
      }

      testCases.forEach(({ url, shouldInclude }) => {
        const result = isValidPostUrl(url)
        expect(result).toBe(shouldInclude)
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

      expect(result.success).toBe(true)

      // Count H1 occurrences in the content
      const h1Count = (result.content.match(/^# /gm) || []).length
      expect(h1Count).toBe(1)

      // Should not have duplicate title
      expect(result.content).not.toContain(
        '# My Amazing Blog Post\n\n## My Amazing Blog Post'
      )

      // Original H2 should be downgraded to H3
      expect(result.content).toContain('### Section Header')
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

      expect(result.success).toBe(true)
      expect(result.content).toMatch(/^# My Other Blog Post/)

      // Should have exactly one H1
      const h1Count = (result.content.match(/^# /gm) || []).length
      expect(h1Count).toBe(1)

      // Original H2 should be downgraded to H3
      expect(result.content).toContain('### First Section')
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

      expect(result.success).toBe(true)

      // Should not duplicate the title since it's the same (case insensitive)
      const h1Count = (result.content.match(/^# /gm) || []).length
      expect(h1Count).toBe(1)
    })
  })
})
