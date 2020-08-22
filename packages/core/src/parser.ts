import {
  Token,
  TokenChar,
  TokenType
} from './lexer'
import { generateCodeframe } from './codeframe'

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

const TRIM_IDENTIFIER_REGEX = new RegExp(`^${TokenChar.identifierToken}|${TokenChar.identifierToken}$`)

class ParserError extends Error {
  name = 'ParserError'
}

export function parse (tokens: Token[]) {
  let index = 0

  return parseRoot()

  function parseRoot (): AstRootNode {
    const node: AstRootNode = (
      parseArray() ??
      parseObject()
    )

    if (!node) {
      throwWithCodeFrame(`Invalid token: ${current()}`)
    }

    if (current()) {
      throwWithCodeFrame(`Ignored token: ${current()}`)
    }

    return node
  }

  function parseArray (): AstArrayNode {
    if (!ensureAndSkip(TokenChar.arrayStartToken)) {
      return null
    }

    const elements: AstElementNode[] = []

    while (current() && !is(TokenChar.arrayEndToken)) {
      elements.push(parseElement())
    }

    expectAndSkip(TokenChar.arrayEndToken)

    return {
      type: 'array',
      elements
    }
  }

  function parseElement (): AstElementNode {
    const elementNode: AstElementNode = {
      type: 'element',
      count: null,
      value: null
    }

    if (!is(TokenChar.countStartToken)) {
      elementNode.count = 1
    } else {
      // Skip leading count token `(`<-$count)
      next()

      const token = current()

      if (typeof token === 'number') {
        elementNode.count = token
        next()
      } else {
        elementNode.count = parseIdent()

        if (!elementNode.count) {
          throwWithCodeFrame(`Expecting count expression but got: ${token}`)
        }
      }

      if (!is(TokenChar.countEndToken)) {
        throwWithCodeFrame(`Expecting closing count token but got: ${current()}`)
      }

      // Skip trailing count token ($count->`)`
      next()
    }

    elementNode.value = (
      parseArray() ??
      parseObject() ??
      parseIdent()
    )

    if (!elementNode.value) {
      throw new ParserError(`Invalid token: ${current()}`)
    }

    return elementNode
  }

  function parseObject (): AstObjectNode {
    if (!ensureAndSkip(TokenChar.objectStartToken)) {
      return null
    }

    const pairs: AstPairNode[] = []

    while (current() && !is(TokenChar.objectEndToken)) {
      pairs.push(parsePair())
    }

    expectAndSkip(TokenChar.objectEndToken)

    return {
      type: 'object',
      pairs
    }
  }

  function parsePair (): AstPairNode {
    const key = parseIdent()

    if (!key) {
      throwUnexpected()
    }

    let value: AstPairNode['value']

    if (!is(TokenChar.objectPairSeparator)) {
      // Copy key node
      value = JSON.parse(JSON.stringify(key))
    } else {
      // Skip `:`
      next()

      value = (
        parseArray() ??
        parseObject() ??
        parseIdent()
      )

      if (!value) {
        throwWithCodeFrame(`Unexpected token: ${current()}`)
      }
    }

    return {
      type: 'pair',
      key,
      value
    }
  }

  function parseIdent (): AstIdentNode {
    const token = tokens[index]

    if (token?.type !== TokenType.ident) {
      return null
    }

    // Advance to next token
    next()

    return {
      type: 'ident',
      ident: (token.value as string).replace(TRIM_IDENTIFIER_REGEX, '')
    }
  }

  function expect (token: TokenChar) {
    if (current() == null || current() === '') {
      throw new ParserError('Unexpected EOF')
    }

    if (!is(token)) {
      throwWithCodeFrame(`Unexpected token. Expecting '${token}' but got: ${current()}`)
    }
  }

  function throwUnexpected () {
    throwWithCodeFrame(`Unexpected token: ${current()}`)
  }

  function expectAndSkip (token: TokenChar) {
    expect(token)
    next()
  }

  function throwWithCodeFrame (message: string) {
    throw new ParserError([
      null,
      `${generateCodeframe(tokens, index)}`,
      message
    ].join('\n\n'))
  }

  function ensureAndSkip (token: TokenChar) {
    if (!is(token)) {
      return false
    }

    return next()
  }

  function is (value: string) {
    return current() === value
  }

  function current () {
    return tokens[index]?.value
  }

  function next () {
    ++index

    return current()
  }
}
