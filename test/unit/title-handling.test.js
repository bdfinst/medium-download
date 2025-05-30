import { createPostConverter } from '../../src/converter.js'

describe('Title Handling - Duplicate Prevention', () => {
  let converter

  beforeEach(() => {
    converter = createPostConverter()
  })

  describe('Given post content that already has the title as H1', () => {
    const postDataWithTitleInContent = {
      title: 'My Amazing Blog Post',
      content: `
        <h1>My Amazing Blog Post</h1>
        <p>This is the content of the post.</p>
        <h2>Section Header</h2>
        <p>More content here.</p>
      `,
      author: 'Test Author',
    }

    describe('When I convert the post', () => {
      let result

      beforeEach(async () => {
        result = await converter.convertPost(postDataWithTitleInContent)
      })

      it('Then it should not duplicate the title', () => {
        if (!result.success) {
          throw new Error('Expected conversion to succeed')
        }

        // Count H1 occurrences in the content
        const h1Count = (result.content.match(/^# /gm) || []).length
        if (h1Count !== 1) {
          throw new Error(`Expected exactly 1 H1, found ${h1Count}`)
        }

        // Should not have duplicate title
        if (
          result.content.includes(
            '# My Amazing Blog Post\n\n## My Amazing Blog Post'
          )
        ) {
          throw new Error('Title should not be duplicated')
        }
      })

      it('And the title should remain as H1', () => {
        if (!result.content.startsWith('# My Amazing Blog Post')) {
          throw new Error('Content should start with the title as H1')
        }
      })

      it('And original H2 should become H3', () => {
        if (!result.content.includes('### Section Header')) {
          throw new Error('Original H2 should be downgraded to H3')
        }
      })
    })
  })

  describe('Given post content without the title', () => {
    const postDataWithoutTitle = {
      title: 'My Other Blog Post',
      content: `
        <p>This content doesn't have the title as a header.</p>
        <h2>First Section</h2>
        <p>Some content here.</p>
        <h3>Subsection</h3>
        <p>More content.</p>
      `,
      author: 'Test Author',
    }

    describe('When I convert the post', () => {
      let result

      beforeEach(async () => {
        result = await converter.convertPost(postDataWithoutTitle)
      })

      it('Then it should add the title as H1', () => {
        if (!result.success) {
          throw new Error('Expected conversion to succeed')
        }

        if (!result.content.startsWith('# My Other Blog Post')) {
          throw new Error('Content should start with the title as H1')
        }
      })

      it('And should have exactly one H1', () => {
        const h1Count = (result.content.match(/^# /gm) || []).length
        if (h1Count !== 1) {
          throw new Error(`Expected exactly 1 H1, found ${h1Count}`)
        }
      })

      it('And original headers should be properly downgraded', () => {
        if (!result.content.includes('### First Section')) {
          throw new Error('Original H2 should be downgraded to H3')
        }

        if (!result.content.includes('#### Subsection')) {
          throw new Error('Original H3 should be downgraded to H4')
        }
      })
    })
  })

  describe('Given post content with a different title as H1', () => {
    const postDataWithDifferentTitle = {
      title: 'Correct Title From Metadata',
      content: `
        <h1>Wrong Title From Content</h1>
        <p>This has a different title in the content.</p>
        <h2>Section</h2>
        <p>Content here.</p>
      `,
      author: 'Test Author',
    }

    describe('When I convert the post', () => {
      let result

      beforeEach(async () => {
        result = await converter.convertPost(postDataWithDifferentTitle)
      })

      it('Then it should add the correct title as H1', () => {
        if (!result.success) {
          throw new Error('Expected conversion to succeed')
        }

        if (!result.content.startsWith('# Correct Title From Metadata')) {
          throw new Error(
            'Content should start with the correct title from metadata'
          )
        }
      })

      it('And should have two H1s (correct title + downgraded wrong title)', () => {
        // The correct title as H1, plus the wrong title downgraded to H2
        const h1Count = (result.content.match(/^# /gm) || []).length
        if (h1Count !== 1) {
          throw new Error(
            `Expected exactly 1 H1 (correct title), found ${h1Count}`
          )
        }

        // The wrong title should be downgraded to H2
        if (!result.content.includes('## Wrong Title From Content')) {
          throw new Error('Wrong title from content should be downgraded to H2')
        }
      })
    })
  })

  describe('Given post content with case differences in title', () => {
    const postDataWithCaseDifference = {
      title: 'My Amazing Blog Post',
      content: `
        <h1>my amazing blog post</h1>
        <p>Same title but different case.</p>
      `,
      author: 'Test Author',
    }

    describe('When I convert the post', () => {
      let result

      beforeEach(async () => {
        result = await converter.convertPost(postDataWithCaseDifference)
      })

      it('Then it should recognize the title match despite case differences', () => {
        if (!result.success) {
          throw new Error('Expected conversion to succeed')
        }

        // Should not duplicate the title since it's the same (case insensitive)
        const h1Count = (result.content.match(/^# /gm) || []).length
        if (h1Count !== 1) {
          throw new Error(`Expected exactly 1 H1, found ${h1Count}`)
        }
      })
    })
  })
})
