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

      const buffer = await response.buffer()

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

  // Save a markdown post with frontmatter
  const savePost = async (postData, markdown) => {
    try {
      const postsDir = path.join(outputDir, 'posts')
      await fileSystem.ensureDirectory(postsDir)

      const filename = `${postData.slug || 'untitled'}.md`
      const filePath = path.join(postsDir, filename)

      await fileSystem.writeFile(filePath, markdown)

      return {
        success: true,
        filePath,
        filename,
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to save post: ${error.message}`,
      }
    }
  }

  // Download and organize images for a post
  const downloadPostImages = async postData => {
    try {
      const imagesDir = path.join(outputDir, 'images')
      await fileSystem.ensureDirectory(imagesDir)

      const downloadedImages = []
      const slug = postData.slug || 'untitled'

      // Download featured image if available
      if (postData.featuredImage) {
        try {
          const featuredFilename = imageDownloader.generateImageFilename(
            slug,
            0,
            postData.featuredImage,
            true
          )
          const featuredPath = path.join(imagesDir, featuredFilename)

          await imageDownloader.downloadImage(
            postData.featuredImage,
            featuredPath
          )

          downloadedImages.push({
            originalUrl: postData.featuredImage,
            localPath: featuredPath,
            filename: featuredFilename,
            relativePath: `./images/${featuredFilename}`,
            type: 'featured',
          })
        } catch (error) {
          console.warn(`Failed to download featured image: ${error.message}`)
        }
      }

      // Download content images
      if (postData.images && Array.isArray(postData.images)) {
        for (let i = 0; i < postData.images.length; i++) {
          const image = postData.images[i]

          try {
            const filename = imageDownloader.generateImageFilename(
              slug,
              i + 1,
              image.src
            )
            const imagePath = path.join(imagesDir, filename)

            await imageDownloader.downloadImage(image.src, imagePath)

            downloadedImages.push({
              originalUrl: image.src,
              localPath: imagePath,
              filename,
              relativePath: `./images/${filename}`,
              type: 'content',
              alt: image.alt,
              title: image.title,
            })
          } catch (error) {
            console.warn(`Failed to download image ${i + 1}: ${error.message}`)
          }
        }
      }

      return {
        success: true,
        downloadedImages,
        imagesDir,
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

  // Create directory structure
  const initializeDirectories = async () => {
    try {
      await fileSystem.ensureDirectory(path.join(outputDir, 'posts'))
      await fileSystem.ensureDirectory(path.join(outputDir, 'images'))

      return {
        success: true,
        directories: {
          output: outputDir,
          posts: path.join(outputDir, 'posts'),
          images: path.join(outputDir, 'images'),
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to initialize directories: ${error.message}`,
      }
    }
  }

  return {
    savePost,
    downloadPostImages,
    updateImageReferences,
    saveMetadata,
    loadMetadata,
    initializeDirectories,
    outputDir,
  }
}

// Default export for convenience
export default createStorageService
