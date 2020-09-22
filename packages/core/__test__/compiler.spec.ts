import { createCompiler as mock, raw, mergeContexts } from '../src'
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
})
