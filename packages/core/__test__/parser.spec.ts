import { parse } from '../src/parser'
import { scan } from '../src/lexer'
import { 
  validCode,
  invalidTokenCode
} from './fixtures'

describe('parser', () => {
  test('should parse valid token sequence', () => {
    expect(parse(scan(validCode))).toMatchSnapshot()
  })

  test('should throw on invalid token', () => {
    expect(() => parse(scan(invalidTokenCode))).toThrowErrorMatchingSnapshot()
  })
})