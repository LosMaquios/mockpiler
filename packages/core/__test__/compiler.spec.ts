import { createCompiler as mock, raw } from '../src/compiler'
import {
  validContext,
  validCode
} from './fixtures'

describe('compiler', () => {
  test('should compile valid code', () => {
    expect(
      mock(validContext)`${raw(validCode)}`
    ).toMatchSnapshot()
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
})
