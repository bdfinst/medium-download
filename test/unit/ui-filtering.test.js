// UI Element Filtering Tests
import { createPostConverter } from '../../src/converter.js'

describe('Medium UI Element Filtering', () => {
  let converter

  beforeEach(() => {
    converter = createPostConverter()
  })

  describe('Social Media and Interaction Elements', () => {
    it('should filter out clap/applause buttons', async () => {
      const htmlWithClaps = `
        <article>
          <h1>Test Article</h1>
          <p>This is the article content.</p>
          <div class="clap-button">👏 Clap for this story</div>
          <span class="applause-count">42 applause</span>
          <p>More content here.</p>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Test Article',
        content: htmlWithClaps,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)
      expect(result.markdown).not.toContain('Clap')
      expect(result.markdown).not.toContain('applause')
      expect(result.markdown).not.toContain('👏')
      expect(result.markdown).toContain('This is the article content')
      expect(result.markdown).toContain('More content here')
    })

    it('should filter out follow buttons and social links', async () => {
      const htmlWithSocial = `
        <article>
          <h1>Test Article</h1>
          <p>Article content goes here.</p>
          <div class="follow-button">Follow</div>
          <div class="share-button">Share this article</div>
          <button class="listen-button">Listen to this story</button>
          <p>End of content.</p>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Test Article',
        content: htmlWithSocial,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)
      expect(result.markdown).not.toContain('Follow')
      expect(result.markdown).not.toContain('Share')
      expect(result.markdown).not.toContain('Listen')
      expect(result.markdown).toContain('Article content goes here')
      expect(result.markdown).toContain('End of content')
    })
  })

  describe('Author Byline and Profile Information', () => {
    it('should filter out author byline blocks', async () => {
      const htmlWithByline = `
        <article>
          <h1>Test Article</h1>
          <div class="byline">
            <span class="author">Written by John Doe</span>
            <span class="pub-date">Dec 1, 2024</span>
          </div>
          <p>This is the main article content.</p>
          <div class="author-info">About the author: John is a software engineer at Company X.</div>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Test Article',
        content: htmlWithByline,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)
      expect(result.markdown).not.toContain('Written by')
      expect(result.markdown).not.toContain('About the author')
      expect(result.markdown).toContain('This is the main article content')
    })

    it('should filter out author signature blocks', async () => {
      const htmlWithSignature = `
        <article>
          <h1>Test Article</h1>
          <p>Main content of the article.</p>
          <p>Jane Smith is a developer at TechCorp with 10 years of experience.</p>
          <p>Follow me on Twitter for more updates!</p>
          <p>Connect with me on LinkedIn for professional networking.</p>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Test Article',
        content: htmlWithSignature,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)
      expect(result.markdown).toContain('Main content of the article')
      expect(result.markdown).not.toContain('Follow me')
      expect(result.markdown).not.toContain('Connect with me')
      // Author bio should be filtered
      expect(result.markdown).not.toContain('is a developer at')
    })
  })

  describe('Medium UI Navigation Elements', () => {
    it('should filter out Medium-specific UI text', async () => {
      const htmlWithUI = `
        <article>
          <h1>Test Article</h1>
          <div>Sign up to continue reading</div>
          <div>5 min read</div>
          <span>Open in app</span>
          <p>Actual article content here.</p>
          <div>Become a member for unlimited access</div>
          <span>Follow</span>
          <span>1.2K followers</span>
          <div>More from Medium Publications</div>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Test Article',
        content: htmlWithUI,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)
      expect(result.markdown).toContain('Actual article content here')
      expect(result.markdown).not.toContain('Sign up')
      expect(result.markdown).not.toContain('min read')
      expect(result.markdown).not.toContain('Open in app')
      expect(result.markdown).not.toContain('Become a member')
      expect(result.markdown).not.toContain('followers')
      expect(result.markdown).not.toContain('More from')
    })

    it('should filter out Medium widget and interaction elements', async () => {
      const htmlWithWidgets = `
        <article>
          <h1>Test Article</h1>
          <p>Real content paragraph.</p>
          <div class="medium-widget">Related articles widget</div>
          <button class="medium-button highlight">Highlight this</button>
          <div class="medium-interaction">Add note</div>
          <div data-module="ArticleFooter">Footer content</div>
          <div data-module="ArticleHeader">Header content</div>
          <p>More real content.</p>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Test Article',
        content: htmlWithWidgets,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)
      expect(result.markdown).toContain('Real content paragraph')
      expect(result.markdown).toContain('More real content')
      expect(result.markdown).not.toContain('Related articles')
      expect(result.markdown).not.toContain('Highlight this')
      expect(result.markdown).not.toContain('Add note')
      expect(result.markdown).not.toContain('Footer content')
      expect(result.markdown).not.toContain('Header content')
    })
  })

  describe('Medium Promotional Block Filtering', () => {
    it('should remove promotional subscription blocks', async () => {
      const htmlWithPromotionalBlock = `
        <article>
          <h1>Test Article</h1>
          <p>This is the main article content.</p>
          <h3>Get Bryan Finster's stories in your inbox</h3>
          <p>Join Medium for free to get updates from this writer.</p>
          <div>Subscribe</div>
          <button>Subscribe</button>
          <p>More content after the promotional block.</p>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Test Article',
        content: htmlWithPromotionalBlock,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)
      expect(result.markdown).toContain('This is the main article content')
      expect(result.markdown).toContain(
        'More content after the promotional block'
      )
      expect(result.markdown).not.toContain('stories in your inbox')
      expect(result.markdown).not.toContain('Join Medium for free')
      expect(result.markdown).not.toContain('get updates from this writer')
      expect(result.markdown).not.toContain('Subscribe')
    })

    it('should remove various author name patterns in subscription blocks', async () => {
      const htmlWithDifferentAuthors = `
        <article>
          <h1>Test Article</h1>
          <p>Article content here.</p>
          <h3>Get John's stories in your inbox</h3>
          <p>Join Medium for free to get updates from this writer.</p>
          <div>Subscribe</div>
          <p>Another paragraph.</p>
          <h3>Get Sarah Smith's stories in your inbox</h3>
          <p>Join Medium to get updates from this author.</p>
          <button>Subscribe</button>
          <p>Final content.</p>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Test Article',
        content: htmlWithDifferentAuthors,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)
      expect(result.markdown).toContain('Article content here')
      expect(result.markdown).toContain('Another paragraph')
      expect(result.markdown).toContain('Final content')
      expect(result.markdown).not.toContain("John's stories")
      expect(result.markdown).not.toContain("Sarah Smith's stories")
      expect(result.markdown).not.toContain('Join Medium')
      expect(result.markdown).not.toContain('Subscribe')
    })

    it('should handle promotional blocks with different header levels', async () => {
      const htmlWithDifferentHeaders = `
        <article>
          <h1>Test Article</h1>
          <p>Main content.</p>
          <h2>Get Author Name's stories in your inbox</h2>
          <p>Join Medium for free to get updates from this writer.</p>
          <span>Subscribe</span>
          <span>Subscribe</span>
          <p>More content.</p>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Test Article',
        content: htmlWithDifferentHeaders,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)
      expect(result.markdown).toContain('Main content')
      expect(result.markdown).toContain('More content')
      expect(result.markdown).not.toContain('stories in your inbox')
      expect(result.markdown).not.toContain('Join Medium for free')
      expect(result.markdown).not.toContain('Subscribe')
    })
  })

  describe('Content Preservation', () => {
    it('should preserve actual article content while filtering UI', async () => {
      const htmlMixed = `
        <article>
          <div class="byline">Written by Author</div>
          <h1>How to Build Great Software</h1>
          <div class="clap-button">Clap</div>
          <p>Building great software requires attention to detail and following best practices.</p>
          <h2>Key Principles</h2>
          <div class="share-button">Share</div>
          <ul>
            <li>Write clean, readable code</li>
            <li>Test thoroughly</li>
            <li>Document your work</li>
          </ul>
          <div class="follow-button">Follow for more</div>
          <p>These principles will help you create maintainable applications.</p>
          <div data-module="ArticleFooter">More articles like this</div>
        </article>
      `

      const result = await converter.convertPost({
        title: 'How to Build Great Software',
        content: htmlMixed,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)

      // Should contain actual content
      expect(result.markdown).toContain('Building great software requires')
      expect(result.markdown).toContain('Key Principles')
      expect(result.markdown).toContain('Write clean, readable code')
      expect(result.markdown).toContain('Test thoroughly')
      expect(result.markdown).toContain('Document your work')
      expect(result.markdown).toContain('maintainable applications')

      // Should NOT contain UI elements
      expect(result.markdown).not.toContain('Written by')
      expect(result.markdown).not.toContain('Clap')
      expect(result.markdown).not.toContain('Share')
      expect(result.markdown).not.toContain('Follow for more')
      expect(result.markdown).not.toContain('More articles like this')
    })
  })
})
