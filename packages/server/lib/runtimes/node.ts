import { URL } from 'url'
import path from 'path'
import fs from 'fs'
import {
  createServer,
  IncomingMessage,
  ServerResponse
} from 'http'

import {
  createMockResolver,
  MockResolverOptions
} from '../'

type ResponseChunk = any

export interface MockServerOptions extends Omit<Omit<MockResolverOptions, 'resolveMockFile'>, 'rootPath'> {
  rootPath?: string

  /**
   * Not found response or handler
   */
  notFound?: (req: IncomingMessage, res: ServerResponse) => void | ResponseChunk
}

export function createMockServer (options: MockServerOptions) {
  const resolveMock = createMockResolver({
    ...options,
    rootPath: options.rootPath ?? path.resolve(process.cwd(), '.mocks'),
    resolveMockFile (mockPath) {
      try {
        return fs.readFileSync(
          path.resolve(this.rootPath, `.${mockPath}.mock`),
          'utf8'
        )
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(error)
        }

        return null
      }
    }
  })

  return createServer((req, res) => {
    const { pathname: mockPath } = new URL(req.url!, 'file:')
    const resolvedMock = resolveMock(mockPath)

    if (resolvedMock) {
      res.setHeader('Content-Type', 'application/json')
      res.end(resolvedMock)
    } else if (typeof options.notFound === 'function') {
      options.notFound(req, res)
    } else {
      const acceptHeader = req.headers['accept']

      if (acceptHeader) {
        res.setHeader('Content-Type', acceptHeader)
      }

      res.statusCode = 404
      res.end(options.notFound)
    }
  })
}