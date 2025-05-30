import { createStorageService } from '../../src/storage.js'
import { fileURLToPath } from 'url'
import path from 'path'

// Create a simple mock function replacement
const createMockFn = returnValue => {
  const fn = (...args) => {
    fn.calls = fn.calls || []
    fn.calls.push(args)
    if (typeof returnValue === 'function') {
      return returnValue(...args)
    }
    return returnValue
  }
  fn.calls = []
  return fn
}

describe('Storage Service - Directory Structure', () => {
  let storageService
  let mockFileSystem
  let mockImageDownloader
  let testOutputDir

  beforeEach(() => {
    // Create a temporary test directory
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    testOutputDir = path.join(__dirname, '..', '..', 'test-output')

    // Mock file system operations
    mockFileSystem = {
      ensureDirectory: createMockFn(Promise.resolve(true)),
      writeFile: createMockFn(Promise.resolve(true)),
      fileExists: createMockFn(false),
      readFile: createMockFn(Promise.resolve('')),
    }

    // Mock image downloader
    mockImageDownloader = {
      downloadImage: createMockFn(Promise.resolve(true)),
      getImageExtension: createMockFn('.jpg'),
      generateImageFilename: createMockFn((slug, index, url, isFeatured) =>
        isFeatured
          ? `${slug}-featured.jpg`
          : `${slug}-${String(index).padStart(2, '0')}.jpg`
      ),
    }

    storageService = createStorageService({
      fileSystem: mockFileSystem,
      imageDownloader: mockImageDownloader,
      outputDir: testOutputDir,
    })
  })

  describe('Given a post with images', () => {
    const mockPostData = {
      slug: 'test-post-slug',
      title: 'Test Post Title',
      featuredImage: 'https://example.com/featured.jpg',
    }

    const mockReferencedImages = [
      {
        src: 'https://example.com/featured.jpg',
        alt: 'Featured Image',
      },
      {
        src: 'https://example.com/content-image.png',
        alt: 'Content Image',
      },
    ]

    const mockMarkdown = `# Test Post Title

Here's some content with an image:

![Featured Image](https://example.com/featured.jpg)

More content with another image:

![Content Image](https://example.com/content-image.png)

The end.`

    describe('When I save the post with images', () => {
      let result

      beforeEach(async () => {
        result = await storageService.savePostWithImages(
          mockPostData,
          mockMarkdown,
          mockReferencedImages
        )
      })

      it('Then it should create the post directory', () => {
        if (!result.success) {
          throw new Error('Expected save operation to succeed')
        }

        // Check that ensureDirectory was called for the post directory
        const ensureDirCalls = mockFileSystem.ensureDirectory.calls
        const postDirCall = ensureDirCalls.find(
          call =>
            call[0].includes('test-post-slug') && !call[0].includes('images')
        )

        if (!postDirCall) {
          throw new Error('Expected post directory to be created')
        }

        const expectedPostDir = path.join(testOutputDir, 'test-post-slug')
        if (postDirCall[0] !== expectedPostDir) {
          throw new Error(
            `Expected post directory ${expectedPostDir}, got ${postDirCall[0]}`
          )
        }
      })

      it('And it should create the images subdirectory', () => {
        // Check that ensureDirectory was called for the images directory
        const ensureDirCalls = mockFileSystem.ensureDirectory.calls
        const imagesDirCall = ensureDirCalls.find(call =>
          call[0].includes('test-post-slug/images')
        )

        if (!imagesDirCall) {
          throw new Error('Expected images directory to be created')
        }

        const expectedImagesDir = path.join(
          testOutputDir,
          'test-post-slug',
          'images'
        )
        if (imagesDirCall[0] !== expectedImagesDir) {
          throw new Error(
            `Expected images directory ${expectedImagesDir}, got ${imagesDirCall[0]}`
          )
        }
      })

      it('And it should save the markdown file in the post directory', () => {
        // Check that writeFile was called with the correct path
        const writeFileCalls = mockFileSystem.writeFile.calls
        const markdownCall = writeFileCalls.find(call =>
          call[0].endsWith('.md')
        )

        if (!markdownCall) {
          throw new Error('Expected markdown file to be written')
        }

        const expectedMarkdownPath = path.join(
          testOutputDir,
          'test-post-slug',
          'test-post-slug.md'
        )
        if (markdownCall[0] !== expectedMarkdownPath) {
          throw new Error(
            `Expected markdown path ${expectedMarkdownPath}, got ${markdownCall[0]}`
          )
        }
      })

      it('And it should download images to the post images directory', () => {
        // Check that downloadImage was called for each referenced image
        const downloadCalls = mockImageDownloader.downloadImage.calls

        if (downloadCalls.length !== 2) {
          throw new Error(
            `Expected 2 image downloads, got ${downloadCalls.length}`
          )
        }

        // Check featured image path
        const featuredCall = downloadCalls.find(call =>
          call[1].includes('test-post-slug-featured.jpg')
        )
        if (!featuredCall) {
          throw new Error('Expected featured image to be downloaded')
        }

        const expectedFeaturedPath = path.join(
          testOutputDir,
          'test-post-slug',
          'images',
          'test-post-slug-featured.jpg'
        )
        if (featuredCall[1] !== expectedFeaturedPath) {
          throw new Error(
            `Expected featured image path ${expectedFeaturedPath}, got ${featuredCall[1]}`
          )
        }

        // Check content image path
        const contentCall = downloadCalls.find(call =>
          call[1].includes('test-post-slug-02.jpg')
        )
        if (!contentCall) {
          throw new Error('Expected content image to be downloaded')
        }

        const expectedContentPath = path.join(
          testOutputDir,
          'test-post-slug',
          'images',
          'test-post-slug-02.jpg'
        )
        if (contentCall[1] !== expectedContentPath) {
          throw new Error(
            `Expected content image path ${expectedContentPath}, got ${contentCall[1]}`
          )
        }
      })

      it('And it should return the correct directory structure info', () => {
        if (!result.success) {
          throw new Error('Expected operation to succeed')
        }

        const expectedPostDir = path.join(testOutputDir, 'test-post-slug')
        if (result.postDir !== expectedPostDir) {
          throw new Error(
            `Expected postDir ${expectedPostDir}, got ${result.postDir}`
          )
        }

        const expectedMarkdownFile = path.join(
          expectedPostDir,
          'test-post-slug.md'
        )
        if (result.markdownFile !== expectedMarkdownFile) {
          throw new Error(
            `Expected markdownFile ${expectedMarkdownFile}, got ${result.markdownFile}`
          )
        }

        if (result.imagesDownloaded !== 2) {
          throw new Error(
            `Expected 2 images downloaded, got ${result.imagesDownloaded}`
          )
        }
      })
    })
  })

  describe('Given the expected directory structure', () => {
    describe('When I examine the layout', () => {
      it('Then it should follow the pattern: output/post-slug/post-slug.md', () => {
        const slug = 'example-post'
        const expectedStructure = {
          postDir: path.join(testOutputDir, slug),
          markdownFile: path.join(testOutputDir, slug, `${slug}.md`),
          imagesDir: path.join(testOutputDir, slug, 'images'),
        }

        // This test documents the expected structure
        if (!expectedStructure.postDir.includes(slug)) {
          throw new Error('Post directory should contain the slug')
        }

        if (!expectedStructure.markdownFile.endsWith(`${slug}.md`)) {
          throw new Error('Markdown file should be named after the slug')
        }

        if (!expectedStructure.imagesDir.endsWith('images')) {
          throw new Error('Images should be in an images subdirectory')
        }
      })

      it('And each post should be completely self-contained', () => {
        // Document that each post directory contains everything needed
        const exampleFiles = [
          'output/first-post/first-post.md',
          'output/first-post/images/first-post-featured.jpg',
          'output/first-post/images/first-post-01.jpg',
          'output/second-post/second-post.md',
          'output/second-post/images/second-post-featured.jpg',
        ]

        // Verify the pattern is correct
        const postDirs = ['first-post', 'second-post']
        postDirs.forEach(slug => {
          const hasMarkdown = exampleFiles.some(file =>
            file.includes(`${slug}/${slug}.md`)
          )
          const hasImages = exampleFiles.some(file =>
            file.includes(`${slug}/images/`)
          )

          if (!hasMarkdown) {
            throw new Error(
              `Each post should have its own markdown file: ${slug}.md`
            )
          }

          if (!hasImages) {
            throw new Error(`Each post should have its own images directory`)
          }
        })
      })
    })
  })
})
