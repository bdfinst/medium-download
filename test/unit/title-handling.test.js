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
        expect(result.success).toBe(true)

        // Count H1 occurrences in the content
        const h1Count = (result.content.match(/^# /gm) || []).length
        expect(h1Count).toBe(1)

        // Should not have duplicate title
        expect(result.content).not.toContain(
          '# My Amazing Blog Post\n\n## My Amazing Blog Post'
        )
      })

      it('And the title should remain as H1', () => {
        expect(result.content).toMatch(/^# My Amazing Blog Post/)
      })

      it('And original H2 should become H3', () => {
        expect(result.content).toContain('### Section Header')
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
        expect(result.success).toBe(true)
        expect(result.content).toMatch(/^# My Other Blog Post/)
      })

      it('And should have exactly one H1', () => {
        const h1Count = (result.content.match(/^# /gm) || []).length
        expect(h1Count).toBe(1)
      })

      it('And original headers should be properly downgraded', () => {
        expect(result.content).toContain('### First Section')
        expect(result.content).toContain('#### Subsection')
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
        expect(result.success).toBe(true)
        expect(result.content).toMatch(/^# Correct Title From Metadata/)
      })

      it('And should have two H1s (correct title + downgraded wrong title)', () => {
        // The correct title as H1, plus the wrong title downgraded to H2
        const h1Count = (result.content.match(/^# /gm) || []).length
        expect(h1Count).toBe(1)

        // The wrong title should be downgraded to H2
        expect(result.content).toContain('## Wrong Title From Content')
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
        expect(result.success).toBe(true)

        // Should not duplicate the title since it's the same (case insensitive)
        const h1Count = (result.content.match(/^# /gm) || []).length
        expect(h1Count).toBe(1)
      })
    })
  })
})
