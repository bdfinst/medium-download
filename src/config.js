// Configuration management for Medium scraper
import { promises as fs, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { withErrorHandling } from './utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Default configuration
const defaultConfig = {
  outputDirectory: path.join(__dirname, '..', 'output'),
  namingScheme: 'slug', // 'slug' | 'title' | 'date-slug'
  includeImages: true,
  dateFilter: null, // { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
  tagFilter: [], // ['tag1', 'tag2'] - only posts with these tags
  concurrency: 3, // Number of simultaneous downloads
  retryAttempts: 3,
  requestDelay: 2000, // Delay between requests in ms
  maxScrollAttempts: 20,
  verbose: false,
  resumeEnabled: true,
  validateResults: true,
}

// Configuration file path
const getConfigPath = () => path.join(__dirname, '..', 'scraper-config.json')

// Load configuration from file or return defaults
export const loadConfig = withErrorHandling(async () => {
  const configPath = getConfigPath()

  if (!existsSync(configPath)) {
    return { ...defaultConfig }
  }

  const configData = await fs.readFile(configPath, 'utf8')
  const userConfig = JSON.parse(configData)

  // Merge with defaults to ensure all required fields exist
  return {
    ...defaultConfig,
    ...userConfig,
  }
})

// Save configuration to file
export const saveConfig = withErrorHandling(async config => {
  const configPath = getConfigPath()
  const configData = JSON.stringify(config, null, 2)

  await fs.writeFile(configPath, configData, 'utf8')

  return { configPath }
})

// Validate configuration values
export const validateConfig = config => {
  const errors = []

  // Validate output directory
  if (!config.outputDirectory || typeof config.outputDirectory !== 'string') {
    errors.push('outputDirectory must be a valid string path')
  }

  // Validate naming scheme
  const validNamingSchemes = ['slug', 'title', 'date-slug']
  if (!validNamingSchemes.includes(config.namingScheme)) {
    errors.push(`namingScheme must be one of: ${validNamingSchemes.join(', ')}`)
  }

  // Validate concurrency
  if (
    typeof config.concurrency !== 'number' ||
    config.concurrency < 1 ||
    config.concurrency > 10
  ) {
    errors.push('concurrency must be a number between 1 and 10')
  }

  // Validate retry attempts
  if (
    typeof config.retryAttempts !== 'number' ||
    config.retryAttempts < 0 ||
    config.retryAttempts > 10
  ) {
    errors.push('retryAttempts must be a number between 0 and 10')
  }

  // Validate date filter format
  if (config.dateFilter) {
    if (!config.dateFilter.from && !config.dateFilter.to) {
      errors.push('dateFilter must have at least from or to date')
    }

    if (
      config.dateFilter.from &&
      !/^\d{4}-\d{2}-\d{2}$/.test(config.dateFilter.from)
    ) {
      errors.push('dateFilter.from must be in YYYY-MM-DD format')
    }

    if (
      config.dateFilter.to &&
      !/^\d{4}-\d{2}-\d{2}$/.test(config.dateFilter.to)
    ) {
      errors.push('dateFilter.to must be in YYYY-MM-DD format')
    }
  }

  // Validate tag filter
  if (config.tagFilter && !Array.isArray(config.tagFilter)) {
    errors.push('tagFilter must be an array of strings')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Get current configuration (cached)
let cachedConfig = null

export const getCurrentConfig = async () => {
  if (!cachedConfig) {
    const result = await loadConfig()
    if (result.success) {
      cachedConfig = result
    } else {
      // Fallback to defaults if config loading fails
      cachedConfig = { ...defaultConfig }
    }
  }
  return cachedConfig
}

// Update configuration and save
export const updateConfig = withErrorHandling(async updates => {
  const currentConfig = await getCurrentConfig()
  const newConfig = { ...currentConfig, ...updates }

  const validation = validateConfig(newConfig)
  if (!validation.isValid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`)
  }

  const saveResult = await saveConfig(newConfig)
  if (!saveResult.success) {
    throw new Error(saveResult.error)
  }

  // Update cache
  cachedConfig = newConfig

  return {
    config: newConfig,
    configPath: saveResult.configPath,
  }
})

// Create default config file
export const createDefaultConfig = withErrorHandling(async () => {
  const configPath = getConfigPath()

  if (existsSync(configPath)) {
    throw new Error('Configuration file already exists')
  }

  const result = await saveConfig(defaultConfig)
  return result
})

// Reset configuration to defaults
export const resetConfig = withErrorHandling(async () => {
  const result = await saveConfig(defaultConfig)
  cachedConfig = { ...defaultConfig }
  return result
})

// Configuration management factory for dependency injection
export const createConfigService = (dependencies = {}) => {
  const configPath = dependencies.configPath || getConfigPath()

  return {
    loadConfig,
    saveConfig,
    validateConfig,
    getCurrentConfig,
    updateConfig,
    createDefaultConfig,
    resetConfig,
    getConfigPath: () => configPath,
  }
}

export default createConfigService
