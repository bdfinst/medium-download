# Medium Blog Scraper

Build a Node.js application that scrapes all published blog posts from a user's Medium profile and downloads them as markdown files with frontmatter metadata.

## Setup Instructions

**CRITICAL**: Before starting implementation, follow the complete project setup process outlined in SETUP.md

## 🚨 MANDATORY WORKFLOW - NO EXCEPTIONS 🚨

**CRITICAL**: After EVERY single code change, you MUST run both test and quality scripts. This is NON-NEGOTIABLE.

### Required Commands After Every Change

```bash
# 1. ALWAYS run tests first - NO EXCEPTIONS
npm test

# 2. ALWAYS run quality checks - NO EXCEPTIONS
npm run quality:check

# 3. If quality check fails, fix with:
npm run quality
```

### Workflow Enforcement Rules

1. **NEVER proceed to the next task** until both `npm test` and `npm run quality:check` pass
2. **NEVER commit code** that doesn't pass both test and quality checks
3. **NEVER skip this workflow** - even for "small changes" or "quick fixes"
4. **ALWAYS run the full test suite** - no selective testing
5. **ALWAYS verify quality standards** - no exceptions for any file type

### Quality Gates - ALL Must Pass

- ✅ **All tests pass**: `npm test` returns success
- ✅ **No linting errors**: ESLint finds no issues
- ✅ **Proper formatting**: Prettier formatting is applied
- ✅ **No console warnings**: All console usage is intentional
- ✅ **Functional patterns**: Code follows functional programming constraints

### Failure Response Protocol

If ANY quality gate fails:

1. **STOP** all other work immediately
2. **FIX** the failing quality check first
3. **RE-RUN** both test and quality scripts
4. **ONLY THEN** proceed with next task

## Development Approach

**IMPORTANT**: This project uses Acceptance Test Driven Development (ATDD) with Jest and BDD-style assertions. Before implementing any feature:

1. **Read the feature specifications** in `features/medium-scraper.feature`
2. **Write Jest acceptance tests** that describe the expected behavior in BDD style
3. **Implement features to satisfy the acceptance tests**
4. **Validate each test passes** before moving to the next
5. **Reference the feature file continuously** during development to ensure requirements are met

The feature file contains comprehensive Gherkin scenarios that define the expected behavior. Translate these into Jest BDD tests as executable specifications.

## Project Overview

This tool solves the problem of exporting Medium blog posts when:

- Medium doesn't provide a comprehensive API
- RSS feeds only show the last 20 posts
- Chrome plugins aren't suitable
- Authentication through Google SSO is required

**All development must satisfy the acceptance criteria defined in the feature file.**

## Core Requirements

### Authentication

- Implement Google OAuth 2.0 authentication to handle Medium's SSO requirement
- Use Google's OAuth client library for Node.js
- Store and manage authentication tokens securely
- Handle token refresh automatically

### Web Scraping

- Use Puppeteer or Playwright for browser automation to handle JavaScript-rendered content
- Navigate to user's Medium profile page while authenticated
- Discover all published posts by pagination or infinite scroll handling
- Extract full article content, metadata, and images
- Handle Medium's dynamic loading and anti-bot measures

### Content Processing

- Convert Medium's HTML content to clean markdown format
- Extract and preserve:
  - Article title, subtitle, and content
  - Publication date and last modified date
  - Tags and categories
  - Author information
  - Featured image and inline images
  - Reading time estimates
- Generate frontmatter in YAML format with all metadata
- Handle code blocks, embeds, and special Medium formatting

### File Management

- Create organized directory structure for downloaded posts
- Name files using URL slug or title-based naming
- Download and organize associated images locally
- Update image references in markdown to local paths
- Handle duplicate posts and incremental updates

## Technical Constraints

### Code Style Requirements

- **MANDATORY**: Use vanilla JavaScript with ES modules (import/export)
- **MANDATORY**: Implement functional programming patterns throughout
- **MANDATORY**: Use arrow functions exclusively for function definitions
- **MANDATORY**: Avoid classes - use factory functions and closures instead
- Implement pure functions where possible
- Use composition over inheritance

### Architecture

Modular design with separate files for different concerns:

- `src/auth.js` - Google OAuth handling
- `src/scraper.js` - Medium content extraction
- `src/converter.js` - HTML to markdown conversion
- `src/storage.js` - File system operations
- `src/config.js` - Configuration management
- `src/logger.js` - Logging utilities
- `src/main.js` - Application orchestration

Use dependency injection patterns and implement proper error handling with functional error types.

### Dependencies

