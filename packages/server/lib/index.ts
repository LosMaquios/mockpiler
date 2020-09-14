import path from 'path'
import fs from 'fs'
import http from 'http'
import ms from 'ms'
import LRUCache from 'lru-cache'
import createMockpiler, { raw } from '@mockpiler/core'

const DEFAULT_MOCKS_ROOT_PATH = path.resolve(
  process.cwd(),
  '.mocks'
)

const context = {
  title: 'Server test',
  serverStatus: 200,
  name: 'John Doe',
  age () {
    return Math.floor(Math.random() * 100)
  }
}

const mock = createMockpiler(context)

const mockCache = new LRUCache<string, string>({
  max: 100,
  maxAge: ms('1h')
})

const server = http.createServer((req, res) => {
  const mockPath = req.url!
  const cached = mockCache.get(mockPath)

  res.setHeader('Content-Type', 'application/json')

  // Resolve with cached data
  if (cached) {
    console.log('Found mock in cache:', mockPath)
    return res.end(cached)
  }

  const resolvedMock = resolveMock(mockPath)

  if (!resolvedMock) {
    res.statusCode = 404
    return res.end()
  }

  const stringifiedMock = JSON.stringify(resolvedMock)

  mockCache.set(mockPath, stringifiedMock)

  res.end(stringifiedMock)
})

function resolveMock (mockPath: string) {
  let mockFileContent: string

  try {
    mockFileContent = fs.readFileSync(
      path.resolve(DEFAULT_MOCKS_ROOT_PATH, `.${mockPath}${mockPath.endsWith('/') ? 'index' : ''}.mock`), 
      'utf8'
    )
  } catch (error) {
    console.error(error)
    return null
  }

  return mock`${
    raw(mockFileContent)
  }`
}

server
  .listen(
    3000,
    () => console.log('Listening on port:', 3000)
  )
