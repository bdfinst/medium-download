// Application constants and configuration values

export const DELAYS = {
  REQUEST: 2000,
  RETRY_BASE: 1000,
  RETRY_MAX: 30000,
  SCROLL_BETWEEN_STRATEGIES: 300,
  BUTTON_CLICK: 2000,
  CONTENT_LOAD: 3000,
  PAGE_LOAD: 3500,
  SCROLL_STEP_MULTIPLE: 800,
  FINAL_CONTENT_LOAD: 2000,
}

export const TIMEOUTS = {
  PAGE_LOAD: 30000,
  CONTENT_WAIT: 15000,
  WAIT_FOR_SELECTOR: 20000,
  ELEMENT_WAIT_FAST: 1000,
  ELEMENT_WAIT_NORMAL: 20000,
}

export const LIMITS = {
  MAX_RETRIES: 3,
  MAX_SCROLL_ATTEMPTS: 20,
  MAX_CONSECUTIVE_FAILURES: 5,
  SCROLL_STRATEGIES: 3,
  SCROLL_INCREMENTS: 5,
  RECENT_POSTS_SUMMARY: 5,
  TAG_LENGTH_MAX: 50,
  TITLE_PREVIEW_LENGTH: 50,
  POST_SLUG_MIN_LENGTH: 8,
}

export const SELECTORS = {
  // Article and post containers
  ARTICLE: 'article',
  POST_CONTAINERS:
    '[data-testid*="post"], [data-testid*="story"], .postArticle, .streamItem',

  // Title elements
  TITLES: 'h1, h2, h3, h4, h5, [data-testid*="title"], .h4, .h5, .graf--title',

  // Link elements for Medium posts
  MEDIUM_LINKS: 'a[href*="/@"], a[href*=".medium.com"], a[href*="medium.com/"]',

  // Date and time elements
  DATES: 'time, [datetime], .date, [data-testid*="date"], .readingTime',

  // Content elements
  STORY_CONTENT: 'article, [data-testid="storyContent"]',
  STORY_TITLE: 'h1, [data-testid="storyTitle"]',
  STORY_SUBTITLE: 'h2, [data-testid="storySubtitle"]',

  // Author elements
  AUTHOR: '[data-testid="authorName"], .author-name',

  // Tag elements
  TAGS: '[data-testid="tag"], .tag, [data-testid*="tag"], .tags a, .post-tags a, [href*="/tag/"], a[href*="/tag/"]',

  // Engagement elements
  READING_TIME: '[data-testid="readingTime"], .reading-time',
  CLAP_COUNT: '[data-testid="clap-count"], .clap-count',
  RESPONSES_COUNT: '[data-testid="responses-count"], .responses-count',

  // Images
  FEATURED_IMAGE:
    'img[data-testid="featured-image"], article img:first-of-type',
  CONTENT_IMAGES: 'article img, [data-testid="storyContent"] img',

  // Loading and pagination
  LOADING_INDICATORS:
    '[data-testid="loading"], .loading, [aria-label*="loading"], [role="progressbar"], .spinner',
  LOAD_MORE_BUTTONS:
    'button[aria-label*="more"], button[aria-label*="load"], [data-testid*="load-more"]',
  END_OF_FEED: '[data-testid="end-of-feed"], .end-of-feed',

  // Content waiting
  CONTENT_WAIT:
    'article, [data-testid*="post"], [data-testid*="story"], a[href*="/@"]',
}

export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export const BROWSER_ARGS = ['--no-sandbox', '--disable-setuid-sandbox']

export const SCROLL_CONFIG = {
  VIEW_HEIGHT_MULTIPLIER: 0.8,
  INCREMENTAL_MULTIPLIER: 0.6,
  REMAINING_CONTENT_THRESHOLD: 500,
  MINIMAL_REMAINING_THRESHOLD: 50,
  CLEAR_INTERVAL_TIMEOUT: 3000,
}

export const URL_PATTERNS = {
  SIGNIN_REDIRECT: /signin.*redirect=/,
  ACTION_URL: /actionUrl=/,
  HEX_ID: /[a-f0-9]{12}/,
  MEDIUM_DOMAIN: /\.medium\.com/,
  PROFILE_AT: /@/,
  MEDIUM_ROOT: /^https?:\/\/[^/]+\.medium\.com\/?$/,
  PROFILE_ROOT: /^https?:\/\/medium\.com\/@[^/]+\/?$/,
}

export const EXCLUDED_PATHS = [
  '/m/signin',
  '/search',
  '/followers',
  '/about',
  'privacy-policy',
  'sitemap',
  '/m/',
]

export const DEBUG_CONFIG = {
  SCREENSHOT_PATH: 'debug-medium-page.png',
  FULL_PAGE: true,
}
