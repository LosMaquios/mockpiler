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
  Spread = 'Spread',
  Transform = 'Tranform',
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
  elements: Array<AstSpreadNode | AstElementNode>
}

export interface AstElementNode extends AstNode {
  type: AstNodeType.Element
  count: number | AstIdentifierNode
  value: AstValueNode
}

export interface AstObjectNode extends AstNode {
  type: AstNodeType.Object
  properties: Array<AstSpreadNode | AstPropertyNode>
}

export interface AstRootNode extends AstNode {
  type: AstNodeType.Root
  value: AstObjectOrArrayNode
}

export interface AstSpreadNode extends AstNode {
  type: AstNodeType.Spread
  identifier: AstIdentifierNode
}

export interface AstTransformNode extends AstNode {
  type: AstNodeType.Transform
  transformer: AstIdentifierNode
  value: AstValueNode
}

type AstObjectOrArrayNode = AstObjectNode | AstArrayNode
export type AstValueNode = AstObjectOrArrayNode | AstIdentifierNode | AstTransformNode

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
    const elements: AstArrayNode['elements'] = []

    // Skip start token `[`
    next()

    while (current() && !is(TokenChar.arrayEndToken)) {
      elements.push(
        parseSpread() ??
        parseElement()
      )
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

    const value: AstElementNode['value'] = parseValue()

    if (!value) {
      throwUnexpectedValue()
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
    const properties: AstObjectNode['properties'] = []

    // Skip start token `{`
    next()

    while (current() && !is(TokenChar.objectEndToken)) {
      properties.push(
        parseSpread() ??
        parseProperty()
      )
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
      throwUnexpectedIdentifier()
    }

    let value: AstPropertyNode['value']

    if (!is(TokenChar.objectPairSeparator)) {
      // Copy key node
      value = deepClone(key)
    } else {
      // Skip `:`
      next()

      if (!(value = parseValue())) {
        throwUnexpectedValue()
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

  function parseSpread (): AstSpreadNode {
    const spreadToken = current()

    if (spreadToken.type !== TokenType.spread) {
      return null
    }

    // Skip spread token
    next()

    const identifier = parseIdentifier()

    if (!identifier) {
      throwUnexpectedIdentifier()
    }

    return {
      type: AstNodeType.Spread,
      identifier,
      location: {
        start: clone(spreadToken.location.start),
        end: clone(identifier.location.end)
      }
    }
  }

  function parseTransform (transformer: AstIdentifierNode): AstIdentifierNode | AstTransformNode {
    if (!transformer || !is(TokenChar.transformToken)) {
      return transformer
    }

    // Skip transform token
    next()

    const value = parseValue()

    if (!value) {
      throwUnexpectedValue()
    }

    return {
      type: AstNodeType.Transform,
      transformer,
      value,
      location: {
        start: clone(transformer.location.start),
        end: clone(value.location.end)
      }
    }
  }

  function parseIdentifier (): AstIdentifierNode {
    const identifier = current()

    if (identifier.type !== TokenType.identifier) {
      return null
    }

    // Advance to next token
    next()

    return {
      type: AstNodeType.Identifier,
      name: (identifier.value as string).replace(TRIM_IDENTIFIER_REGEX, ''),
      location: deepClone(identifier.location)
    }
  }

  function parseValue (): AstValueNode {
    return (
      parseArray() ??
      parseObject() ??
      parseTransform(parseIdentifier())
    )
  }

  function expect (token: TokenChar) {
    if (current().type === TokenType.EOF) {
      throw new ParserError('Unexpected EOF')
    }

    if (!is(token)) {
      throwUnexpected([
        token
      ])
    }
  }

  function throwUnexpectedIdentifier () {
    throwUnexpected([
      TokenType.identifier
    ])
  }

  function throwUnexpectedValue () {
    throwUnexpected([
      TokenChar.arrayStartToken,
      TokenChar.objectStartToken,
      TokenType.identifier
    ])
  }

  function throwUnexpected (expected: string[]) {
    const token = current()

    throwWithCodeFrame(
      `Unexpected ${token.type === TokenType.EOF ? 'EOF' : `token: ${token.value}`}. Expecting ${expected.join(', ')}`
    )
  }

  function throwWithCodeFrame (message: string) {
    throw new ParserError(
      [
        null,
        `${generateCodeframe(tokens, index)}`,
        message
      ].join('\n\n')
    )
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
