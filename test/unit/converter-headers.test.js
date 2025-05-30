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
        if (!result.success) {
          throw new Error('Expected conversion to succeed')
        }

        const h1Count = (result.markdown.match(/^# /gm) || []).length
        if (h1Count !== 1) {
          throw new Error(`Expected exactly 1 H1, found ${h1Count}`)
        }

        if (!result.markdown.includes('# Main Article Title')) {
          throw new Error('Expected main title to be H1')
        }
      })

      it('And all original headers should be downgraded by one level', () => {
        if (!result.success) {
          throw new Error('Expected conversion to succeed')
        }

        const markdown = result.markdown

        // Original H1 should become H2
        if (!markdown.includes('## This should become H2')) {
          throw new Error('Original H1 should become H2')
        }

        // Original H2 should become H3
        if (!markdown.includes('### This should become H3')) {
          throw new Error('Original H2 should become H3')
        }

        // Original H3 should become H4
        if (!markdown.includes('#### This should become H4')) {
          throw new Error('Original H3 should become H4')
        }

        // Original H4 should become H5
        if (!markdown.includes('##### This should become H5')) {
          throw new Error('Original H4 should become H5')
        }

        // Original H5 should become H6
        if (!markdown.includes('###### This should become H6')) {
          throw new Error('Original H5 should become H6')
        }

        // Original H6 should stay H6 (max level)
        if (!markdown.includes('###### This should stay H6')) {
          throw new Error('Original H6 should stay H6')
        }
      })

      it('And the content structure should be preserved', () => {
        if (!result.success) {
          throw new Error('Expected conversion to succeed')
        }

        const markdown = result.markdown

        if (!markdown.includes('Some content after H1.')) {
          throw new Error('Content after headers should be preserved')
        }

        if (!markdown.includes('Content after H2.')) {
          throw new Error('Content after headers should be preserved')
        }
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
        if (!result.success) {
          throw new Error('Expected conversion to succeed')
        }

        const images = result.referencedImages
        if (!Array.isArray(images)) {
          throw new Error('Expected referencedImages to be an array')
        }

        // Should find 2 valid images (image1.jpg and image2.png)
        if (images.length !== 2) {
          throw new Error(
            `Expected 2 referenced images, found ${images.length}`
          )
        }

        const imageSrcs = images.map(img => img.src)
        if (!imageSrcs.includes('https://example.com/image1.jpg')) {
          throw new Error('Should include first image')
        }

        if (!imageSrcs.includes('https://example.com/image2.png')) {
          throw new Error('Should include figure image')
        }
      })

      it('And it should exclude data URLs and relative paths', () => {
        if (!result.success) {
          throw new Error('Expected conversion to succeed')
        }

        const images = result.referencedImages
        const imageSrcs = images.map(img => img.src)

        // Should not include data URLs
        const hasDataUrl = imageSrcs.some(src => src.startsWith('data:'))
        if (hasDataUrl) {
          throw new Error('Should not include data URLs')
        }

        // Should not include relative paths
        const hasRelativePath = imageSrcs.some(
          src => src.startsWith('/') || !src.includes('://')
        )
        if (hasRelativePath) {
          throw new Error('Should not include relative paths')
        }
      })

      it('And it should preserve alt text for images', () => {
        if (!result.success) {
          throw new Error('Expected conversion to succeed')
        }

        const images = result.referencedImages
        const firstImage = images.find(img => img.src.includes('image1.jpg'))
        const figureImage = images.find(img => img.src.includes('image2.png'))

        if (!firstImage || firstImage.alt !== 'First Image') {
          throw new Error('Should preserve alt text for first image')
        }

        if (!figureImage || figureImage.alt !== 'Figure Image') {
          throw new Error('Should preserve alt text for figure image')
        }
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
        if (!Array.isArray(images)) {
          throw new Error('Expected images to be an array')
        }

        if (images.length !== 2) {
          throw new Error(`Expected 2 images, found ${images.length}`)
        }

        const imageSrcs = images.map(img => img.src)
        if (!imageSrcs.includes('https://example.com/image1.jpg')) {
          throw new Error('Should include first image')
        }

        if (!imageSrcs.includes('https://example.com/image2.png')) {
          throw new Error('Should include second image')
        }
      })

      it('And it should preserve alt text', () => {
        const firstImage = images.find(img => img.src.includes('image1.jpg'))
        const secondImage = images.find(img => img.src.includes('image2.png'))

        if (!firstImage || firstImage.alt !== 'First Image') {
          throw new Error('Should preserve first image alt text')
        }

        if (!secondImage || secondImage.alt !== 'Second Image') {
          throw new Error('Should preserve second image alt text')
        }
      })
    })
  })
})
