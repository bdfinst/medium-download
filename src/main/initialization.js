// Initialization utilities for output directories and configuration

export const initializeOutputDirectories = async storage => {
  const result = await storage.initializeDirectories()
  if (!result.success) {
    throw new Error(result.error)
  }
  return result.directories
}

export const createDirectoryInitializer = storage => {
  return {
    initialize: () => initializeOutputDirectories(storage),
  }
}
