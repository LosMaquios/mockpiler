export type TransformFn<Result = any> = (value: any) => Result

const MapTransform: TransformFn<Map<any, any>> = value => {
  if (Array.isArray(value)) {
    return new Map(value)
  }

  if (typeof value !== 'object' || value === null) {
    throw new TypeError('Invalid value')
  }

  const map = new Map()
  const keys = Object.keys(value)

  for (const key of keys) {
    map.set(key, value[key])
  }

  return map
}

const SetTransform: TransformFn<Set<any>> = value => {
  if (!Array.isArray(value)) {
    throw new TypeError('Invalid value')
  }

  return new Set(value)
}

export const transformers = {
  Map: MapTransform,
  Set: SetTransform
}
