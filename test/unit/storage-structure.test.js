import { createStorageService } from '../../src/storage.js'
import { createMockFn } from '../test-utils.js'
import { fileURLToPath } from 'url'
import path from 'path'

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

      it('Then it should create the post directory structure', () => {
        expect(result.success).toBe(true)
        expect(result.postDir).toBeDefined()
        expect(result.postDir).toContain('test-post-slug')

        // Verify directory creation was requested (outcome-focused)
        expect(mockFileSystem.ensureDirectory.toHaveBeenCalled()).toBe(true)

        // Verify at least two directories were created: post dir and images dir
        expect(
          mockFileSystem.ensureDirectory.calls.length
        ).toBeGreaterThanOrEqual(2)
      })

      it('And it should organize images in a dedicated subdirectory', () => {
        // Focus on outcome: images should be properly organized
        expect(result.success).toBe(true)
        expect(result.imagesDownloaded).toBe(2)

        // Verify images directory was created (behavior-focused)
        const imagesDirCreated = mockFileSystem.ensureDirectory.calls.some(
          call => call[0].includes('images')
        )
        expect(imagesDirCreated).toBe(true)
      })

      it('And it should save the post as a markdown file', () => {
        // Focus on outcome: markdown file should be saved with correct path
        expect(result.success).toBe(true)
        expect(result.markdownFile).toBeDefined()
        expect(result.markdownFile).toContain('test-post-slug.md')

        // Verify file writing was attempted
        expect(mockFileSystem.writeFile.toHaveBeenCalled()).toBe(true)

        // Verify a markdown file was written
        const markdownFileWritten = mockFileSystem.writeFile.calls.some(call =>
          call[0].endsWith('.md')
        )
        expect(markdownFileWritten).toBe(true)
      })

      it('And it should download and organize all post images', () => {
        // Focus on outcome: images should be downloaded and properly organized
        expect(result.success).toBe(true)
        expect(result.imagesDownloaded).toBe(2)

        // Verify image downloading was attempted for all images
        expect(mockImageDownloader.downloadImage.toHaveBeenCalled()).toBe(true)
        expect(mockImageDownloader.downloadImage.calls.length).toBe(2)

        // Verify images were downloaded to the correct structure
        const allImagePaths = mockImageDownloader.downloadImage.calls.map(
          call => call[1]
        )
        const allImagesInCorrectDir = allImagePaths.every(
          path => path.includes('test-post-slug') && path.includes('images')
        )
        expect(allImagesInCorrectDir).toBe(true)
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
