import {
  Token,
  TokenChar,
  TokenType,
  TokenLocation
} from './lexer'
import { generateCodeframe } from './codeframe'

export enum AstNodeType {
  Root = 'Root',
  Identifier = 'Identifier',
  Object = 'Object',
  Array = 'Array',
  Property = 'Property',
  Element = 'Element'
}

export interface AstNode {
  type: AstNodeType
  location: Token['location']
}

export interface AstPropertyNode extends AstNode {
  type: AstNodeType.Property
  key: AstIdentifierNode
  value: AstValueNode
}

export interface AstIdentifierNode extends AstNode {
  type: AstNodeType.Identifier
  name: string
}

export interface AstArrayNode extends AstNode {
  type: AstNodeType.Array
  elements: AstElementNode[]
}

export interface AstElementNode extends AstNode {
  type: AstNodeType.Element
  count: number | AstIdentifierNode
  value: AstValueNode
}

export interface AstObjectNode extends AstNode {
  type: AstNodeType.Object
  properties: AstPropertyNode[]
}

export interface AstRootNode extends AstNode {
  type: AstNodeType.Root
  value: AstObjectOrArrayNode
}

type AstObjectOrArrayNode = AstObjectNode | AstArrayNode
export type AstValueNode = AstObjectOrArrayNode | AstIdentifierNode

const TRIM_IDENTIFIER_REGEX = new RegExp(`^${TokenChar.identifierToken}|${TokenChar.identifierToken}$`)

class ParserError extends Error {
  name = 'ParserError'
}

export function parse (tokens: Token[]) {
  let index = 0

  return parseRoot()

  function parseRoot (): AstRootNode {
    const value: AstRootNode['value'] = (
      parseArray() ??
      parseObject()
    )

    if (!value) {
      throwUnexpected([
        TokenChar.arrayStartToken,
        TokenChar.objectStartToken
      ])
    }

    return {
      type: AstNodeType.Root,
      value,
      location: {
        start: { line: 1, column: 1 },
        end: clone(current().location.end)
      }
    }
  }

  function parseArray (): AstArrayNode {
    if (!is(TokenChar.arrayStartToken)) {
      return null
    }

    const startLocation: TokenLocation = clone(current().location.start)
    const elements: AstElementNode[] = []

    // Skip start token `[`
    next()

    while (current() && !is(TokenChar.arrayEndToken)) {
      elements.push(parseElement())
    }

    expect(TokenChar.arrayEndToken)

    const endLocation = clone(current().location.end)

    // Skip end token `]`
    next()

    return {
      type: AstNodeType.Array,
      elements,
      location: {
        start: startLocation,
        end: endLocation
      }
    }
  }

  function parseElement (): AstElementNode {
    let count: AstElementNode['count']
    let startLocation: TokenLocation

    if (!is(TokenChar.countStartToken)) {
      count = 1
    } else {
      startLocation = clone(current().location.start)

      // Skip leading count token `(`<-$count)
      next()

      const token = current()

      if (token.type === TokenType.countNumber) {
        count = token.value as number
        next()
      } else {
        count = parseIdentifier()

        if (!count) {
          throwUnexpected([TokenType.count])
        }
      }

      expect(TokenChar.countEndToken)

      // Skip trailing count token ($count->`)`
      next()
    }

    const value: AstElementNode['value'] = (
      parseArray() ??
      parseObject() ??
      parseIdentifier()
    )

    if (!value) {
      throwUnexpected([
        TokenChar.arrayStartToken,
        TokenChar.objectStartToken,
        TokenType.identifier
      ])
    }

    return {
      type: AstNodeType.Element,
      count,
      value,
      location: {
        start: startLocation ?? clone(value.location.start),
        end: clone(value.location.end)
      }
    }
  }

  function parseObject (): AstObjectNode {
    if (!is(TokenChar.objectStartToken)) {
      return null
    }

    const startLocation: TokenLocation = clone(current().location.start)
    const properties: AstPropertyNode[] = []

    // Skip start token `{`
    next()

    while (current() && !is(TokenChar.objectEndToken)) {
      properties.push(parseProperty())
    }

    expect(TokenChar.objectEndToken)

    const endLocation = clone(current().location.end)

    // Skip end token `}`
    next()

    return {
      type: AstNodeType.Object,
      properties,
      location: {
        start: startLocation,
        end: endLocation
      }
    }
  }

  function parseProperty (): AstPropertyNode {
    const key = parseIdentifier()

    if (!key) {
      throwUnexpected([TokenType.identifier])
    }

    let value: AstPropertyNode['value']

    if (!is(TokenChar.objectPairSeparator)) {
      // Copy key node
      value = deepClone(key)
    } else {
      // Skip `:`
      next()

      value = (
        parseArray() ??
        parseObject() ??
        parseIdentifier()
      )

      if (!value) {
        throwUnexpected([
          TokenChar.arrayStartToken,
          TokenChar.objectStartToken,
          TokenType.identifier
        ])
      }
    }

    return {
      type: AstNodeType.Property,
      key,
      value,
      location: {
        start: clone(key.location.start),
        end: clone(value.location.end)
      }
    }
  }

  function parseIdentifier (): AstIdentifierNode {
    const token = current()

    if (token.type !== TokenType.identifier) {
      return null
    }

    // Advance to next token
    next()

    return {
      type: AstNodeType.Identifier,
      name: (token.value as string).replace(TRIM_IDENTIFIER_REGEX, ''),
      location: deepClone(token.location)
    }
  }

  function expect (token: TokenChar) {
    if (current().type === TokenType.EOF) {
      throw new ParserError('Unexpected EOF')
    }

    if (!is(token)) {
      throwUnexpected([token])
    }
  }

  function throwUnexpected (expected?: string[]) {
    throwWithCodeFrame(
      `Unexpected token: ${current().value}` +
      (expected ? `. Expecting ${expected.join(', ')}` : '')
    )
  }

  function throwWithCodeFrame (message: string) {
    throw new ParserError([
      null,
      `${generateCodeframe(tokens, index)}`,
      message
    ].join('\n\n'))
  }

  function clone<T extends object> (obj: T): T {
    return { ...obj }
  }

  function deepClone<T extends object> (obj: T): T {
    return JSON.parse(
      JSON.stringify(
        obj
      )
    )
  }

  function is (value: string) {
    return current().value === value
  }

  function current () {
    return tokens[index]
  }

  function next () {
    ++index

    return current()
  }
}
