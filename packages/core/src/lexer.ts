export enum TokenChar {
  /**
   * Array tokens
   */
  arrayStartToken = '[',
  arrayEndToken = ']',

  /**
   * Object tokens
   */
  objectStartToken = '{',
  objectEndToken = '}',
  objectPairSeparator = ':',

  /**
   * Count tokens
   */
  countStartToken = '(',
  countEndToken = ')',

  /**
   * Identifier tokens
   */
  identifierToken = '\'',

  /**
   * Escape tokens
   */
  escapeToken = '\\',

  /**
   * Spread tokens
   */
  spreadToken = '.'
}

export enum TokenType {
  identifier = 'identifier',
  spread = 'spread',
  object = 'object',
  array = 'array',
  count = 'count',
  countNumber = 'countNumber',
  EOF = 'EOF'
}

export interface Token {
  type: TokenType
  value: number | string
  location: {
    start: TokenLocation
    end: TokenLocation
  }
}

export interface TokenArray extends Token {
  type: TokenType.array
}

export interface TokenLocation {
  line: number
  column: number
}

/**
 * Valid start identifier chars are:
 * 
 *   1. An underscore _
 *   2. Any uppercase or lowercase letter
 */
export const START_IDENTIFIER_REGEX = /[a-z_]/i

/**
 * Valid identifiers chars remain are:
 * 
 *   1. Hyphens -
 *   2. Dots .
 *   3. Underscores _
 *   4. Any uppercase or lowercase letters
 */
export const IDENTIFIER_REGEX = /[-._a-z]/i

const COUNT_DIGIT_REGEX = /\d/
const LINE_CHAR = '\n'
const TAB_CHAR = '\t'
const SPACE_CHAR = ' '
const SPREAD_SIZE = 3

/**
 * Chars to be ignored during scanning
 */
const IGNORED_CHARS = [
  '\r'
]

/**
 * Count of spaces by tab char
 */
const TAB_SPACE_SIZE = 4

const ARRAY_TOKENS = [
  TokenChar.arrayStartToken,
  TokenChar.arrayEndToken
]

const OBJECT_TOKENS = [
  TokenChar.objectStartToken,
  TokenChar.objectEndToken,
  TokenChar.objectPairSeparator
]

const COUNT_TOKENS = [
  TokenChar.countStartToken,
  TokenChar.countEndToken
]

export class LexerError extends Error {
  name = 'LexerError'
}

export function scan (input: string): Token[] {
  let index = 0
  let line = 1
  let column = 1

  const tokens: Token[] = []
  const { length } = input

  while (index < length) {
    if (is(ARRAY_TOKENS)) {
      tokens.push(consumeToken(TokenType.array))
    } else if (is(TokenChar.spreadToken)) {
      if (
        !is(TokenChar.spreadToken, 1) ||
        !is(TokenChar.spreadToken, 2)
      ) {
        throwUnexpected()
      }

      const startLocation = getLocation()

      index += SPREAD_SIZE
      column += SPREAD_SIZE

      tokens.push({
        type: TokenType.spread,
        value: TokenChar.spreadToken.repeat(SPREAD_SIZE),
        location: {
          start: startLocation,
          end: getLocation()
        }
      })
    } else if (is(OBJECT_TOKENS)) {
      tokens.push(consumeToken(TokenType.object))
    } else if (is(COUNT_TOKENS)) {
      tokens.push(consumeToken(TokenType.count))
    } else if (is(COUNT_DIGIT_REGEX)) {
      const token = consumeRegex(TokenType.countNumber, COUNT_DIGIT_REGEX)
      token.value = parseInt(token.value as string)

      tokens.push(token)
    } else if (is(TokenChar.identifierToken)) {
      tokens.push(consumeIdent())
    } else if (is(START_IDENTIFIER_REGEX)) {
      tokens.push(consumeRegex(TokenType.identifier, IDENTIFIER_REGEX))
    } else if (is(LINE_CHAR)) {
      ++line
      ++index

      // Reset column
      column = 1
    } else if (is(TAB_CHAR)) {
      ++index
      column += TAB_SPACE_SIZE
    } else if (is(SPACE_CHAR)) {
      advance()
    } else if (is(IGNORED_CHARS)) {
      ++index
    } else {
      throwUnexpected()
    }
  }

  // Push end-of-file
  tokens.push({
    type: TokenType.EOF,
    value: '',
    location: {
      start: getLocation(),
      end: getLocation()
    }
  })

  return tokens

  function consumeToken (type: TokenType): Token {
    return {
      type,
      value: peek(),
      location: {
        start: getLocation(),
        end: (advance(), getLocation())
      }
    }
  }

  function consumeIdent (): Token {
    let ident = peek() // Save leading identifier token
    let escaping = false

    const start = getLocation()

    while (
      advance() &&
      (!is(TokenChar.identifierToken) || escaping)
    ) {
      escaping = !escaping && is(TokenChar.escapeToken)

      // Avoid appending escaping char
      if (!escaping) {
        ident += peek()
      }
    }

    if (!peek()) {
      throw new LexerError('Unexpected EOF')
    }

    // Save trailing identifier token
    ident += peek()

    // Skip trailing identifier token
    advance()

    return {
      type: TokenType.identifier,
      value: ident,
      location: {
        start,
        end: getLocation()
      }
    }
  }

  function consumeRegex (type: TokenType, regex: RegExp): Token {
    let value = peek()
    const start = getLocation()

    while (advance() && regex.test(peek())) {
      value += peek()
    }

    return {
      type,
      value,
      location: {
        start,
        end: getLocation()
      }
    }
  }

  function getLocation (): TokenLocation {
    return {
      line,
      column
    }
  }

  function is (expectation: RegExp | string | string[], offset?: number) {
    return typeof expectation === 'string'
      ? peek(offset) === expectation
      : Array.isArray(expectation)
      ? expectation.indexOf(peek(offset) as any) > -1
      : expectation.test(peek(offset))
  }

  function throwUnexpected () {
    throw new LexerError(`Unknown token '${peek()}' at ${line}:${column}`)
  }

  function advance () {
    ++column
    ++index

    return peek()
  }

  function peek (offset = 0) {
    return input[index + offset]
  }
}
