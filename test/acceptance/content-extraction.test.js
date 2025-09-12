import { createPostConverter } from '../../src/converter.js'
import { createScraperService } from '../../src/scraper/index.js'
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
  describe('Scenario: Extract Post Content and Metadata', () => {
    let scraperService
    let mockAuthService
    let mockBrowser
    let mockPage

    beforeEach(() => {
      // Mock page with post content
      mockPage = {
        goto: createMockFn(Promise.resolve({ status: () => 200 })),
        setUserAgent: createMockFn(Promise.resolve()),
        waitForSelector: createMockFn(Promise.resolve()),
        evaluate: createMockFn(
          Promise.resolve({
            title: 'How to Build Amazing Web Apps',
            subtitle: 'A comprehensive guide to modern development',
            content:
              '<h1>How to Build Amazing Web Apps</h1><p>This is the content with <strong>bold</strong> and <em>italic</em> text.</p>',
            author: 'John Developer',
            publishDate: '2024-01-15T10:00:00Z',
            lastModified: '2024-01-16T14:00:00Z',
            tags: ['javascript', 'web-development', 'tutorial'],
            featuredImage: 'https://example.com/featured.jpg',
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
        browserManager: {
          launch: createMockFn(Promise.resolve(mockBrowser)),
          createPage: createMockFn(Promise.resolve(mockPage)),
          close: createMockFn(Promise.resolve()),
          closePage: createMockFn(Promise.resolve()),
        },
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
          expect(extractResult.success).toBe(true)
          expect(extractResult.content).toBeDefined()
          expect(extractResult.content).toContain(
            'How to Build Amazing Web Apps'
          )
        })

        it('And I should capture all metadata including title', () => {
          expect(extractResult.title).toBe('How to Build Amazing Web Apps')
        })

        it('And I should capture subtitle', () => {
          expect(extractResult.subtitle).toBe(
            'A comprehensive guide to modern development'
          )
        })

        it('And I should capture author information', () => {
          expect(extractResult.author).toBe('John Developer')
        })

        it('And I should capture publication dates', () => {
          expect(extractResult.publishDate).toBe('2024-01-15T10:00:00Z')
          expect(extractResult.lastModified).toBe('2024-01-16T14:00:00Z')
        })

        it('And I should capture tags', () => {
          expect(Array.isArray(extractResult.tags)).toBe(true)
          expect(extractResult.tags).toContain('javascript')
          expect(extractResult.tags.length).toBe(3)
        })

        it('And I should capture featured image', () => {
          expect(extractResult.featuredImage).toBe(
            'https://example.com/featured.jpg'
          )
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
          expect(conversionResult.success).toBe(true)

          const markdown = conversionResult.content
          expect(markdown).toContain('# Main Title')
          expect(markdown).toContain('## Subtitle')
        })

        it('And it should preserve lists', () => {
          const markdown = conversionResult.content
          expect(markdown).toContain('First item')
          expect(markdown).toContain('-')
        })

        it('And it should preserve blockquotes', () => {
          const markdown = conversionResult.content
          expect(markdown).toContain('> This is a quote')
        })

        it('And it should preserve code blocks', () => {
          const markdown = conversionResult.content
          expect(markdown).toContain('```')
          expect(markdown).toContain("console.log('Hello, World!');")
        })

        it('And it should preserve images', () => {
          const markdown = conversionResult.content
          expect(markdown).toContain(
            '![Example image](https://example.com/image.jpg)'
          )
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
        featuredImage: 'https://example.com/featured.jpg',
        content: '<h1>Test Content</h1>',
      }

      describe('When I create the markdown file', () => {
        let conversionResult

        beforeEach(async () => {
          conversionResult = await converter.convertPost(postData)
        })

        it('Then each file should start with YAML frontmatter', () => {
          expect(conversionResult.success).toBe(true)

          const frontmatter = conversionResult.frontmatter
          expect(frontmatter).toMatch(/^---\n/)
          expect(frontmatter).toContain('\n---\n')
        })

        it('And frontmatter should contain title', () => {
          const frontmatter = conversionResult.frontmatter
          expect(frontmatter).toContain('title: "The Actual Post Title"')
        })

        it('And frontmatter should contain author', () => {
          const frontmatter = conversionResult.frontmatter
          expect(frontmatter).toContain('author: "Author Name"')
        })

        it('And frontmatter should contain tags array', () => {
          const frontmatter = conversionResult.frontmatter
          expect(frontmatter).toContain(
            'tags: ["javascript", "web-development", "tutorial"]'
          )
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

      // Simulate referenced images (what would come from markdown)
      const referencedImages = [
        { src: 'https://example.com/featured.jpg', alt: 'Featured Image' },
        { src: 'https://example.com/image1.jpg', alt: 'Image 1' },
        { src: 'https://example.com/image2.png', alt: 'Image 2' },
      ]

      describe('When I process the post', () => {
        let downloadResult

        beforeEach(async () => {
          downloadResult = await storageService.downloadPostImages(
            postData,
            referencedImages
          )
        })

        it('Then I should download all images to a local images directory', () => {
          expect(downloadResult.success).toBe(true)

          // Should have downloaded featured image + 2 content images
          expect(downloadResult.downloadedImages.length).toBe(3)
        })

        it('And images should be named using the post slug and sequence number', () => {
          const featuredImage = downloadResult.downloadedImages.find(
            img => img.type === 'featured'
          )
          expect(featuredImage).toBeDefined()
          expect(featuredImage.filename).toBe('post-title-slug-featured.jpg')

          const contentImages = downloadResult.downloadedImages.filter(
            img => img.type === 'content'
          )
          expect(contentImages.length).toBe(2)
        })

        it('And image references in markdown should point to local files', () => {
          const sampleMarkdown = '![Image](https://example.com/image1.jpg)'
          const updatedMarkdown = storageService.updateImageReferences(
            sampleMarkdown,
            downloadResult.downloadedImages
          )

          expect(updatedMarkdown).not.toContain(
            'https://example.com/image1.jpg'
          )
          expect(updatedMarkdown).toContain('./images/')
        })
      })
    })
  })
})
