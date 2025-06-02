# Medium Scraper Project Setup

## Quick Setup Commands

Run these commands to set up the project structure:

```bash
# Create project directory
mkdir medium-scraper && cd medium-scraper

# Create directory structure
mkdir -p features src test/acceptance test/unit output/posts output/images

# Create configuration files (content below)
touch package.json jest.config.js .eslintrc.js .prettierrc.js CLAUDE.md

# Create feature file
touch features/medium-scraper.feature
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

### 3. .eslintrc.js

```javascript
export default {
  env: {
    es2022: true,
    node: true,
    jest: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error',
  },
}
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

## Installation & Verification

```bash
# Install dependencies
npm install

# Init husky
echo 'npx lint-staged && npm run quality:check && npm test' > .husky/pre-commit

# Verify Jest works
npm test

# Verify ESLint works
npm run lint

# Verify Prettier works
npm run format:check

# Verify quality pipeline works
npm run quality:check
```

## Final Project Structure

After setup, your directory should look like:

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
├── node_modules/
├── CLAUDE.md
├── package.json
├── jest.config.js
├── .eslintrc.js
├── .prettierrc.js
└── package-lock.json
```

## Ready for Claude Code

Once setup is complete, Claude Code can begin implementation following the ATDD workflow defined in CLAUDE.md.
