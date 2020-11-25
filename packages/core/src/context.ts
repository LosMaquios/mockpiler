export type MockContextInput = MockContext | MockContextAccessor

export interface MockContext {
  [key: string]: any
}

export type MockContextAccessor = (key: string) => any

export const unknownIdent = Symbol('MockPiler.UnknownIdent')

const encodeKey = (n: number) => n.toString(36)

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
  const randomContextKey = encodeKey(Math.random()).slice(2)

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
      const contextKey = `__mockpiler__${randomContextKey}_${encodeKey(index)}`

      rootContext[contextKey] = value
      template += `'${contextKey}'${templateStrings[index + 1]}`
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

/**
 * Merges given plain context objects or accessors
 * 
 * @param inputs 
 */
export function mergeContexts (...inputs: MockContextInput[]): MockContextAccessor {
  const accessors = inputs.map(getContextAccessor)

  return key => {
    for (const accessor of accessors) {
      const result = accessor(key)

      if (result !== unknownIdent) {
        return result
      }
    }

    return unknownIdent
  }
}
