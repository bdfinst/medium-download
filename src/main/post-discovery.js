// Post discovery utilities

export const discoverPostsWithRetry = async (
  scraperService,
  profileUrl,
  options
) => {
  const result = await scraperService.discoverPosts(profileUrl, options)
  if (!result.success) {
    throw new Error(result.error)
  }
  return result
}

export const filterPostsForIncremental = async (
  posts,
  storage,
  incrementalMode
) => {
  if (!incrementalMode) {
    return { posts, skippedCount: 0 }
  }

  const metadataResult = await storage.loadMetadata()
  if (!metadataResult.success || !metadataResult.metadata) {
    return { posts, skippedCount: 0 }
  }

  const postsNeedingUpdate = await storage.getPostsNeedingUpdate(
    posts,
    metadataResult.metadata
  )
  const skippedCount = posts.length - postsNeedingUpdate.length

  return {
    posts: postsNeedingUpdate,
    skippedCount,
  }
}

export const createPostDiscoveryService = (scraperService, storage) => {
  return {
    discover: (profileUrl, options) =>
      discoverPostsWithRetry(scraperService, profileUrl, options),
    filterForIncremental: (posts, incrementalMode) =>
      filterPostsForIncremental(posts, storage, incrementalMode),
  }
}
