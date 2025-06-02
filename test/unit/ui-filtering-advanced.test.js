// Advanced UI Element Filtering Tests
import { createPostConverter } from '../../src/converter.js'

describe('Advanced Medium UI Element Filtering', () => {
  let converter

  beforeEach(() => {
    converter = createPostConverter()
  })

  describe('Title Duplication Prevention', () => {
    it('should not duplicate title when already present as H1', async () => {
      const htmlWithTitle = `
        <article>
          <h1>How to Build Great Software</h1>
          <p>This is the main content of the article.</p>
          <h2>Section One</h2>
          <p>More content here.</p>
        </article>
      `

      const result = await converter.convertPost({
        title: 'How to Build Great Software',
        content: htmlWithTitle,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)

      // Count occurrences of the title
      const titleOccurrences = (
        result.markdown.match(/# How to Build Great Software/g) || []
      ).length
      expect(titleOccurrences).toBe(1)

      // Should contain content
      expect(result.markdown).toContain('This is the main content')
      expect(result.markdown).toContain('## Section One')
    })

    it('should add title when not present in content', async () => {
      const htmlWithoutTitle = `
        <article>
          <p>This article starts directly with content.</p>
          <h2>First Section</h2>
          <p>More content here.</p>
        </article>
      `

      const result = await converter.convertPost({
        title: 'My Article Title',
        content: htmlWithoutTitle,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)

      // Should have title as H1
      expect(result.markdown).toContain('# My Article Title')

      // Count occurrences of the title
      const titleOccurrences = (
        result.markdown.match(/# My Article Title/g) || []
      ).length
      expect(titleOccurrences).toBe(1)
    })
  })

  describe('Byline and Author Link Filtering', () => {
    it('should filter out author profile links', async () => {
      const htmlWithAuthorLinks = `
        <article>
          <h1>Test Article</h1>
          <div class="author-info">
            <a href="https://medium.com/@johndoe">John Doe</a>
            <a href="https://medium.com/u/123456">Follow</a>
            <a class="author-link" href="/u/987654">Author Profile</a>
          </div>
          <p>This is the main article content.</p>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Test Article',
        content: htmlWithAuthorLinks,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)
      expect(result.markdown).toContain('This is the main article content')
      expect(result.markdown).not.toContain('John Doe')
      expect(result.markdown).not.toContain('Follow')
      expect(result.markdown).not.toContain('Author Profile')
      expect(result.markdown).not.toContain('medium.com/@')
      expect(result.markdown).not.toContain('/u/')
    })

    it('should filter out byline links with data attributes', async () => {
      const htmlWithBylineLinks = `
        <article>
          <h1>Test Article</h1>
          <div data-testid="byline">
            <a data-testid="author-link" href="/@johndoe">John Doe</a>
            <span data-testid="author-follow">Follow</span>
          </div>
          <p>Real article content goes here.</p>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Test Article',
        content: htmlWithBylineLinks,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)
      expect(result.markdown).toContain('Real article content goes here')
      expect(result.markdown).not.toContain('John Doe')
      expect(result.markdown).not.toContain('Follow')
    })
  })

  describe('Footer and Response Filtering', () => {
    it('should filter out clap footer and response elements', async () => {
      const htmlWithFooter = `
        <article>
          <h1>Test Article</h1>
          <p>Main article content here.</p>
          <div class="post-footer">
            <div class="clap-button">👏 Clap to show your support</div>
            <div class="responses">15 responses</div>
            <a href="/responses">See responses</a>
          </div>
          <div data-module="ResponsesToPost">
            <h3>Responses</h3>
            <div>User comments here...</div>
          </div>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Test Article',
        content: htmlWithFooter,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)
      expect(result.markdown).toContain('Main article content here')
      expect(result.markdown).not.toContain('Clap to show your support')
      // Check that responses text is not in the content (ignore frontmatter)
      const contentOnly = result.markdown.split('---').slice(2).join('---')
      expect(contentOnly).not.toContain('responses')
      expect(result.markdown).not.toContain('See responses')
      expect(result.markdown).not.toContain('User comments')
      expect(result.markdown).not.toContain('👏')
    })

    it('should filter out footer with data-testid attributes', async () => {
      const htmlWithDataFooter = `
        <article>
          <h1>Test Article</h1>
          <p>Article content goes here.</p>
          <footer>
            <div data-testid="clap-button">Clap</div>
            <div data-testid="share-button">Share</div>
            <div data-testid="response-count">8 responses</div>
          </footer>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Test Article',
        content: htmlWithDataFooter,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)
      expect(result.markdown).toContain('Article content goes here')
      expect(result.markdown).not.toContain('Clap')
      expect(result.markdown).not.toContain('Share')
      // Check that responses text is not in the content (ignore frontmatter)
      const contentOnly = result.markdown.split('---').slice(2).join('---')
      expect(contentOnly).not.toContain('responses')
    })
  })

  describe('Complex UI Pattern Filtering', () => {
    it('should handle complex Medium UI with mixed content', async () => {
      const complexHtml = `
        <article>
          <div class="byline">
            <a href="/@author">Jane Smith</a>
            <span>in</span>
            <a href="/publication">Tech Weekly</a>
          </div>
          <h1>Advanced JavaScript Patterns</h1>
          <div class="article-meta">
            <span>5 min read</span>
            <span>Dec 1, 2024</span>
          </div>
          <p>JavaScript has evolved significantly over the years.</p>
          <h2>Modern Patterns</h2>
          <p>Let's explore some modern JavaScript patterns.</p>
          <div class="article-footer">
            <div class="clap-section">
              <button class="clap-button">👏</button>
              <span>142 claps</span>
            </div>
            <div class="share-section">
              <button>Share</button>
              <button>Follow</button>
            </div>
          </div>
          <div class="responses-section">
            <h3>8 responses</h3>
            <div>Comments go here...</div>
          </div>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Advanced JavaScript Patterns',
        content: complexHtml,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)

      // Should contain actual content
      expect(result.markdown).toContain('JavaScript has evolved significantly')
      expect(result.markdown).toContain('## Modern Patterns')
      expect(result.markdown).toContain("Let's explore some modern")

      // Should NOT contain UI elements
      expect(result.markdown).not.toContain('Jane Smith')
      expect(result.markdown).not.toContain('Tech Weekly')
      expect(result.markdown).not.toContain('min read')
      expect(result.markdown).not.toContain('👏')
      // Check that claps text is not in the content (ignore frontmatter)
      const contentOnlyForClaps = result.markdown
        .split('---')
        .slice(2)
        .join('---')
      expect(contentOnlyForClaps).not.toContain('claps')
      expect(result.markdown).not.toContain('Share')
      expect(result.markdown).not.toContain('Follow')
      // Check that responses text is not in the content (ignore frontmatter)
      const contentOnly = result.markdown.split('---').slice(2).join('---')
      expect(contentOnly).not.toContain('responses')
      expect(result.markdown).not.toContain('Comments go here')

      // Should have only one title
      const titleOccurrences = (
        result.markdown.match(/# Advanced JavaScript Patterns/g) || []
      ).length
      expect(titleOccurrences).toBe(1)
    })
  })

  describe('Third-party Service Filtering', () => {
    it('should filter out speechify-ignore elements', async () => {
      const htmlWithSpeechify = `
        <article>
          <h1>Test Article</h1>
          <p>This is the main article content.</p>
          <div class="speechify-ignore">
            <button>Listen with Speechify</button>
            <p>Speechify widget content that should be filtered</p>
          </div>
          <div class="another-speechify-ignore speechify-ignore">
            <span>More speechify content</span>
          </div>
          <p>More article content that should remain.</p>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Test Article',
        content: htmlWithSpeechify,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)
      expect(result.markdown).toContain('This is the main article content')
      expect(result.markdown).toContain(
        'More article content that should remain'
      )
      expect(result.markdown).not.toContain('Listen with Speechify')
      expect(result.markdown).not.toContain('Speechify widget content')
      expect(result.markdown).not.toContain('More speechify content')
    })

    it('should filter out large speechify-ignore divs regardless of size', async () => {
      const htmlWithLargeSpeechifyDiv = `
        <article>
          <h1>Test Article</h1>
          <p>This is the main article content.</p>
          <div class="speechify-ignore large-div">
            <h2>Large Speechify Section</h2>
            <p>This is a large speechify-ignore div with lots of content.</p>
            <button>Listen with Speechify</button>
            <p>More speechify widget content that should be filtered.</p>
            <div>Nested content in speechify-ignore div</div>
            <ul>
              <li>List item 1</li>
              <li>List item 2</li>
            </ul>
            <p>This entire section should be filtered regardless of size.</p>
          </div>
          <p>More article content that should remain.</p>
        </article>
      `

      const result = await converter.convertPost({
        title: 'Test Article',
        content: htmlWithLargeSpeechifyDiv,
        url: 'https://medium.com/@user/test',
      })

      expect(result.success).toBe(true)
      expect(result.markdown).toContain('This is the main article content')
      expect(result.markdown).toContain(
        'More article content that should remain'
      )
      expect(result.markdown).not.toContain('Large Speechify Section')
      expect(result.markdown).not.toContain('large speechify-ignore div')
      expect(result.markdown).not.toContain('Listen with Speechify')
      expect(result.markdown).not.toContain(
        'Nested content in speechify-ignore'
      )
      expect(result.markdown).not.toContain('List item 1')
      expect(result.markdown).not.toContain('entire section should be filtered')
    })
  })
})
