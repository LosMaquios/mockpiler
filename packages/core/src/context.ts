export type MockContextInput = MockContext | MockContextAccessor

export interface MockContext {
  [key: string]: any
}

export type MockContextAccessor = (key: string) => any

const UNWANTED_CHARS_REGEX = /\d+|=+$/g
const cleanUnwantedChars = (str: string) => str.replace(UNWANTED_CHARS_REGEX, '')

const toBase64 = typeof window === 'undefined'
  ? (str: any) => cleanUnwantedChars(Buffer.from(str.toString()).toString('base64'))
  : (str: any) => cleanUnwantedChars(btoa(str.toString()))

export const unknownIdent = Symbol('MockPiler.UnknownIdent')

class RawValue {
  constructor (
    public raw: any) {}
}

export function raw (value: any) {
  return new RawValue(value)
}

export function getTemplateAndRootContext (
  templateStrings: TemplateStringsArray, 
  values: any[],
  accessor: MockContextAccessor
): [string, MockContext] {
  let [template] = templateStrings
  const randomContextKey = toBase64(Math.random().toString().slice(2))

  const rootContext: MockContext = {}
  const rootContextProxy = new Proxy(rootContext, {
    get (target, key: string) {
      return Reflect.has(target, key)
        ? target[key]
        : accessor(key)
    }
  })

  values.forEach((value, index) => {
    if (value instanceof RawValue) {
      template += `${value.raw}${templateStrings[index + 1]}`
    } else {
      const contextKey = `__mockpiler__${randomContextKey}_${toBase64(index)}`

      rootContext[contextKey] = value
      template += `${contextKey}${templateStrings[index + 1]}`
    }
  })

  return [
    template,
    rootContextProxy
  ]
}

/**
 * Utility function to get a context accessor 
 * from a plain context object
 * 
 * @param input
 */
export function getContextAccessor (input: MockContextInput): MockContextAccessor {
  if (typeof input === 'function') {
    return input as any
  }

  // Generate an accessor based on given input
  return key => key in input ? input[key] : unknownIdent
}
