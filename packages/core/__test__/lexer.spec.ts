import {
  scan,
  LexerError
} from '../src/lexer'
import {
  validCode,
  unknownTokenCode
} from './fixtures'

describe('lexer', () => {
  test('should scan valid code', () => {
    expect(scan(validCode)).toMatchSnapshot()
  })

  test('should throw on unknown token', () => {
    expect(() => scan(unknownTokenCode)).toThrowError(new LexerError('Unknown token: ,'))
  })
})