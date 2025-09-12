import { ScraperError, ErrorTypes } from '../error-handling.js'

// Individual post processing utilities

export const processPostContent = async (scraperService, post) => {
  const contentResult = await scraperService.extractPostContent(post.url)
  if (!contentResult.success) {
    throw new ScraperError(contentResult.error, ErrorTypes.PARSING)
  }
  return contentResult
}

export const convertPostToMarkdown = async (converter, contentResult) => {
  const conversionResult = await converter.convertPost(contentResult)
  if (!conversionResult.success) {
    throw new ScraperError(conversionResult.error, ErrorTypes.PARSING)
  }
  return conversionResult
}

export const savePostWithImages = async (
  storage,
  contentResult,
  conversionResult
) => {
  const saveResult = await storage.savePostWithImages(
    {
      ...contentResult,
      slug: conversionResult.slug,
    },
    conversionResult.markdown,
    conversionResult.referencedImages
  )

  if (!saveResult.success) {
    throw new ScraperError(saveResult.error, ErrorTypes.FILE_SYSTEM)
  }

  return {
    url: contentResult.canonicalUrl || contentResult.mediumUrl,
    title: contentResult.title,
    slug: conversionResult.slug,
    filename: saveResult.markdownFile,
    imagesDownloaded: saveResult.imagesDownloaded || 0,
    postDir: saveResult.postDir,
  }
}

export const processPost = async (
  post,
  { scraperService, converter, storage }
) => {
  // Step 1: Extract detailed content and metadata
  const contentResult = await processPostContent(scraperService, post)

  // Step 2: Convert HTML to markdown with frontmatter
  const conversionResult = await convertPostToMarkdown(converter, contentResult)

  // Step 3: Save post with images
  return await savePostWithImages(storage, contentResult, conversionResult)
}

export const createPostProcessor = ({ scraperService, converter, storage }) => {
  return {
    process: post => processPost(post, { scraperService, converter, storage }),
  }
}
