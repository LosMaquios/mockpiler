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
  spreadToken = '.',

  /**
   * Transform tokens
   */
  transformToken = '>'
}

export enum TokenType {
  identifier = 'identifier',
  spread = 'spread',
  transform = 'transform',
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

export class Lexer {
  index = 0
  line = 1
  column = 1

  constructor (
    public input: string) {}

  is (expectation: RegExp | string | string[], offset?: number) {
    return typeof expectation === 'string'
      ? this.peek(offset) === expectation
      : Array.isArray(expectation)
      ? expectation.indexOf(this.peek(offset)) > -1
      : expectation.test(this.peek(offset))
  }

  peek (offset = 0) {
    return this.input[this.index + offset]
  }

  advance (increment = 1) {
    this.index += increment
    this.column += increment

    return this.peek()
  }

  getLocation (): TokenLocation {
    return {
      line: this.line,
      column: this.column
    }
  }

  scanToken (type: TokenType): Token {
    return {
      type,
      value: this.peek(),
      location: {
        start: this.getLocation(),
        end: (this.advance(), this.getLocation())
      }
    }
  }

  scanSpread (): Token {
    const startLocation = this.getLocation()

    // Skip spread chars
    this.advance(SPREAD_SIZE)

    return {
      type: TokenType.spread,
      value: TokenChar.spreadToken.repeat(SPREAD_SIZE),
      location: {
        start: startLocation,
        end: this.getLocation()
      }
    }
  }

  scanIdent (): Token {
    let ident = this.peek() // Save leading identifier token
    let escaping = false

    const start = this.getLocation()

    while (
      this.advance() &&
      (!this.is(TokenChar.identifierToken) || escaping)
    ) {
      escaping = !escaping && this.is(TokenChar.escapeToken)

      // Avoid appending escaping char
      if (!escaping) {
        ident += this.peek()
      }
    }

    if (!this.peek()) {
      throw new LexerError('Unexpected EOF')
    }

    // Save trailing identifier token
    ident += this.peek()

    // Skip trailing identifier token
    this.advance()

    return {
      type: TokenType.identifier,
      value: ident,
      location: {
        start,
        end: this.getLocation()
      }
    }
  }

  scanRegex (type: TokenType, regex: RegExp): Token {
    let value = this.peek()
    const start = this.getLocation()

    while (this.advance() && regex.test(this.peek())) {
      value += this.peek()
    }

    return {
      type,
      value,
      location: {
        start,
        end: this.getLocation()
      }
    }
  }

  throwUnexpected () {
    throw new LexerError(`Unknown token '${this.peek()}' at ${this.line}:${this.column}`)
  }

  scan () {
    const tokens: Token[] = []
    const { length } = this.input

    while (this.index < length) {
      if (this.is(ARRAY_TOKENS)) {
        tokens.push(this.scanToken(TokenType.array))
      } else if (this.is(TokenChar.spreadToken)) {
        if (
          !this.is(TokenChar.spreadToken, 1) ||
          !this.is(TokenChar.spreadToken, 2)
        ) {
          this.throwUnexpected()
        }

        tokens.push(this.scanSpread())
      } else if (this.is(TokenChar.transformToken)) {
        tokens.push(this.scanToken(TokenType.transform))
      } else if (this.is(OBJECT_TOKENS)) {
        tokens.push(this.scanToken(TokenType.object))
      } else if (this.is(COUNT_TOKENS)) {
        tokens.push(this.scanToken(TokenType.count))
      } else if (this.is(COUNT_DIGIT_REGEX)) {
        const token = this.scanRegex(TokenType.countNumber, COUNT_DIGIT_REGEX)
        token.value = parseInt(token.value as string)

        tokens.push(token)
      } else if (this.is(TokenChar.identifierToken)) {
        tokens.push(this.scanIdent())
      } else if (this.is(START_IDENTIFIER_REGEX)) {
        tokens.push(this.scanRegex(TokenType.identifier, IDENTIFIER_REGEX))
      } else if (this.is(LINE_CHAR)) {
        ++this.line
        ++this.index

        // Reset column
        this.column = 1
      } else if (this.is(TAB_CHAR)) {
        ++this.index
        this.column += TAB_SPACE_SIZE
      } else if (this.is(SPACE_CHAR)) {
        this.advance()
      } else if (this.is(IGNORED_CHARS)) {
        ++this.index
      } else {
        this.throwUnexpected()
      }
    }

    // Push end-of-file
    tokens.push({
      type: TokenType.EOF,
      value: '',
      location: {
        start: this.getLocation(),
        end: this.getLocation()
      }
    })

    return tokens
  }
}

export function scan (input: string): Token[] {
  return new Lexer(input).scan()
}
