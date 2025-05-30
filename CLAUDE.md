# Medium Blog Scraper

Build a Node.js application that scrapes all published blog posts from a user's Medium profile and downloads them as markdown files with frontmatter metadata.

## Setup Instructions

**CRITICAL**: Before starting implementation, follow the complete project setup process outlined in the setup guide below. Do not proceed with any coding until the project structure and configuration files are properly established.

### Required Project Structure and Configuration

Create the following project structure and configuration files exactly as specified:

1. **Project Directory Structure**:

```
medium-scraper/
├── features/
│   └── medium-scraper.feature      # Gherkin specifications (reference only)
├── src/                           # Application code (you will create)
├── test/
│   ├── acceptance/                # Jest acceptance tests (you will create)
│   └── unit/                     # Jest unit tests (you will create)
├── output/
│   ├── posts/
│   └── images/
├── CLAUDE.md                     # This file
├── package.json                  # Configuration below
├── jest.config.js               # Configuration below
├── .eslintrc.js                 # Configuration below
└── .prettierrc.js               # Configuration below
```

2. **Create package.json with these exact scripts and dependencies**:

```json
{
  "name": "medium-scraper",
  "version": "1.0.0",
  "type": "module",
  "description": "Scrape Medium blog posts to markdown with frontmatter",
  "main": "src/main.js",
  "scripts": {
    "start": "node src/main.js",
    "test": "jest",
    "test:acceptance": "jest test/acceptance",
    "test:unit": "jest test/unit", 
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/ test/ --ext .js",
    "lint:fix": "eslint src/ test/ --ext .js --fix",
    "format": "prettier --write src/ test/ features/ *.js *.json *.md",
    "format:check": "prettier --check src/ test/ features/ *.js *.json *.md",
    "quality": "npm run lint:fix && npm run format",
    "quality:check": "npm run lint && npm run format:check"
  },
  "dependencies": {
    "puppeteer": "^latest",
    "googleapis": "^latest",
    "turndown": "^latest",
    "gray-matter": "^latest"
  },
  "devDependencies": {
    "jest": "^latest",
    "eslint": "^latest",
    "prettier": "^latest",
    "eslint-config-prettier": "^latest",
    "eslint-plugin-import": "^latest"
  }
}
```

3. **Create jest.config.js**:

```javascript
export default {
  preset: 'jest-environment-node',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js

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
Core packages required (see SETUP.md for specific versions):
- `puppeteer` or `@playwright/test` for browser automation
- `googleapis` for Google OAuth
- `turndown` for HTML to markdown conversion
- `gray-matter` for frontmatter handling
- `jest` for testing framework with BDD assertions
- `eslint` and `prettier` for code quality

## Expected Deliverables

### File Structure
Expected structure after setup (see SETUP.md for detailed creation instructions):
```

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
├── CLAUDE.md                      # This file
├── SETUP.md                       # Setup instructions
└── [config files from SETUP.md]   # All .js, .json config files

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
title: "Post Title"
subtitle: "Post Subtitle"
date: "2024-01-15T10:30:00Z"
lastModified: "2024-01-16T14:22:00Z"
author: "Author Name"
tags: ["tag1", "tag2", "tag3"]
readingTime: "5 min read"
mediumUrl: "https://medium.com/@user/post-title-123abc"
featuredImage: "./images/featured-image.jpg"
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

Create the following test infrastructure:

### Package.json Scripts

Key scripts available after setup (full configuration in SETUP.md):

```bash
npm test              # Run all Jest tests
npm run test:acceptance   # Run acceptance tests only
npm run quality       # Fix linting and formatting issues
npm run quality:check # Verify code quality without changes
```

### Jest Configuration

Create `jest.config.js`:

```javascript
export default {
  preset: 'jest-environment-node',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js

### Code Quality Configuration

Create `.eslintrc.js`:
```javascript
export default {
  env: {
    es2022: true,
    node: true,
    mocha: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error'
  }
};
```

Create `.prettierrc.js`:

```javascript
export default {
  semi: false,              // NO SEMICOLONS
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 80,
  arrowParens: 'avoid',
  endOfLine: 'lf'
};
```

### Step Definition Structure

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

**NO EXCEPTIONS**: Code that doesn't pass quality checks cannot proceed to the next scenario.: '$1'
  },
  transform: {},
  testMatch: [
    '**/test/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};

```

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
        expect(browserLauncher).toHaveBeenCalledWith(expect.stringContaining('oauth'))
      })
      
      it('should redirect to Google OAuth consent screen', async () => {
        // Test implementation
        expect(response.url).toContain('accounts.google.com')
      })
      
      it('should store auth tokens securely after granting permission', async () => {
        // Test implementation
        expect(tokenStorage.save).toHaveBeenCalledWith(expect.objectContaining({
          access_token: expect.any(String),
          refresh_token: expect.any(String)
        }))
      })
    })
  })
})
```

### Code Quality Configuration

Create `.eslintrc.js`:

```javascript
export default {
  env: {
    es2022: true,
    node: true,
    mocha: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error'
  }
};
```

Create `.prettierrc.js`:

```javascript
export default {
  semi: false,              // NO SEMICOLONS
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 80,
  arrowParens: 'avoid',
  endOfLine: 'lf'
};
```

### Step Definition Structure

In `test/acceptance/`, create step definition files that mirror the feature scenarios:

- `auth-steps.js` - Authentication scenario steps
- `scraper-steps.js` - Content discovery and processing steps  
- `cli-steps.js` - Command line interface steps
- `error-steps.js` - Error handling steps

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
# Run the specific scenario
npm run test:acceptance -- --grep "scenario name"

# MANDATORY: Run code quality checks after test passes
npm run quality

# Run related scenarios to ensure no regression
npm run test:acceptance -- --grep "Authentication"

# Run all tests and quality checks before moving to next phase
npm run test && npm run quality:check
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

**NO EXCEPTIONS**: Code that doesn't pass quality checks cannot proceed to the next scenario.: '$1'
  },
  transform: {},
  testMatch: [
    '**/test/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};

```

