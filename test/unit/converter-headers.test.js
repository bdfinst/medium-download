import { createPostConverter } from '../../src/converter.js'

describe('Header Level Handling', () => {
  let converter

  beforeEach(() => {
    converter = createPostConverter()
  })

  describe('Given Medium HTML with various header levels', () => {
    const mockPostData = {
      title: 'Main Article Title',
      content: `
        <h1>This should become H2</h1>
        <p>Some content after H1.</p>
        <h2>This should become H3</h2>
        <p>Content after H2.</p>
        <h3>This should become H4</h3>
        <p>Content after H3.</p>
        <h4>This should become H5</h4>
        <p>Content after H4.</p>
        <h5>This should become H6</h5>
        <p>Content after H5.</p>
        <h6>This should stay H6</h6>
        <p>Content after H6.</p>
      `,
    }

    describe('When I convert the post to markdown', () => {
      let result

      beforeEach(async () => {
        result = await converter.convertPost(mockPostData)
      })

      it('Then the main title should be the only H1', () => {
        expect(result.success).toBe(true)

        const h1Count = (result.markdown.match(/^# /gm) || []).length
        expect(h1Count).toBe(1)
        expect(result.markdown).toContain('# Main Article Title')
      })

      it('And all original headers should be downgraded by one level', () => {
        expect(result.success).toBe(true)

        const markdown = result.markdown

        // Original H1 should become H2
        expect(markdown).toContain('## This should become H2')

        // Original H2 should become H3
        expect(markdown).toContain('### This should become H3')

        // Original H3 should become H4
        expect(markdown).toContain('#### This should become H4')

        // Original H4 should become H5
        expect(markdown).toContain('##### This should become H5')

        // Original H5 should become H6
        expect(markdown).toContain('###### This should become H6')

        // Original H6 should stay H6 (max level)
        expect(markdown).toContain('###### This should stay H6')
      })

      it('And the content structure should be preserved', () => {
        expect(result.success).toBe(true)

        const markdown = result.markdown

        expect(markdown).toContain('Some content after H1.')
        expect(markdown).toContain('Content after H2.')
      })
    })
  })
})

describe('Image Reference Extraction', () => {
  let converter

  beforeEach(() => {
    converter = createPostConverter()
  })

  describe('Given Medium HTML with various image types', () => {
    const mockPostData = {
      title: 'Article with Images',
      content: `
        <p>Here's some text before the first image.</p>
        <img src="https://example.com/image1.jpg" alt="First Image" />
        <p>Text between images.</p>
        <figure>
          <img src="https://example.com/image2.png" alt="Figure Image" />
          <figcaption>This is a caption</figcaption>
        </figure>
        <p>More text.</p>
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" alt="Data URL - should be ignored" />
        <img src="/relative/path.jpg" alt="Relative path - should be ignored" />
        <p>Final text.</p>
      `,
      featuredImage: 'https://example.com/featured.jpg',
    }

    describe('When I convert the post to markdown', () => {
      let result

      beforeEach(async () => {
        result = await converter.convertPost(mockPostData)
      })

      it('Then it should extract only valid HTTP(S) image URLs', () => {
        expect(result.success).toBe(true)

        const images = result.referencedImages
        expect(Array.isArray(images)).toBe(true)

        // Should find 2 valid images (image1.jpg and image2.png)
        expect(images.length).toBe(2)

        const imageSrcs = images.map(img => img.src)
        expect(imageSrcs).toContain('https://example.com/image1.jpg')
        expect(imageSrcs).toContain('https://example.com/image2.png')
      })

      it('And it should exclude data URLs and relative paths', () => {
        expect(result.success).toBe(true)

        const images = result.referencedImages
        const imageSrcs = images.map(img => img.src)

        // Should not include data URLs
        const hasDataUrl = imageSrcs.some(src => src.startsWith('data:'))
        expect(hasDataUrl).toBe(false)

        // Should not include relative paths
        const hasRelativePath = imageSrcs.some(
          src => src.startsWith('/') || !src.includes('://')
        )
        expect(hasRelativePath).toBe(false)
      })

      it('And it should preserve alt text for images', () => {
        expect(result.success).toBe(true)

        const images = result.referencedImages
        const firstImage = images.find(img => img.src.includes('image1.jpg'))
        const figureImage = images.find(img => img.src.includes('image2.png'))

        expect(firstImage).toBeDefined()
        expect(firstImage.alt).toBe('First Image')

        expect(figureImage).toBeDefined()
        expect(figureImage.alt).toBe('Figure Image')
      })
    })
  })

  describe('Given markdown content with image references', () => {
    const markdown = `
# Article Title

Here's some text with images:

![First Image](https://example.com/image1.jpg)

Some more text.

![Second Image](https://example.com/image2.png)

And a data URL that should be ignored:
![Data Image](data:image/png;base64,abc123)

And a relative path:
![Relative](./local/image.jpg)
`

    describe('When I extract referenced images from markdown', () => {
      let images

      beforeEach(() => {
        images = converter.extractReferencedImages(markdown)
      })

      it('Then it should find only HTTP(S) URLs', () => {
        expect(Array.isArray(images)).toBe(true)
        expect(images.length).toBe(2)

        const imageSrcs = images.map(img => img.src)
        expect(imageSrcs).toContain('https://example.com/image1.jpg')
        expect(imageSrcs).toContain('https://example.com/image2.png')
      })

      it('And it should preserve alt text', () => {
        const firstImage = images.find(img => img.src.includes('image1.jpg'))
        const secondImage = images.find(img => img.src.includes('image2.png'))

        expect(firstImage).toBeDefined()
        expect(firstImage.alt).toBe('First Image')

        expect(secondImage).toBeDefined()
        expect(secondImage.alt).toBe('Second Image')
      })
    })
  })
})
