import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

// Factory function for creating HTML to Markdown converter
const createConverter = (options = {}) => {
  const turndownService = new TurndownService({
    headingStyle: 'atx', // Use # headers
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
    linkReferenceStyle: 'full',
    ...options,
  })

  // Add GitHub Flavored Markdown support (tables, strikethrough, etc.)
  turndownService.use(gfm)

  // Handle header levels - only main title should be H1, downgrade all others
  // This rule will be customized per conversion to handle the first H1 specially
  turndownService.addRule('mediumHeaders', {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement: (content, node) => {
      const level = parseInt(node.tagName.charAt(1))

      // Check if this is the first H1 and matches the title (set during conversion)
      if (
        level === 1 &&
        turndownService.isFirstH1MatchingTitle &&
        content.trim().toLowerCase() ===
          turndownService.expectedTitle?.toLowerCase()
      ) {
        // Keep this as H1 since it's the actual title
        return `\n\n# ${content}\n\n`
      }

      // Downgrade all other headers by one level (H1 -> H2, H2 -> H3, etc.)
      const adjustedLevel = Math.min(level + 1, 6)
      const hashes = '#'.repeat(adjustedLevel)
      return `\n\n${hashes} ${content}\n\n`
    },
  })

  // Custom rules for Medium-specific elements
  turndownService.addRule('mediumQuotes', {
    filter: ['blockquote'],
    replacement: content => {
      const lines = content.trim().split('\n')
      return lines.map(line => `> ${line}`).join('\n') + '\n\n'
    },
  })

  // Handle Medium's figure elements (images with captions)
  turndownService.addRule('mediumFigures', {
    filter: 'figure',
    replacement: (content, node) => {
      const img = node.querySelector('img')
      const figcaption = node.querySelector('figcaption')

      if (img) {
        const src = img.getAttribute('src') || ''
        const alt =
          img.getAttribute('alt') || figcaption?.textContent?.trim() || ''
        const caption = figcaption ? `\n*${figcaption.textContent.trim()}*` : ''
        return `![${alt}](${src})${caption}\n\n`
      }

      return content
    },
  })

  // Handle Medium's code blocks with syntax highlighting
  turndownService.addRule('mediumCodeBlocks', {
    filter: 'pre',
    replacement: (content, node) => {
      const code = node.querySelector('code')
      if (code) {
        const language = code.className.match(/language-(\w+)/)?.[1] || ''
        const codeContent = code.textContent || ''
        return `\`\`\`${language}\n${codeContent}\n\`\`\`\n\n`
      }
      return `\`\`\`\n${content}\n\`\`\`\n\n`
    },
  })

  // Handle Medium's inline code
  turndownService.addRule('mediumInlineCode', {
    filter: ['code'],
    replacement: content => {
      if (content.includes('\n')) {
        return `\`\`\`\n${content}\n\`\`\``
      }
      return `\`${content}\``
    },
  })

  // Handle Medium embeds (Twitter, YouTube, etc.)
  turndownService.addRule('mediumEmbeds', {
    filter: node => {
      return (
        node.classList?.contains('medium-embed') ||
        node.getAttribute('data-embed-type') ||
        (node.tagName === 'IFRAME' && node.src)
      )
    },
    replacement: (content, node) => {
      const embedType = node.getAttribute('data-embed-type') || 'embed'
      const src = node.src || node.getAttribute('data-src') || ''

      if (src.includes('twitter.com')) {
        return `\n**[Twitter Embed](${src})**\n\n`
      }
      if (src.includes('youtube.com') || src.includes('youtu.be')) {
        return `\n**[YouTube Video](${src})**\n\n`
      }
      if (src.includes('github.com')) {
        return `\n**[GitHub Embed](${src})**\n\n`
      }

      return `\n**[${embedType} Embed](${src})**\n\n`
    },
  })

  // Extract images referenced in markdown content
  const extractReferencedImages = markdown => {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    const images = []
    let match

    while ((match = imageRegex.exec(markdown)) !== null) {
      const [, alt, src] = match
      // Only include valid HTTP(S) URLs, skip data URLs and relative paths
      if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
        images.push({
          alt: alt || '',
          src,
          originalSrc: src,
        })
      }
    }

    return images
  }

  // Convert HTML to clean markdown
  const convertToMarkdown = html => {
    try {
      if (!html || typeof html !== 'string') {
        return ''
      }

      // Pre-process HTML to handle Medium-specific quirks
      const processedHtml = html
        // Remove Medium's specific tracking elements
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/data-[^=]*="[^"]*"/g, '') // Remove data attributes

        // Convert Medium's custom elements to standard HTML
        .replace(/<mark[^>]*>/g, '<strong>')
        .replace(/<\/mark>/g, '</strong>')

        // Handle Medium's special formatting
        .replace(/class="[^"]*"/g, '') // Remove class attributes
        .replace(/id="[^"]*"/g, '') // Remove id attributes

      // Apply markdown conversion
      let markdown = turndownService.turndown(processedHtml)

      // Post-process markdown for cleaner output
      markdown = markdown
        // Fix multiple consecutive line breaks
        .replace(/\n{3,}/g, '\n\n')
        // Fix spacing around headers
        .replace(/\n(#{1,6})/g, '\n\n$1')
        // Fix spacing around code blocks
        .replace(/\n```/g, '\n\n```')
        .replace(/```\n([^`])/g, '```\n\n$1')
        // Clean up list formatting
        .replace(/\n(\*|-|\d+\.)\s/g, '\n\n$1 ')
        // Clean up blockquotes
        .replace(/\n>/g, '\n\n>')

      return markdown.trim()
    } catch (error) {
      throw new Error(`Failed to convert HTML to markdown: ${error.message}`)
    }
  }

  return {
    convertToMarkdown,
    extractReferencedImages,
    turndownService, // Expose for custom rules if needed
  }
}