Core packages required:

- `puppeteer` for browser automation
- `googleapis` for Google OAuth
- `turndown` for HTML to markdown conversion
- `gray-matter` for frontmatter handling
- `jest` for testing framework with BDD assertions
- `eslint` and `prettier` for code quality

## Expected Deliverables

### File Structure

```bash
medium-scraper/
├── features/
│   └── medium-scraper.feature      # Gherkin specifications (reference only)
├── src/                           # Application code (you will create)
│   ├── auth.js
│   ├── scraper.js
│   ├── converter.js
│   ├── storage.js
│   ├── config.js
│   ├── logger.js
│   └── main.js
├── test/
│   ├── acceptance/                # Jest acceptance tests (you will create)
│   └── unit/                     # Jest unit tests (you will create)
├── output/
│   ├── posts/
│   ├── images/
│   └── metadata.json
├── CLAUDE.md                     # This file
└── [config files from above]    # All .js, .json config files
```

### CLI Interface

- Interactive prompts for configuration
- Progress indicators for scraping operations
- Commands: `scrape`, `auth`, `config`, `resume`, `validate`, `clean`
- Verbose/quiet mode options
- Resume capability for interrupted operations

### Sample Output Format

Each markdown file should have YAML frontmatter:

```yaml
---
title: 'Post Title'
subtitle: 'Post Subtitle'
date: '2024-01-15T10:30:00Z'
lastModified: '2024-01-16T14:22:00Z'
author: 'Author Name'
tags: ['tag1', 'tag2', 'tag3']
readingTime: '5 min read'
mediumUrl: 'https://medium.com/@user/post-title-123abc'
featuredImage: './images/featured-image.jpg'
published: true
---
# Post Title

Post content in clean markdown...
```

## Implementation Process - ATDD Workflow

Follow this Acceptance Test Driven Development workflow with integrated code quality:

### 1. Scenario Analysis

For each feature in `features/medium-scraper.feature`:

- Read and understand the Gherkin scenario
- Identify the Given/When/Then acceptance criteria
- Note any data tables or example values
- Understand the expected behavior completely

### 2. Test-First Implementation

- **Translate Gherkin scenarios to Jest BDD tests** in `test/acceptance/`
- Write descriptive `describe()` and `it()` blocks that mirror the Given/When/Then structure
- Use Jest's built-in BDD assertions (expect().toBe(), expect().toHaveBeenCalled(), etc.)
- Run the acceptance test (it should fail initially)
- Implement just enough application code to make the test pass
- **After test passes, run code quality checks and fix any issues**:

  ```bash
  npm run lint:fix     # Run ESLint and auto-fix issues
  npm run format       # Run Prettier to format code
  npm run quality      # Run both linting and formatting
  ```

- Refactor while keeping tests green and code quality high

### 3. Validation

- Ensure each Jest test passes completely before moving on
- **Verify code passes ESLint and Prettier checks**
- Verify edge cases mentioned in the feature scenarios
- Confirm the implementation matches the expected behavior exactly

### Example Workflow

```bash
# 1. Read Gherkin scenario "Initial Google OAuth Authentication"
# 2. Write Jest BDD test in test/acceptance/auth.test.js
# 3. Run specific test to see it fail
npm test -- --testNamePattern="Initial Google OAuth Authentication"

# 4. Implement auth.js functionality to satisfy the test

# 5. Run test again to see it pass
npm test -- --testNamePattern="Initial Google OAuth Authentication"

# 6. CRITICAL: Run code quality checks and fix any issues
npm run quality

# 7. Move to next scenario only after code quality is validated
npm test -- --testNamePattern="Discover All Published Posts"
```

**IMPORTANT**: After every passing test, you MUST run `npm run quality` to ensure code follows the style guidelines before proceeding to the next scenario.

## Key Features to Implement (Based on Feature File)

Implement these in order, ensuring each scenario passes before proceeding:

### Phase 1: Authentication Scenarios

- [ ] "Initial Google OAuth Authentication"
- [ ] "Handle Authentication Persistence"
- [ ] Token refresh and re-authentication flows

### Phase 2: Content Discovery Scenarios

- [ ] "Discover All Published Posts"
- [ ] Handle pagination and infinite scroll
- [ ] "Resume Interrupted Operations"

### Phase 3: Content Processing Scenarios

- [ ] "Extract Post Content and Metadata"
- [ ] "Convert HTML to Markdown"
- [ ] "Generate Frontmatter Metadata"
- [ ] "Download and Organize Images"

### Phase 4: Advanced Scenarios

