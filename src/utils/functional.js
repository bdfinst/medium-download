// Functional programming utilities for the Medium Scraper project

// Function composition utilities
export const pipe =
  (...fns) =>
  x =>
    fns.reduce((v, fn) => fn(v), x)

export const pipeAsync =
  (...fns) =>
  async x =>
    fns.reduce(async (v, fn) => fn(await v), Promise.resolve(x))

export const compose = (...fns) => pipe(...fns.reverse())

export const composeAsync = (...fns) => pipeAsync(...fns.reverse())

// Currying utility for creating reusable functions
export const curry = fn => {
  const arity = fn.length

  return function curried(...args) {
    if (args.length >= arity) {
      return fn.apply(this, args)
    }

    return (...nextArgs) => curried(...args, ...nextArgs)
  }
}

// Memoization for expensive operations
export const memoize = fn => {
  const cache = new Map()

  return (...args) => {
    const key = JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key)
    }

    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

// Async memoization
export const memoizeAsync = fn => {
  const cache = new Map()

  return async (...args) => {
    const key = JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key)
    }

    const result = await fn(...args)
    cache.set(key, result)
    return result
  }
}

// Array utilities
export const partition = (arr, predicate) =>
  arr.reduce(
    ([pass, fail], item) =>
      predicate(item) ? [[...pass, item], fail] : [pass, [...fail, item]],
    [[], []]
  )

export const groupBy = (arr, keyFn) =>
  arr.reduce((acc, item) => {
    const key = keyFn(item)
    return {
      ...acc,
      [key]: [...(acc[key] || []), item],
    }
  }, {})

export const unique = (arr, keyFn = x => x) => {
  const seen = new Set()
  return arr.filter(item => {
    const key = keyFn(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

// Promise utilities
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export const timeout = (promise, ms) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Operation timed out')), ms)
  )

  return Promise.race([promise, timeoutPromise])
}

// Debounce utility
export const debounce = (fn, delay) => {
  let timeoutId

  return (...args) => {
    clearTimeout(timeoutId)

    return new Promise(resolve => {
      timeoutId = setTimeout(() => {
        resolve(fn(...args))
      }, delay)
    })
  }
}

// Safe property access
export const prop = curry((key, obj) => obj?.[key])

export const path = curry((keys, obj) =>
  keys.reduce((current, key) => current?.[key], obj)
)

// Functional conditional execution
export const when = curry((predicate, fn, value) =>
  predicate(value) ? fn(value) : value
)

export const unless = curry((predicate, fn, value) =>
  when(x => !predicate(x), fn, value)
)

// Result type for error handling
export const Result = {
  ok: value => ({
    isOk: true,
    isError: false,
    map: fn => Result.ok(fn(value)),
    flatMap: fn => fn(value),
    mapError: () => Result.ok(value),
    fold: (_errorFn, okFn) => okFn(value),
    getOrElse: () => value,
    value,
  }),

  error: error => ({
    isOk: false,
    isError: true,
    map: () => Result.error(error),
    flatMap: () => Result.error(error),
    mapError: fn => Result.error(fn(error)),
    fold: errorFn => errorFn(error),
    getOrElse: defaultValue => defaultValue,
    error,
  }),

  fromNullable: value =>
    value == null
      ? Result.error('Value is null or undefined')
      : Result.ok(value),

  tryCatch: fn => {
    try {
      return Result.ok(fn())
    } catch (error) {
      return Result.error(error)
    }
  },

  tryCatchAsync: async fn => {
    try {
      const result = await fn()
      return Result.ok(result)
    } catch (error) {
      return Result.error(error)
    }
  },
}