// Factory function for frontmatter generation
const createFrontmatterGenerator = () => ({
  generateYamlFrontmatter: metadata => {
    try {
      // Extract publication info from URL if it's a publication post
      const extractPublicationInfo = url => {
        if (!url) return null

        // Check for Medium publication format: medium.com/publication-name/
        const publicationMatch = url.match(/medium\.com\/([^/@][^/]+)\//)
        if (publicationMatch) {
          return {
            name: publicationMatch[1],
            url: `https://medium.com/${publicationMatch[1]}`,
          }
        }

        // Check for custom domain publication: publication.medium.com
        const customDomainMatch = url.match(/https:\/\/([^.]+)\.medium\.com\//)
        if (customDomainMatch) {
          return {
            name: customDomainMatch[1],
            url: url.split('/').slice(0, 3).join('/'),
          }
        }

        return null
      }

      const publication = extractPublicationInfo(
        metadata.mediumUrl || metadata.canonicalUrl
      )

      const frontmatter = {
        title: metadata.title || 'Untitled',
        subtitle: metadata.subtitle || null,
        date: metadata.publishDate || new Date().toISOString(),
        lastModified:
          metadata.lastModified ||
          metadata.publishDate ||
          new Date().toISOString(),
        author: metadata.author || 'Unknown',
        tags: metadata.tags || [],
        readingTime: metadata.readingTime || '',
        claps: metadata.claps || 0,
        responses: metadata.responses || 0,
        mediumUrl: metadata.mediumUrl || metadata.canonicalUrl || '',
        featuredImage: metadata.featuredImage
          ? `./images/${metadata.slug}-featured.jpg`
          : '',
        canonicalUrl: metadata.canonicalUrl || metadata.mediumUrl || '',
        published: true,
        publication: publication
          ? {
              name: publication.name,
              url: publication.url,
            }
          : null,
        ...metadata.customFields,
      }

      // Remove null/empty values
      Object.keys(frontmatter).forEach(key => {
        if (frontmatter[key] === null || frontmatter[key] === '') {
          delete frontmatter[key]
        }
      })

      // Convert to YAML format
      const yamlLines = ['---']

      Object.entries(frontmatter).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          yamlLines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`)
        } else if (typeof value === 'string') {
          yamlLines.push(`${key}: "${value.replace(/"/g, '\\"')}"`)
        } else {
          yamlLines.push(`${key}: ${value}`)
        }
      })

      yamlLines.push('---', '')

      return yamlLines.join('\n')
    } catch (error) {
      throw new Error(`Failed to generate frontmatter: ${error.message}`)
    }
  },
})

// Factory function for creating post converter service
export const createPostConverter = (dependencies = {}) => {
  const converter = dependencies.converter || createConverter()
  const frontmatterGenerator =
    dependencies.frontmatterGenerator || createFrontmatterGenerator()

  // Convert a post's HTML content to markdown with frontmatter
  const convertPost = async postData => {
    try {
      if (!postData || !postData.content) {
        throw new Error('Post data and content are required')
      }

      // Generate URL slug from title
      const slug =
        postData.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'untitled'

      // Set up title handling for conversion
      const title = postData.title || 'Untitled'
      converter.turndownService.expectedTitle = title
      converter.turndownService.isFirstH1MatchingTitle = true

      // Convert HTML content to markdown
      const markdown = converter.convertToMarkdown(postData.content)

      // Clean up the flags
      delete converter.turndownService.expectedTitle
      delete converter.turndownService.isFirstH1MatchingTitle

      // Extract images that are actually referenced in the markdown
      const referencedImages = converter.extractReferencedImages(markdown)

      // Generate frontmatter with slug
      const frontmatter = frontmatterGenerator.generateYamlFrontmatter({
        ...postData,
        slug,
      })

      // Add main title as H1 at the beginning of content (after frontmatter)
      // But only if the content doesn't already start with the same title as H1
      const markdownLines = markdown.trim().split('\n')
      const firstLine = markdownLines[0] || ''

      // Check if content already starts with the same title as H1
      const alreadyHasTitle =
        firstLine.startsWith('# ') &&
        firstLine.slice(2).trim().toLowerCase() === title.toLowerCase()

      const contentWithTitle = alreadyHasTitle
        ? markdown
        : `# ${title}\n\n${markdown}`

      // Combine frontmatter and markdown content with H1 title
      const fullMarkdown = frontmatter + contentWithTitle

      return {
        success: true,
        markdown: fullMarkdown,
        frontmatter,
        content: contentWithTitle,
        slug,
        filename: `${slug}.md`,
        referencedImages, // Only images actually referenced in markdown
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to convert post: ${error.message}`,
      }
    }
  }

  return {
    convertPost,
    convertToMarkdown: converter.convertToMarkdown,
    extractReferencedImages: converter.extractReferencedImages,
    generateFrontmatter: frontmatterGenerator.generateYamlFrontmatter,
  }
}

// Default export for convenience
export default createPostConverter
