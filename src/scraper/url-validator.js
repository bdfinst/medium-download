// URL validation logic extracted from scraper for better testability and reuse
import { pipe, Result } from '../utils/functional.js'

// Pure functions for URL validation rules
const isNotEmpty = url => Boolean(url)

const cleanUrl = url => url.split('?')[0].split('#')[0]

const isNotHomepage = url => {
  const clean = cleanUrl(url)
  return !(
    clean.match(/^https?:\/\/[^/]+\.medium\.com\/?$/) ||
    clean.match(/^https?:\/\/medium\.com\/@[^/]+\/?$/)
  )
}

const hasValidProfilePostPath = url => {
  if (!url.includes('/@')) return true

  const pathParts = cleanUrl(url).split('/')
  return pathParts.length >= 5 && pathParts[4] && pathParts[4].length > 0
}

const hasValidSubdomainPostPath = url => {
  if (!url.includes('.medium.com')) return true

  const clean = cleanUrl(url)
  const pathParts = clean.split('/')

  return (
    pathParts.length > 3 &&
    !clean.endsWith('.medium.com/') &&
    !clean.endsWith('.medium.com') &&
    pathParts[3] !== '' &&
    pathParts[3].length > 8 // Post slugs are typically longer
  )
}

const hasValidPublicationPostPath = url => {
  if (
    !url.includes('medium.com/') ||
    url.includes('medium.com/@') ||
    url.includes('medium.com/m/')
  ) {
    return true
  }

  const pathParts = cleanUrl(url).split('/')
  return pathParts.length > 4 && pathParts[4] && pathParts[4].length > 0
}

// Compose validation rules
const validatePostUrl = pipe(
  url => Result.fromNullable(url),
  result =>
    result.flatMap(url =>
      isNotEmpty(url) ? Result.ok(url) : Result.error('URL is empty')
    ),
  result =>
    result.flatMap(url =>
      isNotHomepage(url) ? Result.ok(url) : Result.error('URL is homepage')
    ),
  result =>
    result.flatMap(url =>
      hasValidProfilePostPath(url)
        ? Result.ok(url)
        : Result.error('Invalid profile post path')
    ),
  result =>
    result.flatMap(url =>
      hasValidSubdomainPostPath(url)
        ? Result.ok(url)
        : Result.error('Invalid subdomain post path')
    ),
  result =>
    result.flatMap(url =>
      hasValidPublicationPostPath(url)
        ? Result.ok(url)
        : Result.error('Invalid publication post path')
    )
)

// Export the validator function
export const createUrlValidator = () => url => {
  const result = validatePostUrl(url)
  return result.isOk
}

// Export individual rules for testing
export const urlValidationRules = {
  isNotEmpty,
  cleanUrl,
  isNotHomepage,
  hasValidProfilePostPath,
  hasValidSubdomainPostPath,
  hasValidPublicationPostPath,
}
