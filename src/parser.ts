export enum Token {
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
  escapeToken = '\\'
}

export type AstNodeType = 'ident' | 'object' | 'array' | 'pair' | 'element'

export interface AstNode {
  type: AstNodeType
}

export interface AstPairNode extends AstNode {
  type: 'pair'
  key: AstIdentNode
  value: AstValueNode
}

export interface AstIdentNode extends AstNode {
  type: 'ident'
  ident: string
}

export interface AstArrayNode extends AstNode {
  type: 'array'
  elements: AstElementNode[]
}

export type AstValueNode = AstObjectNode | AstArrayNode | AstIdentNode

export interface AstElementNode extends AstNode {
  type: 'element'
  count: number | AstIdentNode
  value: AstValueNode
}

export interface AstObjectNode extends AstNode {
  type: 'object'
  pairs: AstPairNode[]
}

export type AstRootNode = AstObjectNode | AstArrayNode

// TODO: Generate codeframes for a better beginners debugging

const WHITESPACE_REGEX = /[\n\r\s]/
const IDENTIFIER_REGEX = /[\.a-z-_]/i
const DIGIT_REGEX = /\d/

export function parse (input: string) {
  let index = 0

  return parseRoot()

  function parseRoot (): AstRootNode {
    // Skip leading whitespaces for root tokens `  `<-{ or `  `<-[
    skipWhitespaces()

    const node: AstRootNode = (
      parseArray() ??
      parseObject()
    )

    if (!node) {
      throw new Error(`Invalid token: ${current()}`)
    }

    // Skip trailing whitespaces for root tokens }->`  ` or ]->`  `
    skipWhitespaces()

    if (current()) {
      throw new Error(`Ignored token: ${current()}`)
    }

    return node
  }

  function parseElement (): AstElementNode {
    const elementNode: AstElementNode = {
      type: 'element',
      count: null,
      value: null
    }

    if (current() !== Token.countStartToken) {
      elementNode.count = 1
    } else {
      // Skip leading count token `(`<-$count)
      next()

      // Skip leading inner count whitespaces (`  `<-$count)
      skipWhitespaces()

      if (!DIGIT_REGEX.test(current())) {
        elementNode.count = parseIdent()

        if (!elementNode.count) {
          throw new Error(`Expecting count expression but got: ${current()}`)
        }
      } else {
        let count = ''

        do {
          count += current()
        } while (DIGIT_REGEX.test(next()))

        elementNode.count = parseInt(count)
      }

      // Skip trailing inner count whitespaces ($count->`  `)
      skipWhitespaces()

      if (current() !== Token.countEndToken) {
        throw new Error(`Expecting closing count token but got: ${current()}`)
      }

      // Skip trailing count token ($count->`)`
      next()

      // Skip trailing format-padding whitespaces ($count)->`  `
      skipWhitespaces()
    }

    elementNode.value = (
      parseArray() ??
      parseObject() ??
      parseIdent()
    )

    if (!elementNode.value) {
      return null
    }

    return elementNode
  }

  function parseArray (): AstArrayNode {
    if (!ensureAndSkip(Token.arrayStartToken)) {
      return null
    }

    const elements: AstElementNode[] = []

    do {
      // Skip leading format-padding whitespaces
      skipWhitespaces()

      const element = parseElement()

      if (!element) {
        // Skip trailing format-padding whitespaces
        skipWhitespaces()

        if (current() !== Token.arrayEndToken) {
          throw new Error(`Expecting closing object but got: ${current()}`)
        }

        // Skip `]` token
        next()
        break
      }

      elements.push(element)
    } while (current())

    // Skip end `]` token
    next()

    return {
      type: 'array',
      elements
    }
  }

  function parseObject (): AstObjectNode {
    if (!ensureAndSkip(Token.objectStartToken)) {
      return null
    }

    const pairs: AstPairNode[] = []

    do {
      // Skip leading format-padding whitespaces
      skipWhitespaces()

      const pair = parsePair()

      if (!pair) {
        // Skip trailing format-padding whitespaces
        skipWhitespaces()

        if (current() !== Token.objectEndToken) {
          throw new Error(`Expecting closing object but got: ${current()}`)
        }

        // Skip `}` token
        next()
        break
      }

      pairs.push(pair)
    } while (current())

    return {
      type: 'object',
      pairs
    }
  }

  function parsePair (): AstPairNode {
    const key = parseIdent()

    if (!key) {
      return null
    }

    skipWhitespaces()

    let value: AstPairNode['value']

    if (current() !== Token.objectPairSeparator) {
      value = key
    } else {
      // Skip `:`
      next()

      // Skip trailing :->`  `
      skipWhitespaces()

      value = (
        parseArray() ??
        parseObject() ??
        parseIdent()
      )

      if (!value) {
        return null
      }
    }

    return {
      type: 'pair',
      key,
      value
    }
  }

  function parseIdent (): AstIdentNode {
    let ident = ''

    if (current() !== Token.identifierToken) {
      if (!IDENTIFIER_REGEX.test(current())) {
        return null
      }

      do {
        ident += current()
      } while (IDENTIFIER_REGEX.test(next()))
    } else {
      // Skip leading identifier token `'`
      next()

      let escaping = false

      do {
        const char = current()

        escaping = !escaping && char === Token.escapeToken

        // Avoid appending escaping char
        if (!escaping) {
          ident += char
        }
      } while (
        next() &&
        !escaping &&
        current() !== Token.identifierToken
      )

      // Skip trailing identifier token `'`
      next()
    }

    return {
      type: 'ident',
      ident
    }
  }

  function ensureAndSkip (token: Token) {
    if (current() !== token) {
      return false
    }

    next()
    skipWhitespaces()
    return true
  }

  function current () {
    return input[index]
  }

  function next () {
    ++index

    return current()
  }

  function skipWhitespaces () {
    while (WHITESPACE_REGEX.test(current()) && next());
  }
}
