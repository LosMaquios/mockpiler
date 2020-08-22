import { createCompiler } from '../src/compiler'
import {
  validContext,
  validCode
} from './fixtures'
  
describe('compiler', () => {
  test('should compile valid code', () => {
    expect(
      createCompiler(validContext)`${validCode}`
    ).toMatchSnapshot()
  })
})