- [ ] "Error Handling and Recovery"
- [ ] "Incremental Updates"
- [ ] "Configuration and Customization"
- [ ] "Progress Reporting and Logging"
- [ ] "Validation and Quality Assurance"
- [ ] "Command Line Interface"

## Success Criteria

The application should satisfy ALL scenarios in `features/medium-scraper.feature`:

1. **Authentication scenarios** - OAuth flow, token persistence, refresh handling
2. **Content discovery scenarios** - Profile navigation, post discovery, pagination
3. **Content processing scenarios** - HTML conversion, frontmatter generation, image handling
4. **Operational scenarios** - Error handling, progress reporting, resume capability
5. **Quality scenarios** - Validation, configuration, CLI interface

**Each scenario must pass its acceptance criteria before the feature is considered complete.**

## Acceptance Test Setup

### BDD Test Structure Example

```javascript
// test/acceptance/auth.test.js
describe('Google OAuth Authentication', () => {
  describe('Given I run the scraper for the first time', () => {
    describe('When I execute the authentication command', () => {
      it('should prompt me to authorize with Google', async () => {
        // Test implementation
        expect(authPrompt).toHaveBeenCalled()
      })

      it('should open my default browser', async () => {
        // Test implementation
        expect(browserLauncher).toHaveBeenCalledWith(
          expect.stringContaining('oauth')
        )
      })

      it('should redirect to Google OAuth consent screen', async () => {
        // Test implementation
        expect(response.url).toContain('accounts.google.com')
      })

      it('should store auth tokens securely after granting permission', async () => {
        // Test implementation
        expect(tokenStorage.save).toHaveBeenCalledWith(
          expect.objectContaining({
            access_token: expect.any(String),
            refresh_token: expect.any(String),
          })
        )
      })
    })
  })
})
```

### Jest Test Files Structure

In `test/acceptance/`, create Jest BDD test files that mirror the feature scenarios:

- `auth.test.js` - Authentication scenario tests
- `scraper.test.js` - Content discovery and processing tests
- `cli.test.js` - Command line interface tests
- `error.test.js` - Error handling tests

Each test file should follow BDD structure:

```javascript
describe('Feature: Authentication', () => {
  describe('Scenario: Initial Google OAuth Authentication', () => {
    describe('Given I run the scraper for the first time', () => {
      // Setup code
    })

    describe('When I execute the authentication command', () => {
      // Action code
    })

    it('Then I should be prompted to authorize with Google', () => {
      // Assertion code
    })
  })
})
```

## Implementation Priority

**CRITICAL**: Follow ATDD methodology strictly:

1. **Start by reading** `features/medium-scraper.feature` completely
2. **Implement scenarios in order** as listed in the feature file
3. **Do not proceed** to the next scenario until the current one passes
4. **Reference the feature file continuously** during implementation
5. **Validate behavior** matches the Gherkin scenarios exactly

Implementation order (based on feature file scenario order):

1. Authentication flow scenarios
2. Content discovery scenarios
3. Content processing scenarios
4. Error handling scenarios
5. Advanced operational scenarios

## Quality Requirements

All implementation must:

- **Satisfy the acceptance criteria** in the feature file scenarios
- Use functional programming patterns exclusively
- Include comprehensive error handling
- Provide clear progress feedback as specified in scenarios
- Handle all edge cases mentioned in the feature scenarios
- Pass both unit and acceptance tests

## Continuous Validation

After implementing each scenario:

```bash
# Run specific test by name pattern
npm test -- --testNamePattern="Initial Google OAuth Authentication"

# MANDATORY: Run code quality checks after test passes
npm run quality

# Run related tests to ensure no regression
npm test -- --testPathPattern="auth"

# Run all tests and quality checks before moving to next phase
npm test && npm run quality:check
```

## Code Quality Standards

All code must adhere to these standards enforced by ESLint and Prettier:

### Style Requirements

- **NO SEMICOLONS** (enforced by Prettier configuration)
- Single quotes for strings
- Arrow functions exclusively
- 2-space indentation
- 80-character line limit
- Trailing commas in ES5 contexts

### Code Quality Rules

- No unused variables
- Prefer const over let
- No var declarations
- Consistent arrow function spacing
- No duplicate imports
- Functional programming patterns

### Quality Gates

Every scenario implementation must pass:

1. ✅ Acceptance test passes
2. ✅ ESLint passes with no errors/warnings
3. ✅ Prettier formatting is applied
4. ✅ Code follows functional programming constraints

**NO EXCEPTIONS**: Code that doesn't pass quality checks cannot proceed to the next scenario.
