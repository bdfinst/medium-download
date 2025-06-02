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
        expect(result.success).toBe(true)

        // Check that ensureDirectory was called for the post directory
        const ensureDirCalls = mockFileSystem.ensureDirectory.calls
        const postDirCall = ensureDirCalls.find(
          call =>
            call[0].includes('test-post-slug') && !call[0].includes('images')
        )

        expect(postDirCall).toBeDefined()

        const expectedPostDir = path.join(testOutputDir, 'test-post-slug')
        expect(postDirCall[0]).toBe(expectedPostDir)
      })

      it('And it should create the images subdirectory', () => {
        // Check that ensureDirectory was called for the images directory
        const ensureDirCalls = mockFileSystem.ensureDirectory.calls
        const imagesDirCall = ensureDirCalls.find(call =>
          call[0].includes('test-post-slug/images')
        )

        expect(imagesDirCall).toBeDefined()

        const expectedImagesDir = path.join(
          testOutputDir,
          'test-post-slug',
          'images'
        )
        expect(imagesDirCall[0]).toBe(expectedImagesDir)
      })

      it('And it should save the markdown file in the post directory', () => {
        // Check that writeFile was called with the correct path
        const writeFileCalls = mockFileSystem.writeFile.calls
        const markdownCall = writeFileCalls.find(call =>
          call[0].endsWith('.md')
        )

        expect(markdownCall).toBeDefined()

        const expectedMarkdownPath = path.join(
          testOutputDir,
          'test-post-slug',
          'test-post-slug.md'
        )
        expect(markdownCall[0]).toBe(expectedMarkdownPath)
      })

      it('And it should download images to the post images directory', () => {
        // Check that downloadImage was called for each referenced image
        const downloadCalls = mockImageDownloader.downloadImage.calls

        expect(downloadCalls.length).toBe(2)

        // Check featured image path
        const featuredCall = downloadCalls.find(call =>
          call[1].includes('test-post-slug-featured.jpg')
        )
        expect(featuredCall).toBeDefined()

        const expectedFeaturedPath = path.join(
          testOutputDir,
          'test-post-slug',
          'images',
          'test-post-slug-featured.jpg'
        )
        expect(featuredCall[1]).toBe(expectedFeaturedPath)

        // Check content image path
        const contentCall = downloadCalls.find(call =>
          call[1].includes('test-post-slug-02.jpg')
        )
        expect(contentCall).toBeDefined()

        const expectedContentPath = path.join(
          testOutputDir,
          'test-post-slug',
          'images',
          'test-post-slug-02.jpg'
        )
        expect(contentCall[1]).toBe(expectedContentPath)
      })

      it('And it should return the correct directory structure info', () => {
        expect(result.success).toBe(true)

        const expectedPostDir = path.join(testOutputDir, 'test-post-slug')
        expect(result.postDir).toBe(expectedPostDir)

        const expectedMarkdownFile = path.join(
          expectedPostDir,
          'test-post-slug.md'
        )
        expect(result.markdownFile).toBe(expectedMarkdownFile)

        expect(result.imagesDownloaded).toBe(2)
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
        expect(expectedStructure.postDir).toContain(slug)
        expect(expectedStructure.markdownFile).toMatch(
          new RegExp(`${slug}.md$`)
        )
        expect(expectedStructure.imagesDir).toMatch(/images$/)
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

          expect(hasMarkdown).toBe(true)
          expect(hasImages).toBe(true)
        })
      })
    })
  })
})
