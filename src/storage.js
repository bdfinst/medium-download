import { promises as fs, existsSync } from 'fs'
import { fileURLToPath, URL } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Factory function for creating file system operations
const createFileSystem = () => ({
  ensureDirectory: async dirPath => {
    try {
      if (!existsSync(dirPath)) {
        await fs.mkdir(dirPath, { recursive: true })
      }
      return true
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`)
    }
  },

  writeFile: async (filePath, content) => {
    try {
      const dir = path.dirname(filePath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(filePath, content, 'utf8')
      return true
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`)
    }
  },

  fileExists: filePath => {
    return existsSync(filePath)
  },

  readFile: async filePath => {
    try {
      return await fs.readFile(filePath, 'utf8')
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`)
    }
  },
})

// Factory function for image downloading
const createImageDownloader = () => ({
  downloadImage: async (imageUrl, outputPath) => {
    try {
      // Import fetch dynamically since it's not available in all Node versions
      const fetch = (await import('node-fetch')).default

      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const buffer = await response.arrayBuffer()

      // Ensure output directory exists
      const dir = path.dirname(outputPath)
      await fs.mkdir(dir, { recursive: true })

      await fs.writeFile(outputPath, buffer)
      return true
    } catch (error) {
      throw new Error(
        `Failed to download image from ${imageUrl}: ${error.message}`
      )
    }
  },

  getImageExtension: imageUrl => {
    try {
      const urlObj = new URL(imageUrl)
      const pathname = urlObj.pathname
      const extension = path.extname(pathname).toLowerCase()

      // Default to .jpg if no extension found
      return extension || '.jpg'
    } catch {
      return '.jpg'
    }
  },

  generateImageFilename: (slug, index, imageUrl, isFeatured = false) => {
    const extension = createImageDownloader().getImageExtension(imageUrl)

    if (isFeatured) {
      return `${slug}-featured${extension}`
    }

    return `${slug}-${String(index).padStart(2, '0')}${extension}`
  },
})

// Factory function for creating storage service
export const createStorageService = (dependencies = {}) => {
  const fileSystem = dependencies.fileSystem || createFileSystem()
  const imageDownloader =
    dependencies.imageDownloader || createImageDownloader()

  const defaultOutputDir = path.join(__dirname, '..', 'output')
  const outputDir = dependencies.outputDir || defaultOutputDir

  // Save a markdown post with frontmatter in its own directory
  const savePost = async (postData, markdown) => {
    try {
      const slug = postData.slug || 'untitled'
      const postDir = path.join(outputDir, slug)
      await fileSystem.ensureDirectory(postDir)

      const filename = `${slug}.md`
      const filePath = path.join(postDir, filename)

      await fileSystem.writeFile(filePath, markdown)

      return {
        success: true,
        filePath,
        filename,
        postDir,
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to save post: ${error.message}`,
      }
    }
  }

  // Download only images that are referenced in the markdown content to the post's directory
  const downloadPostImages = async (postData, referencedImages = []) => {
    try {
      const slug = postData.slug || 'untitled'
      const postDir = path.join(outputDir, slug)
      const imagesDir = path.join(postDir, 'images')
      await fileSystem.ensureDirectory(imagesDir)

      const downloadedImages = []

      // Only download images that are actually referenced in the markdown
      if (referencedImages && Array.isArray(referencedImages)) {
        for (let i = 0; i < referencedImages.length; i++) {
          const image = referencedImages[i]

          try {
            // Determine if this is a featured image
            const isFeatured =
              postData.featuredImage &&
              (image.src === postData.featuredImage ||
                image.originalSrc === postData.featuredImage)

            const filename = imageDownloader.generateImageFilename(
              slug,
              i + 1,
              image.src,
              isFeatured
            )
            const imagePath = path.join(imagesDir, filename)

            await imageDownloader.downloadImage(image.src, imagePath)

            downloadedImages.push({
              originalUrl: image.src,
              localPath: imagePath,
              filename,
              relativePath: `./images/${filename}`,
              type: isFeatured ? 'featured' : 'content',
              alt: image.alt,
            })
          } catch (error) {
            console.warn(
              `Failed to download referenced image ${i + 1}: ${error.message}`
            )
          }
        }
      }

      return {
        success: true,
        downloadedImages,
        imagesDir,
        postDir,
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to download images: ${error.message}`,
        downloadedImages: [],
      }
    }
  }

  // Update markdown content to use local image references
  const updateImageReferences = (markdown, downloadedImages) => {
    try {
      let updatedMarkdown = markdown

      downloadedImages.forEach(image => {
        if (image.originalUrl && image.relativePath) {
          // Replace image URLs in markdown with local paths
          const urlRegex = new RegExp(
            image.originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            'g'
          )
          updatedMarkdown = updatedMarkdown.replace(
            urlRegex,
            image.relativePath
          )
        }
      })

      return updatedMarkdown
    } catch (error) {
      throw new Error(`Failed to update image references: ${error.message}`)
    }
  }

  // Save metadata about the scraping operation
  const saveMetadata = async metadata => {
    try {
      const metadataPath = path.join(outputDir, 'metadata.json')
      const metadataContent = JSON.stringify(metadata, null, 2)

      await fileSystem.writeFile(metadataPath, metadataContent)

      return {
        success: true,
        filePath: metadataPath,
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to save metadata: ${error.message}`,
      }
    }
  }

  // Get existing metadata
  const loadMetadata = async () => {
    try {
      const metadataPath = path.join(outputDir, 'metadata.json')

      if (!fileSystem.fileExists(metadataPath)) {
        return {
          success: true,
          metadata: null,
        }
      }

      const content = await fileSystem.readFile(metadataPath)
      const metadata = JSON.parse(content)

      return {
        success: true,
        metadata,
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to load metadata: ${error.message}`,
        metadata: null,
      }
    }
  }

  // Create directory structure (now each post gets its own directory)
  const initializeDirectories = async () => {
    try {
      await fileSystem.ensureDirectory(outputDir)

      return {
        success: true,
        directories: {
          output: outputDir,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to initialize directories: ${error.message}`,
      }
    }
  }

  // Save a complete post with images in its own directory
  const savePostWithImages = async (
    postData,
    markdown,
    referencedImages = []
  ) => {
    try {
      // First, download all referenced images to the post directory
      const imageResult = await downloadPostImages(postData, referencedImages)
      if (!imageResult.success) {
        return imageResult
      }

      // Update markdown to use local image paths
      const updatedMarkdown = updateImageReferences(
        markdown,
        imageResult.downloadedImages
      )

      // Save the post markdown file in the same directory
      const postResult = await savePost(postData, updatedMarkdown)
      if (!postResult.success) {
        return postResult
      }

      return {
        success: true,
        postDir: postResult.postDir,
        markdownFile: postResult.filePath,
        imagesDownloaded: imageResult.downloadedImages.length,
        downloadedImages: imageResult.downloadedImages,
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to save post with images: ${error.message}`,
      }
    }
  }

  return {
    savePost,
    downloadPostImages,
    updateImageReferences,
    savePostWithImages,
    saveMetadata,
    loadMetadata,
    initializeDirectories,
    outputDir,
  }
}

// Default export for convenience
export default createStorageService
