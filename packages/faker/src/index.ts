import mock, { 
  MockContextAccessor,
  mergeContexts,
  unknownIdent
} from '@mockpiler/core'
import * as faker from 'faker'
import { MockContextInput } from '@mockpiler/core/dist/context'

type FakerStatic = typeof faker
type FakerPrefix = keyof FakerStatic
type FakerPath = [FakerPrefix, string]

let pathCache: Record<string, FakerPath>

export enum FakerNamespaceMode {
  none,
  prefix,
  full
}

const defaultConfig = {
  rootNamespace: 'faker',
  namespaceMode: FakerNamespaceMode.none
}

const FAKER_MUSTACHE_REGEX = /{{[a-z]+\.[a-z]+}}/i

const fakerContextAccessor: MockContextAccessor = key => {
  if (FAKER_MUSTACHE_REGEX.test(key)) {
    return faker.fake(key)
  }

  const path = getPathFromKey(key)

  if (!path) {
    return unknownIdent
  }

  const [prefix, method] = path 

  if (!(prefix in faker)) {
    return unknownIdent
  }

  const prefixValue = faker[prefix]

  if (typeof prefixValue !== 'object') {
    return method ? unknownIdent : prefixValue
  }

  return method in prefixValue
    ? prefixValue[method]
    : unknownIdent
}

const compileFaker = mock(fakerContextAccessor)

export default compileFaker

export function withFakerContext (contextOrAccessor: MockContextInput): MockContextAccessor {
  return mergeContexts(fakerContextAccessor, contextOrAccessor)
}

function getPathFromKey (key: string): FakerPath {
  if (!key) {
    return null
  }

  const path = key.split('.')

  // Path normalization based on namespace mode
  switch (defaultConfig.namespaceMode) {
    case FakerNamespaceMode.full: {
      if (
        path.length < 2 ||
        path.length > 3 ||
        path[0] !== defaultConfig.rootNamespace
      ) {
        return null
      }

      return path.slice(1) as any
    }

    case FakerNamespaceMode.prefix: {
      if (path.length > 2) {
        return null
      } else if (path.length === 1) {
        return [path[0] as FakerPrefix, '']
      }

      return path as any
    }

    case FakerNamespaceMode.none: {
      if (path.length !== 1) {
        return null
      }

      const [clue] = path

      if (!pathCache) {
        pathCache = {}
        const prefixes = Object.keys(faker) as FakerPrefix[]
  
        for (const prefix of prefixes) {
          const prefixValue = faker[prefix]
  
          if (typeof prefixValue === 'string') {
            pathCache[prefix] = [prefix, '']
          } else {
            const methods = Object.keys(prefixValue)
  
            for (const method of methods) {
              pathCache[method] = [prefix, method]
            }
          }
        }
      }

      return pathCache[clue]
    }
  }
}
