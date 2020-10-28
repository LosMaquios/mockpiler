import {
  createCompiler as mock,
  raw,
  mergeContexts,
  transformers
} from '../src'
import {
  validContext,
  validCode,
  customContextAccessor
} from './fixtures'

describe('compiler', () => {
  test('should compile valid code', () => {
    expect(
      mock(validContext)`${raw(validCode)}`
    ).toMatchSnapshot()
  })

  test('should compilation throw an error on unknown ident', () => {
    expect(() => mock(validContext)`{ aa }`).toThrowErrorMatchingSnapshot()
  })

  test('should compile interpolated code', () => {
    expect(
      mock`
        {
          name: ${'Jhon doe'}
          age: ${30}
          fruits: ${['apple', 'strawberry']}
          favoriteFruit: ${() => 'apple'}
        }
      `
    ).toMatchSnapshot()
  })

  test('should compile with given custom context accessor', () => {
    const compile = mock(customContextAccessor)

    expect(
      compile`
        {
          a
          bb
          ccc
        }
      `
    ).toMatchSnapshot()
  })

  test('should compilation throw an error on unknown ident with a custom context accessor', () => {
    const compile = mock(customContextAccessor)

    expect(() => compile`{ unknown }`).toThrowErrorMatchingSnapshot()
  })

  test('should compile with merged contexts', () => {
    const compile = mock(
      mergeContexts(
        validContext,
        customContextAccessor
      )
    )

    expect(
      compile`
        {
          name
          age
          aa
        }
      `
    ).toMatchSnapshot()
  })

  test('should transform values', () => {
    const context = {
      ...transformers,
      value: 'Test'
    }

    const result: { map: Map<any, any>, set: Set<any> } = mock(context)`
      {
        map: Map > {
          key: value
        }
        set: Set > [
          value
        ]
      }
    ` as any

    expect(result.map).toBeInstanceOf(Map)
    expect(result.set).toBeInstanceOf(Set)

    expect(result.map.size).toBe(1)
    expect(result.set.size).toBe(1)

    expect(result.map.get('key')).toBe(context.value)
    expect(result.set.has(context.value)).toBeTruthy()
  })
})
