import { createScraperService } from '../../src/scraper.js'
import { createPostConverter } from '../../src/converter.js'
import { createStorageService } from '../../src/storage.js'

// Reuse mock function helper
const createMockFn = returnValue => {
  const fn = (...args) => {
    fn.calls = fn.calls || []
    fn.calls.push(args)
    if (typeof returnValue === 'function') {
      return returnValue(...args)
    }
    return returnValue
  }
  fn.toHaveBeenCalled = () => fn.calls && fn.calls.length > 0
  fn.calls = []
  return fn
}

describe('Feature: Content Extraction and Processing', () => {
  describe('Scenario: Extract Post Content and Metadata', () => {
    let scraperService
    let mockAuthService
    let mockBrowser
    let mockPage

    beforeEach(() => {
      // Mock page with post content
      mockPage = {
        goto: createMockFn(Promise.resolve()),
        setUserAgent: createMockFn(Promise.resolve()),
        waitForSelector: createMockFn(Promise.resolve()),
        evaluate: createMockFn(
          Promise.resolve({
            title: 'How to Build Amazing Web Apps',
            subtitle: 'A comprehensive guide to modern development',
            content:
              '<h1>How to Build Amazing Web Apps</h1><p>This is the content...</p>',
            author: 'John Developer',
            publishDate: '2024-01-15T10:00:00Z',
            lastModified: '2024-01-16T14:00:00Z',
            tags: ['javascript', 'web-development', 'tutorial'],
            readingTime: '7 min read',
            claps: 142,
            responses: 8,
            featuredImage: 'https://example.com/featured.jpg',
            canonicalUrl: 'https://medium.com/@user/post-123',
            mediumUrl: 'https://medium.com/@user/post-123',
            images: [
              { src: 'https://example.com/image1.jpg', alt: 'Example 1' },
              { src: 'https://example.com/image2.png', alt: 'Example 2' },
            ],
          })
        ),
        close: createMockFn(Promise.resolve()),
      }

      mockBrowser = {
        newPage: createMockFn(Promise.resolve(mockPage)),
        close: createMockFn(Promise.resolve()),
      }

      mockAuthService = {
        isAuthenticated: createMockFn(Promise.resolve(true)),
      }

      scraperService = createScraperService({
        browserLauncher: { launch: createMockFn(Promise.resolve(mockBrowser)) },
        authService: mockAuthService,
      })
    })

    describe('Given I have a list of Medium post URLs', () => {
      describe('When I scrape each individual post', () => {
        let extractResult

        beforeEach(async () => {
          extractResult = await scraperService.extractPostContent(
            'https://medium.com/@user/post-123'
          )
        })

        it('Then I should extract the complete article content', () => {
          if (!extractResult.success) {
            throw new Error('Expected content extraction to succeed')
          }

          if (!extractResult.content) {
            throw new Error('Expected article content to be extracted')
          }

          if (
            !extractResult.content.includes('How to Build Amazing Web Apps')
          ) {
            throw new Error('Expected content to contain the article title')
          }
        })

        it('And I should capture all metadata including title', () => {
          if (extractResult.title !== 'How to Build Amazing Web Apps') {
            throw new Error('Expected correct title to be extracted')
          }
        })

        it('And I should capture subtitle', () => {
          if (
            extractResult.subtitle !==
            'A comprehensive guide to modern development'
          ) {
            throw new Error('Expected correct subtitle to be extracted')
          }
        })

        it('And I should capture author information', () => {
          if (extractResult.author !== 'John Developer') {
            throw new Error('Expected correct author to be extracted')
          }
        })

        it('And I should capture publication dates', () => {
          if (extractResult.publishDate !== '2024-01-15T10:00:00Z') {
            throw new Error('Expected correct publish date to be extracted')
          }

          if (extractResult.lastModified !== '2024-01-16T14:00:00Z') {
            throw new Error(
              'Expected correct last modified date to be extracted'
            )
          }
        })

        it('And I should capture tags', () => {
          if (!Array.isArray(extractResult.tags)) {
            throw new Error('Expected tags to be an array')
          }

          if (!extractResult.tags.includes('javascript')) {
            throw new Error('Expected tags to include javascript')
          }

          if (extractResult.tags.length !== 3) {
            throw new Error('Expected 3 tags to be extracted')
          }
        })

        it('And I should capture engagement metrics', () => {
          if (extractResult.claps !== 142) {
            throw new Error('Expected correct claps count')
          }

          if (extractResult.responses !== 8) {
            throw new Error('Expected correct responses count')
          }

          if (extractResult.readingTime !== '7 min read') {
            throw new Error('Expected correct reading time')
          }
        })

        it('And I should capture featured image', () => {
          if (
            extractResult.featuredImage !== 'https://example.com/featured.jpg'
          ) {
            throw new Error('Expected correct featured image URL')
          }
        })

        it('And I should capture canonical URL', () => {
          if (
            extractResult.canonicalUrl !== 'https://medium.com/@user/post-123'
          ) {
            throw new Error('Expected correct canonical URL')
          }
        })
      })
    })
  })

  describe('Scenario: Convert HTML to Markdown', () => {
    let converter

    beforeEach(() => {
      converter = createPostConverter()
    })

    describe('Given I have extracted HTML content from Medium posts', () => {
      const sampleHtml = `
        <h1>Main Title</h1>
        <h2>Subtitle</h2>
        <p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
        <ul>
          <li>First item</li>
          <li>Second item</li>
        </ul>
        <blockquote>This is a quote</blockquote>
        <pre><code class="language-javascript">console.log('Hello, World!');</code></pre>
        <img src="https://example.com/image.jpg" alt="Example image" />
      `

      describe('When I convert the content to markdown', () => {
        let conversionResult

        beforeEach(async () => {
          conversionResult = await converter.convertPost({
            title: 'Test Post',
            content: sampleHtml,
            author: 'Test Author',
            publishDate: '2024-01-15T10:00:00Z',
          })
        })

        it('Then the markdown should preserve headers', () => {
          if (!conversionResult.success) {
            throw new Error('Expected conversion to succeed')
          }

          const markdown = conversionResult.content
          if (!markdown.includes('# Main Title')) {
            throw new Error('Expected H1 to be converted to # header')
          }

          if (!markdown.includes('## Subtitle')) {
            throw new Error('Expected H2 to be converted to ## header')
          }
        })

        it('And it should preserve emphasis formatting', () => {
          const markdown = conversionResult.content
          if (!markdown.includes('**bold**')) {
            throw new Error('Expected bold text to be converted to **bold**')
          }

          if (!markdown.includes('*italic*')) {
            throw new Error('Expected italic text to be converted to *italic*')
          }
        })

        it('And it should preserve lists', () => {
          const markdown = conversionResult.content
          if (!markdown.includes('First item') || !markdown.includes('-')) {
            throw new Error('Expected unordered list to be converted correctly')
          }
        })

        it('And it should preserve blockquotes', () => {
          const markdown = conversionResult.content
          if (!markdown.includes('> This is a quote')) {
            throw new Error('Expected blockquote to be converted with > prefix')
          }
        })

        it('And it should preserve code blocks', () => {
          const markdown = conversionResult.content
          if (!markdown.includes('```')) {
            throw new Error('Expected code block to be fenced')
          }
          if (!markdown.includes("console.log('Hello, World!');")) {
            throw new Error('Expected code content to be preserved')
          }
        })

        it('And it should preserve images', () => {
          const markdown = conversionResult.content
          if (
            !markdown.includes(
              '![Example image](https://example.com/image.jpg)'
            )
          ) {
            throw new Error('Expected image to be converted to markdown format')
          }
        })
      })
    })
  })

  describe('Scenario: Generate Frontmatter Metadata', () => {
    let converter

    beforeEach(() => {
      converter = createPostConverter()
    })

    describe('Given I have extracted post metadata', () => {
      const postData = {
        title: 'The Actual Post Title',
        subtitle: 'Post subtitle if exists',
        publishDate: '2024-01-15T10:30:00Z',
        lastModified: '2024-01-16T14:22:00Z',
        author: 'Author Name',
        tags: ['javascript', 'web-development', 'tutorial'],
        readingTime: '7 min read',
        claps: 142,
        responses: 8,
        mediumUrl: 'https://medium.com/@username/post-slug-123abc',
        featuredImage: 'https://example.com/featured.jpg',
        canonicalUrl: 'https://medium.com/@username/post-slug-123abc',
        content: '<h1>Test Content</h1>',
      }

      describe('When I create the markdown file', () => {
        let conversionResult

        beforeEach(async () => {
          conversionResult = await converter.convertPost(postData)
        })

        it('Then each file should start with YAML frontmatter', () => {
          if (!conversionResult.success) {
            throw new Error('Expected conversion to succeed')
          }

          const frontmatter = conversionResult.frontmatter
          if (!frontmatter.startsWith('---\n')) {
            throw new Error('Expected frontmatter to start with ---')
          }

          if (!frontmatter.includes('\n---\n')) {
            throw new Error('Expected frontmatter to end with ---')
          }
        })

        it('And frontmatter should contain title', () => {
          const frontmatter = conversionResult.frontmatter
          if (!frontmatter.includes('title: "The Actual Post Title"')) {
            throw new Error('Expected frontmatter to contain correct title')
          }
        })

        it('And frontmatter should contain author', () => {
          const frontmatter = conversionResult.frontmatter
          if (!frontmatter.includes('author: "Author Name"')) {
            throw new Error('Expected frontmatter to contain author')
          }
        })

        it('And frontmatter should contain tags array', () => {
          const frontmatter = conversionResult.frontmatter
          if (
            !frontmatter.includes(
              'tags: ["javascript", "web-development", "tutorial"]'
            )
          ) {
            throw new Error('Expected frontmatter to contain tags array')
          }
        })

        it('And frontmatter should contain engagement metrics', () => {
          const frontmatter = conversionResult.frontmatter
          if (!frontmatter.includes('claps: 142')) {
            throw new Error('Expected frontmatter to contain claps count')
          }

          if (!frontmatter.includes('responses: 8')) {
            throw new Error('Expected frontmatter to contain responses count')
          }
        })
      })
    })
  })

  describe('Scenario: Download and Organize Images', () => {
    let storageService
    let mockImageDownloader

    beforeEach(() => {
      mockImageDownloader = {
        downloadImage: createMockFn(Promise.resolve(true)),
        generateImageFilename: createMockFn((slug, index, url, featured) =>
          featured
            ? `${slug}-featured.jpg`
            : `${slug}-${String(index).padStart(2, '0')}.jpg`
        ),
        getImageExtension: createMockFn('.jpg'),
      }

      storageService = createStorageService({
        imageDownloader: mockImageDownloader,
        fileSystem: {
          ensureDirectory: createMockFn(Promise.resolve(true)),
          writeFile: createMockFn(Promise.resolve(true)),
        },
      })
    })

    describe('Given a Medium post contains images', () => {
      const postData = {
        slug: 'post-title-slug',
        featuredImage: 'https://example.com/featured.jpg',
        images: [
          { src: 'https://example.com/image1.jpg', alt: 'Image 1' },
          { src: 'https://example.com/image2.png', alt: 'Image 2' },
        ],
      }

      describe('When I process the post', () => {
        let downloadResult

        beforeEach(async () => {
          downloadResult = await storageService.downloadPostImages(postData)
        })

        it('Then I should download all images to a local images directory', () => {
          if (!downloadResult.success) {
            throw new Error('Expected image download to succeed')
          }

          // Should have downloaded featured image + 2 content images
          if (downloadResult.downloadedImages.length !== 3) {
            throw new Error(
              `Expected 3 images to be downloaded, got ${downloadResult.downloadedImages.length}`
            )
          }
        })

        it('And images should be named using the post slug and sequence number', () => {
          const featuredImage = downloadResult.downloadedImages.find(
            img => img.type === 'featured'
          )
          if (
            !featuredImage ||
            featuredImage.filename !== 'post-title-slug-featured.jpg'
          ) {
            throw new Error('Expected featured image to be named correctly')
          }

          const contentImages = downloadResult.downloadedImages.filter(
            img => img.type === 'content'
          )
          if (contentImages.length !== 2) {
            throw new Error('Expected 2 content images')
          }
        })

        it('And image references in markdown should point to local files', () => {
          const sampleMarkdown = '![Image](https://example.com/image1.jpg)'
          const updatedMarkdown = storageService.updateImageReferences(
            sampleMarkdown,
            downloadResult.downloadedImages
          )

          if (updatedMarkdown.includes('https://example.com/image1.jpg')) {
            throw new Error('Expected image URL to be replaced with local path')
          }

          if (!updatedMarkdown.includes('./images/')) {
            throw new Error('Expected local image path to be used')
          }
        })
      })
    })
  })
})
