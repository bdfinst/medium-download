// Shared utility functions for error handling and common patterns
import { URL } from 'url'

// Functional error handling wrapper
export const withErrorHandling =
  fn =>
  async (...args) => {
    try {
      const result = await fn(...args)
      return { success: true, ...result }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

// URL validation utilities
export const urlValidator = {
  isValidMediumProfile: url => {
    try {
      const urlObj = new URL(url)
      return (
        (urlObj.hostname === 'medium.com' &&
          urlObj.pathname.startsWith('/@')) ||
        (urlObj.hostname.endsWith('.medium.com') && urlObj.pathname === '/')
      )
    } catch {
      return false
    }
  },

  normalizeProfileUrl: url => {
    try {
      const urlObj = new URL(url)

      // Handle username.medium.com format - extract username and convert to medium.com/@username
      if (
        urlObj.hostname.endsWith('.medium.com') &&
        urlObj.hostname !== 'medium.com'
      ) {
        const username = urlObj.hostname.split('.')[0]
        return `https://medium.com/@${username}`
      }

      // Return original URL if already in medium.com/@username format
      if (
        urlObj.hostname === 'medium.com' &&
        urlObj.pathname.startsWith('/@')
      ) {
        return url
      }

      return null
    } catch {
      return null
    }
  },

  extractUsername: url => {
    try {
      const urlObj = new URL(url)

      // Handle username.medium.com format
      if (
        urlObj.hostname.endsWith('.medium.com') &&
        urlObj.hostname !== 'medium.com'
      ) {
        return `@${urlObj.hostname.split('.')[0]}`
      }

      // Handle medium.com/@username format
      const pathParts = urlObj.pathname.split('/')
      if (pathParts.length >= 2 && pathParts[1].startsWith('@')) {
        return pathParts[1] // includes @
      }

      return null
    } catch {
      return null
    }
  },
}

// Logger utility
export const logger = {
  info: message => console.log(`ℹ️  ${message}`),
  success: message => console.log(`✅ ${message}`),
  warn: message => console.warn(`⚠️  ${message}`),
  error: message => console.error(`❌ ${message}`),
  progress: (current, total, message) => {
    const percentage = Math.round((current / total) * 100)
    console.log(`📊 [${current}/${total}] ${percentage}% - ${message}`)
  },
}
