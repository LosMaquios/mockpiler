const gl = typeof window !== 'undefined'
  ? window
  : global

export type TransformFn = (value: any) => any

const Map: TransformFn = value => {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('Invalid value')
  }

  const map = new gl.Map<any, any>()

  if (!Array.isArray(value)) {
    const keys = Object.keys(value)

    for (const key of keys) {
      map.set(key, value[key])
    }
  } else {
    for (const element of value) {
      if (!Array.isArray(element) || element.length !== 2) {
        throw new TypeError('Expecting an entry array: [key, value]')
      }

      map.set(...element as [any, any])
    }
  }

  return map
}

const Set: TransformFn = value => {
  if (!Array.isArray(value)) {
    throw new TypeError('Invalid value')
  }

  return new gl.Set<any>(value)
}

export const transformers = {
  Map,
  Set
}