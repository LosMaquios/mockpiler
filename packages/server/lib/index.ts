import ms from 'ms'
import LRUCache from 'lru-cache'
import createMockpiler, {
  raw,
  MockContext
} from '@mockpiler/core'

export interface MockResolverOptions {
  /**
   * Default mocks root path
   */
  rootPath: string

  /**
   * Mock context
   */
  context: MockContext

  /**
   * File content resolver
   */
  resolveMockFile: (mockPath: string) => string | null

  /**
   * Fallback mock filename
   */
  fallback?: string

  /**
   * Cache config
   * 
   * `false` disables cache
   * 
   * @see https://github.com/isaacs/node-lru-cache#options
   */
  cache?: false | {
    max?: number

    /**
     * Human-readable time expression
     * 
     * @see https://github.com/vercel/ms#examples
     */
    maxAge?: string
  }
}

const DEFAULT_FALLBACK_MOCK_FILENAME = '__fb'
const FALLBACK_REGEX_REPLACER = /[^\/]+$/

export function createMockResolver (options: MockResolverOptions) {
  let cache: LRUCache<string, string>
  const compileMock = createMockpiler(options.context)

  if (options.cache !== false) {
    cache = new LRUCache({
      max: options.cache.max ?? 100,
      maxAge: ms(options.cache.maxAge ?? '1h')
    })
  }

  return (mockPath: string) => {
    const cached = cache?.get(mockPath)

    // Resolve with cached data
    if (cached) {
      return cached
    }

    const resolvedMock = resolveMock(mockPath) 
    const stringifiedMock = resolvedMock
      ? JSON.stringify(resolvedMock)
      : ''

    if (stringifiedMock) {
      cache?.set(mockPath, stringifiedMock)
    }

    return stringifiedMock
  }

  function resolveMock (mockPath: string) {
    let mockFileContent: string
  
    if (mockPath.endsWith('/')) {
      mockPath += 'index'
    }

    mockFileContent = options.resolveMockFile(mockPath)

    // Resolve fallback content
    if (!mockFileContent) {
      mockFileContent = options.resolveMockFile(
        mockPath.replace(
          FALLBACK_REGEX_REPLACER, 
          options.fallback ?? DEFAULT_FALLBACK_MOCK_FILENAME
        )
      )
    }

    return mockFileContent
      ? compileMock`${raw(mockFileContent)}`
      : null
  }
}