4. **Create .eslintrc.js**:
```javascript
export default {
  env: {
    es2022: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error'
  }
};
```

5. **Create .prettierrc.js**:

```javascript
export default {
  semi: false,              // NO SEMICOLONS (mandatory)
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 80,
  arrowParens: 'avoid',
  endOfLine: 'lf'
};
```

6. **Run setup commands**:

```bash
npm install
```

## Setup Instructions

**CRITICAL**: Before starting any implementation, you must complete the project setup process.

**STEP 1: Follow the complete setup guide in `SETUP.md`** - This file contains all required configuration files, directory structure, and installation commands.

**STEP 2: Verify setup is complete** by running:

```bash
npm test          # Should show "No tests found" but Jest should run
npm run quality   # Should complete without errors
```

**STEP 3: Only after setup verification passes**, proceed with the development workflow below.

Do not create any application code until the project structure and all configuration files are properly established per the setup guide.

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

Minimal external dependencies. Suggested core packages:

- `puppeteer` or `@playwright/test` for browser automation
- `googleapis` for Google OAuth
- `turndown` for HTML to markdown conversion
- `gray-matter` for frontmatter handling
- `node-fetch` for HTTP requests (if needed)
- `jest` for testing framework with BDD assertions
- `eslint` for code linting
- `prettier` for code formatting
- `eslint-config-prettier` to avoid conflicts between ESLint and Prettier
- `eslint-plugin-import` for ES module linting

## Expected Deliverables

### File Structure

```
medium-scraper/
├── features/
│   └── medium-scraper.feature      # Gherkin specifications (reference only)
├── src/
│   ├── auth.js
│   ├── scraper.js
│   ├── converter.js
│   ├── storage.js
│   ├── config.js
│   ├── logger.js
│   └── main.js
├── test/
│   ├── acceptance/                 # Jest acceptance tests (BDD style)
│   │   ├── auth.test.js
│   │   ├── scraper.test.js
│   │   ├── converter.test.js
│   │   └── cli.test.js
│   └── unit/                      # Jest unit tests
├── output/
│   ├── posts/
│   ├── images/
│   └── metadata.json
├── CLAUDE.md                      # This file
├── .eslintrc.js                   # ESLint configuration
├── .prettierrc.js                 # Prettier configuration
├── jest.config.js                 # Jest configuration
├── config.json
├── package.json
└── README.md
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
title: "Post Title"
subtitle: "Post Subtitle"
date: "2024-01-15T10:30:00Z"
lastModified: "2024-01-16T14:22:00Z"
author: "Author Name"
tags: ["tag1", "tag2", "tag3"]
readingTime: "5 min read"
mediumUrl: "https://medium.com/@user/post-title-123abc"
featuredImage: "./images/featured-image.jpg"
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

Create the following test infrastructure:

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:acceptance": "jest test/acceptance",
    "test:unit": "jest test/unit",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/ test/ --ext .js",
    "lint:fix": "eslint src/ test/ --ext .js --fix",
    "format": "prettier --write src/ test/ features/ *.js *.json *.md",
    "format:check": "prettier --check src/ test/ features/ *.js *.json *.md",
    "quality": "npm run lint:fix && npm run format",
    "quality:check": "npm run lint && npm run format:check"
  }
}
```

### Jest Configuration

Create `jest.config.js`:

```javascript
export default {
  preset: 'jest-environment-node',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js

### Code Quality Configuration

Create `.eslintrc.js`:
```javascript
export default {
  env: {
    es2022: true,
    node: true,
    mocha: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error'
  }
};
```

Create `.prettierrc.js`:

```javascript
export default {
  semi: false,              // NO SEMICOLONS
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 80,
  arrowParens: 'avoid',
  endOfLine: 'lf'
};
```

### Step Definition Structure

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

**NO EXCEPTIONS**: Code that doesn't pass quality checks cannot proceed to the next scenario.: '$1'
  },
  transform: {},
  testMatch: [
    '**/test/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};

```

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
        expect(browserLauncher).toHaveBeenCalledWith(expect.stringContaining('oauth'))
      })
      
      it('should redirect to Google OAuth consent screen', async () => {
        // Test implementation
        expect(response.url).toContain('accounts.google.com')
      })
      
      it('should store auth tokens securely after granting permission', async () => {
        // Test implementation
        expect(tokenStorage.save).toHaveBeenCalledWith(expect.objectContaining({
          access_token: expect.any(String),
          refresh_token: expect.any(String)
        }))
      })
    })
  })
})
```

### Code Quality Configuration

Create `.eslintrc.js`:

```javascript
export default {
  env: {
    es2022: true,
    node: true,
    mocha: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error'
  }
};
```

Create `.prettierrc.js`:

```javascript
export default {
  semi: false,              // NO SEMICOLONS
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 80,
  arrowParens: 'avoid',
  endOfLine: 'lf'
};
```

### Step Definition Structure

In `test/acceptance/`, create step definition files that mirror the feature scenarios:

- `auth-steps.js` - Authentication scenario steps
- `scraper-steps.js` - Content discovery and processing steps  
- `cli-steps.js` - Command line interface steps
- `error-steps.js` - Error handling steps

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
# Run the specific scenario
npm run test:acceptance -- --grep "scenario name"

# MANDATORY: Run code quality checks after test passes
npm run quality

# Run related scenarios to ensure no regression
npm run test:acceptance -- --grep "Authentication"

# Run all tests and quality checks before moving to next phase
npm run test && npm run quality:check
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
