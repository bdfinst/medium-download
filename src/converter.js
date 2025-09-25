import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

import { withErrorHandling } from './utils.js'

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

  // Filter out specific Medium UI elements
  turndownService.addRule('filterMediumUI', {
    filter: node => {
      const className = node.className || ''
      const dataModule = node.getAttribute('data-module') || ''
      const dataTestId = node.getAttribute('data-testid') || ''
      const text = node.textContent?.toLowerCase().trim() || ''
      const href = node.href?.toLowerCase() || ''

      // Filter out links to author/byline pages and publication pages
      if (node.tagName === 'A') {
        if (
          href.includes('medium.com/@') ||
          href.includes('/u/') ||
          href.includes('/@') ||
          href.includes('/publication') ||
          className.includes('author') ||
          className.includes('byline') ||
          className.includes('publication') ||
          dataTestId.includes('author') ||
          dataTestId.includes('byline') ||
          dataTestId.includes('publication') ||
          text.includes('follow') ||
          text.includes('subscribe')
        ) {
          return true
        }

        // Filter links that are publication names or author links by checking parent context
        const parent = node.parentElement
        if (parent && parent.className?.includes('byline')) {
          return true
        }
      }

      // Filter out entire byline containers and their children
      if (
        className.includes('byline') ||
        dataTestId.includes('byline') ||
        dataModule === 'AuthorByline' ||
        node.closest?.('[class*="byline"]') ||
        node.closest?.('[data-testid*="byline"]')
      ) {
        return true
      }

      // Filter out UI elements by class names
      if (
        className.includes('clap') ||
        className.includes('applause') ||
        className.includes('share') ||
        className.includes('follow') ||
        className.includes('listen') ||
        className.includes('medium-widget') ||
        className.includes('medium-button') ||
        className.includes('medium-interaction') ||
        className.includes('byline') ||
        className.includes('author-info') ||
        className.includes('footer') ||
        className.includes('responses') ||
        className.includes('post-footer') ||
        dataModule === 'ArticleFooter' ||
        dataModule === 'ArticleHeader' ||
        dataModule === 'ResponsesToPost' ||
        dataTestId.includes('author') ||
        dataTestId.includes('byline') ||
        dataTestId.includes('clap') ||
        dataTestId.includes('share') ||
        dataTestId.includes('response')
      ) {
        return true
      }

      // Filter out author signature paragraphs and publication info
      if (node.tagName === 'P') {
        if (
          text.includes('written by') ||
          text.includes('about the author') ||
          text.includes('follow me') ||
          text.includes('connect with me') ||
          text.includes('join medium for free') ||
          text.includes('get updates from this writer') ||
          (text.includes(' in ') &&
            text.length < 30 &&
            !text.includes('italic')) || // Short "in [Publication]" text, but not our test content
          text.match(/^.+\s+is a .+ (at|with)/i)
        ) {
          return true
        }
      }

      // Filter promotional subscription headers
      if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.tagName)) {
        if (
          text.includes('stories in your inbox') ||
          /get .+['']s stories in your inbox/i.test(text) ||
          /get .+ stories in your inbox/i.test(text)
        ) {
          return true
        }
      }

      // Filter spans that are byline/publication related
      if (node.tagName === 'SPAN') {
        if (
          text === 'in' ||
          (text.length < 20 &&
            (text.includes('min read') ||
              text.includes('dec ') ||
              text.includes('jan ') ||
              text.includes('feb ') ||
              text.includes('mar ') ||
              text.includes('apr ') ||
              text.includes('may ') ||
              text.includes('jun ') ||
              text.includes('jul ') ||
              text.includes('aug ') ||
              text.includes('sep ') ||
              text.includes('oct ') ||
              text.includes('nov ') ||
              /^\d{1,2}\s*(min read|claps?)$/i.test(text)))
        ) {
          return true
        }
      }

      // Filter divs that contain only byline/metadata
      if (node.tagName === 'DIV') {
        if (
          className.includes('article-meta') ||
          (text.length < 50 &&
            (text.includes('min read') ||
              text.includes(' in ') ||
              /^\d{1,2}\s*claps?$/i.test(text) ||
              /^\w{3}\s+\d{1,2},\s+\d{4}$/i.test(text))) // Date format like "Dec 1, 2024"
        ) {
          return true
        }
      }

      // Check for speechify-ignore elements using preserved data attribute
      if (node.getAttribute('data-speechify-ignore') === 'true') {
        return true
      }

      // Filter simple UI text elements (but not complex content)
      const hasComplexContent = node.children.length > 0 || text.length > 100
      if (!hasComplexContent) {
        const uiPatterns = [
          /^(sign up|sign in|get started)/i,
          /^(open in app|get the app)/i,
          /^(become a member|upgrade)/i,
          /^(highlight|add note|bookmark)/i,
          /^(more from .+)/i,
          /^(recommended from medium)/i,
          /^\d+\s*min read$/i,
          /^written by/i,
          /^follow$/i,
          /^\d+\s*followers?$/i,
          /^\d+\s*following$/i,
          /^\d+\s*(clap|applause|response)s?$/i,
          /^(clap|share|follow|listen)$/i,
          /^(about the author)/i,
          /^in$/i, // Filter standalone "in" words
        ]

        if (uiPatterns.some(pattern => pattern.test(text))) {
          return true
        }
      }

      // Also filter any text containing UI keywords if it's short and likely UI
      if (text.length < 50) {
        if (
          /👏/.test(text) ||
          text === 'clap' ||
          text === 'share' ||
          text === 'follow' ||
          text === 'listen' ||
          text === 'in' || // Filter standalone "in" words
          text.includes('written by') ||
          text.includes('about the author') ||
          text.includes('follow for more') ||
          text.includes('sign up to continue') ||
          text.includes('become a member') ||
          text.includes('related articles') ||
          text.includes('footer content') ||
          text.includes('header content') ||
          text.includes('share this article') ||
          text.includes('listen to this story') ||
          text.includes('more articles like this') ||
          text.includes('clap to show your support') ||
          text.includes('responses') ||
          text.includes('see responses') ||
          text.includes('view responses') ||
          /\d+\.?\d*k?\s*followers?$/i.test(text) ||
          /\d+\s*responses?$/i.test(text)
        ) {
          return true
        }
      }

      // Filter Medium promotional subscription blocks - only if element contains ONLY promotional content
      if (text.length < 200 && text.length > 0) {
        // Check if this element is specifically a promotional subscription element
        if (
          // Header patterns
          /^get .+['']?s stories in your inbox$/i.test(text.trim()) ||
          /^get .+ stories in your inbox$/i.test(text.trim()) ||
          // Text patterns
          text.trim() ===
            'join medium for free to get updates from this writer.' ||
          text.trim().toLowerCase() ===
            'join medium for free to get updates from this writer' ||
          // Button patterns
          text.trim().toLowerCase() === 'subscribe'
        ) {
          return true
        }
      }

      return false
    },
    replacement: () => '', // Remove these elements entirely
  })

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

        // Mark speechify-ignore elements before class removal
        .replace(
          /<([^>]+)class="[^"]*speechify-ignore[^"]*"([^>]*)>/gi,
          '<$1data-speechify-ignore="true"$2>'
        )

      const finalHtml = processedHtml
        // Remove data attributes except our speechify marker
        .replace(/data-(?!speechify-ignore)[^=]*="[^"]*"/g, '')

        // Convert Medium's custom elements to standard HTML
        .replace(/<mark[^>]*>/g, '<strong>')
        .replace(/<\/mark>/g, '</strong>')

        // Handle Medium's special formatting
        .replace(/class="[^"]*"/g, '') // Remove class attributes
        .replace(/id="[^"]*"/g, '') // Remove id attributes

      // Apply markdown conversion
      let markdown = turndownService.turndown(finalHtml)

      // Post-process markdown for cleaner output
      markdown = markdown
        // Remove promotional subscription headers specifically
        .replace(/^#{2,6}\s+Get .+['']?s stories in your inbox\s*\n/gim, '')
        .replace(/^#{2,6}\s+Get .+ stories in your inbox\s*\n/gim, '')
        // Remove standalone promotional text that might remain
        .replace(
          /Join Medium for free to get updates from this writer\.?\s*\n/gi,
          ''
        )
        .replace(/Join Medium to get updates from this author\.?\s*\n/gi, '')
        .replace(/Subscribe\s*\n\s*Subscribe\s*\n/gi, '')
        // Remove isolated "Subscribe" lines but not within other content
        .replace(/^\s*Subscribe\s*$/gm, '')
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
        featuredImage: metadata.featuredImage
          ? `./images/${metadata.slug}-featured.jpg`
          : '',
        published: true,
        ...metadata.customFields,
      }

      // Remove null/empty values (but keep arrays even if empty)
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
  const convertPost = withErrorHandling(async postData => {
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

    // Check if the markdown already contains the title as H1
    const markdownLines = markdown
      .trim()
      .split('\n')
      .filter(line => line.trim())

    // Look for any H1 that matches the title (case-insensitive)
    const hasMatchingH1 = markdownLines.some(
      line =>
        line.startsWith('# ') &&
        line.slice(2).trim().toLowerCase() === title.toLowerCase()
    )

    // Only add title if it's not already present as H1
    const contentWithTitle = hasMatchingH1
      ? markdown
      : `# ${title}\n\n${markdown}`

    // Combine frontmatter and markdown content with H1 title
    const fullMarkdown = frontmatter + contentWithTitle

    return {
      markdown: fullMarkdown,
      frontmatter,
      content: contentWithTitle,
      slug,
      filename: `${slug}.md`,
      referencedImages, // Only images actually referenced in markdown
    }
  })

  return {
    convertPost,
    convertToMarkdown: converter.convertToMarkdown,
    extractReferencedImages: converter.extractReferencedImages,
    generateFrontmatter: frontmatterGenerator.generateYamlFrontmatter,
  }
}

// Default export for convenience
export default createPostConverter
