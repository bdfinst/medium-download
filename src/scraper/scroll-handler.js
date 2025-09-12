import { DELAYS, LIMITS, SELECTORS, SCROLL_CONFIG } from '../constants.js'

// Factory function for scroll handling service
export const createScrollHandler = () => {
  const scrollToLoadMore = async (page, options = {}) => {
    try {
      // Get current page height and post count before scrolling
      const beforeState = await page.evaluate(() => {
        /* eslint-disable no-undef */
        return {
          height: document.documentElement.scrollHeight,
          postCount: document.querySelectorAll(
            'article, [data-testid*="post"], [data-testid*="story"]'
          ).length,
          linkCount: document.querySelectorAll('a[href*="medium.com"]').length,
        }
        /* eslint-enable no-undef */
      })

      // Try multiple scroll strategies
      for (let strategy = 0; strategy < LIMITS.SCROLL_STRATEGIES; strategy++) {
        if (strategy === 0) {
          // Strategy 1: Slow scroll to bottom
          await scrollSlowly(page, options)
        } else if (strategy === 1) {
          // Strategy 2: Jump to bottom and trigger events
          await scrollToBottomWithEvents(page, options)
        } else {
          // Strategy 3: Multiple small scrolls with pauses
          await scrollIncrementally(page, options)
        }

        // Check for new content after each strategy
        const afterState = await page.evaluate(() => {
          /* eslint-disable no-undef */
          return {
            height: document.documentElement.scrollHeight,
            postCount: document.querySelectorAll(
              'article, [data-testid*="post"], [data-testid*="story"]'
            ).length,
            linkCount: document.querySelectorAll('a[href*="medium.com"]')
              .length,
          }
          /* eslint-enable no-undef */
        })

        // If we found new content, break early
        if (
          afterState.height > beforeState.height ||
          afterState.postCount > beforeState.postCount ||
          afterState.linkCount > beforeState.linkCount
        ) {
          break
        }
      }

      // Try clicking any load more buttons
      await clickLoadMoreButtons(page, options)

      // Final wait for any async content loading
      const finalDelay = options.fastMode ? 10 : DELAYS.FINAL_CONTENT_LOAD
      await new Promise(resolve => setTimeout(resolve, finalDelay))

      return true
    } catch (error) {
      console.error(`Scroll error: ${error.message}`)
      return false
    }
  }

  const scrollSlowly = async (page, options) => {
    await page.evaluate(scrollConfig => {
      /* eslint-disable no-undef */
      const scrollStep =
        window.innerHeight * scrollConfig.VIEW_HEIGHT_MULTIPLIER
      const totalHeight = document.documentElement.scrollHeight
      let currentScroll = window.pageYOffset

      const scrollInterval = setInterval(() => {
        currentScroll += scrollStep
        window.scrollTo(0, currentScroll)

        if (currentScroll >= totalHeight) {
          clearInterval(scrollInterval)
        }
      }, 300) // Scroll every 300ms

      // Clear after 3 seconds
      setTimeout(
        () => clearInterval(scrollInterval),
        scrollConfig.CLEAR_INTERVAL_TIMEOUT
      )
      /* eslint-enable no-undef */
    }, SCROLL_CONFIG)

    const delayTime = options.fastMode ? 50 : DELAYS.PAGE_LOAD + 500
    await new Promise(resolve => setTimeout(resolve, delayTime))
  }

  const scrollToBottomWithEvents = async (page, options) => {
    await page.evaluate(() => {
      /* eslint-disable no-undef */
      window.scrollTo(0, document.documentElement.scrollHeight)

      // Trigger scroll events manually
      window.dispatchEvent(new Event('scroll'))
      window.dispatchEvent(new Event('resize'))
      /* eslint-enable no-undef */
    })

    const delayTime = options.fastMode ? 50 : DELAYS.PAGE_LOAD + 500
    await new Promise(resolve => setTimeout(resolve, delayTime))
  }

  const scrollIncrementally = async (page, options) => {
    await page.evaluate(
      (scrollConfig, stepDelay) => {
        /* eslint-disable no-undef */
        const viewHeight = window.innerHeight
        const totalHeight = document.documentElement.scrollHeight
        let currentScroll = window.pageYOffset

        // Scroll in 5 increments
        for (let i = 0; i < scrollConfig.SCROLL_INCREMENTS; i++) {
          setTimeout(() => {
            currentScroll += viewHeight * scrollConfig.INCREMENTAL_MULTIPLIER
            window.scrollTo(0, Math.min(currentScroll, totalHeight))
          }, i * stepDelay)
        }
        /* eslint-enable no-undef */
      },
      { ...SCROLL_CONFIG, SCROLL_INCREMENTS: LIMITS.SCROLL_INCREMENTS },
      DELAYS.SCROLL_STEP_MULTIPLE
    )

    const delayTime = options.fastMode
      ? 50
      : LIMITS.SCROLL_INCREMENTS * DELAYS.SCROLL_STEP_MULTIPLE + 500
    await new Promise(resolve => setTimeout(resolve, delayTime))
  }

  const clickLoadMoreButtons = async (page, options) => {
    try {
      const loadMoreButtons = await page.$$(SELECTORS.LOAD_MORE_BUTTONS)
      for (const button of loadMoreButtons) {
        await button.click()
        const buttonClickDelay = options.fastMode ? 10 : DELAYS.BUTTON_CLICK
        await new Promise(resolve => setTimeout(resolve, buttonClickDelay))
      }
    } catch (error) {
      console.error(
        'No load more buttons found or click failed:',
        error.message
      )
    }
  }

  return {
    scrollToLoadMore,
  }
}

export default createScrollHandler
