# Medium Scraper Project Setup

## Quick Setup Commands

Run these commands to set up the project structure:

```bash
# Create project directory
mkdir medium-scraper && cd medium-scraper

# Create directory structure
mkdir -p features src test/acceptance test/unit output/posts output/images

# Create configuration files
touch package.json jest.config.js eslint.config.js .prettierrc.js CLAUDE.md features/medium-scraper.feature

# Install dependencies (after creating package.json below)
npm install

# Setup git hooks
npx husky init
echo 'npx lint-staged && npm run quality:check && npm test' > .husky/pre-commit
```

## Required Configuration Files

### 1. package.json

```json
{
  "name": "medium-scraper",
  "version": "1.0.0",
  "type": "module",
  "description": "Scrape Medium blog posts to markdown with frontmatter",
  "main": "src/main.js",
  "scripts": {
    "start": "node src/main.js",
    "test": "node --experimental-vm-modules node_modules/.bin/jest --passWithNoTests",
    "test:acceptance": "npm test test/acceptance",
    "test:unit": "npm test test/unit",
    "test:watch": "npm test -- --watch",
    "test:coverage": "npm test -- --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write src/ test/ features/ *.js *.json *.md",
    "format:check": "prettier --check src/ test/ features/ *.js *.json *.md",
    "quality": "npm run lint:fix && npm run format",
    "quality:check": "npm run lint && npm run format:check"
  },
  "lint-staged": {
    "*.js": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  },
  "dependencies": {
    "dotenv": "^16.5.0",
    "googleapis": "^144.0.0",
    "gray-matter": "^4.0.3",
    "node-fetch": "^3.3.2",
    "open": "^10.1.2",
    "puppeteer": "^23.0.0",
    "turndown": "^7.2.0",
    "turndown-plugin-gfm": "^1.0.2"
  },
  "devDependencies": {
    "@eslint/js": "^9.27.0",
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-import": "^2.29.0",
    "husky": "^9.1.7",
    "jest": "^29.7.0",
    "lint-staged": "^15.5.2",
    "prettier": "^3.3.0"
  }
}
```

### 2. jest.config.js

```javascript
export default {
  preset: 'jest-environment-node',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {},
  testMatch: ['**/test/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
}
```

### 3. eslint.config.js

```javascript
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'

export default [
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-vars': 'error',
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
  },
]
```

### 4. .prettierrc.js

```javascript
export default {
  semi: false, // NO SEMICOLONS
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 80,
  arrowParens: 'avoid',
  endOfLine: 'lf',
}
```

## Verification & Final Steps

```bash
# Verify Jest works
npm test

# Verify linting and formatting
npm run quality:check

# Final project structure verification
tree -I 'node_modules|coverage' .
```

## Expected Final Structure

```
medium-scraper/
├── features/
│   └── medium-scraper.feature
├── src/                          # (Claude Code will create)
├── test/
│   ├── acceptance/              # (Claude Code will create)
│   └── unit/                    # (Claude Code will create)
├── output/
│   ├── posts/
│   └── images/
├── .husky/
│   └── pre-commit
├── node_modules/
├── CLAUDE.md
├── package.json
├── jest.config.js
├── eslint.config.js
├── .prettierrc.js
└── package-lock.json
```

## Ready for Development

Once setup is complete, Claude Code can begin implementation following the ATDD workflow defined in CLAUDE.md.
