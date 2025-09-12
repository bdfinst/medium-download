// Metadata management utilities

export const createScrapingMetadata = ({
  profileUrl,
  username,
  totalPostsFound,
  processedCount,
  successCount,
  failureCount,
  skippedCount,
  results,
  duration,
}) => {
  return {
    scrapedAt: new Date().toISOString(),
    profileUrl,
    username,
    totalPostsFound,
    postsProcessed: processedCount,
    postsSuccessful: successCount,
    postsFailed: failureCount,
    postsSkipped: skippedCount,
    duration,
    results,
  }
}

export const saveScrapingMetadata = async (storage, metadataOptions) => {
  const metadata = createScrapingMetadata(metadataOptions)
  await storage.saveMetadata(metadata)
  return metadata
}

export const createMetadataService = storage => {
  return {
    create: createScrapingMetadata,
    save: metadataOptions => saveScrapingMetadata(storage, metadataOptions),
  }
}
