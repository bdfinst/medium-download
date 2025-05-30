describe('URL Filtering - Homepage Detection', () => {
  // Test the URL validation logic directly

  describe('Given various Medium URLs', () => {
    const testUrls = [
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

    describe('When I validate URLs for post detection', () => {
      testUrls.forEach(({ url, shouldInclude, description }) => {
        it(`Then ${description} should be ${shouldInclude ? 'included' : 'excluded'}`, async () => {
          // We need to test the isValidPostUrl function through page evaluation
          // Since it's inside a page.evaluate(), we'll test the logic directly
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

          const result = isValidPostUrl(url)

          if (result !== shouldInclude) {
            throw new Error(
              `URL "${url}" should be ${shouldInclude ? 'included' : 'excluded'} but got ${result}`
            )
          }
        })
      })
    })
  })
})
