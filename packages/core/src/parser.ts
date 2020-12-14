import {
  Token,
  TokenChar,
  TokenType,
  TokenLocation
} from './lexer'
import { generateCodeframe } from './codeframe'
import {
  deepClone,
  shallowClone
} from './utils'

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

const TRIM_IDENTIFIER_REGEX = new RegExp(`^${TokenChar.identifierToken}|${TokenChar.identifierToken}$`, 'g')

export class ParserError extends Error {
  name = 'ParserError'
}

export class Parser {
  index = 0

  constructor (
    public tokens: Token[]) {}

  parse () {
    return this.parseRoot()
  }

  parseRoot (): AstRootNode {
    const value: AstRootNode['value'] = (
      this.parseArray() ??
      this.parseObject()
    )

    if (!value) {
      this.throwUnexpected([
        TokenChar.arrayStartToken,
        TokenChar.objectStartToken
      ])
    }

    return {
      type: AstNodeType.Root,
      value,
      location: {
        start: { line: 1, column: 1 },
        end: shallowClone(this.current().location.end)
      }
    }
  }

  parseArray (): AstArrayNode {
    if (!this.is(TokenChar.arrayStartToken)) {
      return null
    }

    const startLocation: TokenLocation = shallowClone(this.current().location.start)
    const elements: AstArrayNode['elements'] = []

    // Skip start token `[`
    this.next()

    while (this.current() && !this.is(TokenChar.arrayEndToken)) {
      elements.push(
        this.parseSpread() ??
        this.parseElement()
      )
    }

    this.expect(TokenChar.arrayEndToken)

    const endLocation = shallowClone(this.current().location.end)

    // Skip end token `]`
    this.next()

    return {
      type: AstNodeType.Array,
      elements,
      location: {
        start: startLocation,
        end: endLocation
      }
    }
  }

  parseElement (): AstElementNode {
    let count: AstElementNode['count']
    let startLocation: TokenLocation

    if (!this.is(TokenChar.countStartToken)) {
      count = 1
    } else {
      startLocation = shallowClone(this.current().location.start)

      // Skip leading count token `(`<-$count)
      this.next()

      const token = this.current()

      if (token.type === TokenType.countNumber) {
        count = token.value as number
        this.next()
      } else {
        count = this.parseIdentifier()

        if (!count) {
          this.throwUnexpected([TokenType.count])
        }
      }

      this.expect(TokenChar.countEndToken)

      // Skip trailing count token ($count->`)`
      this.next()
    }

    const value: AstElementNode['value'] = this.parseValue()

    if (!value) {
      this.throwUnexpectedValue()
    }

    return {
      type: AstNodeType.Element,
      count,
      value,
      location: {
        start: startLocation ?? shallowClone(value.location.start),
        end: shallowClone(value.location.end)
      }
    }
  }

  parseObject (): AstObjectNode {
    if (!this.is(TokenChar.objectStartToken)) {
      return null
    }

    const startLocation: TokenLocation = shallowClone(this.current().location.start)
    const properties: AstObjectNode['properties'] = []

    // Skip start token `{`
    this.next()

    while (this.current() && !this.is(TokenChar.objectEndToken)) {
      properties.push(
        this.parseSpread() ??
        this.parseProperty()
      )
    }

    expect(TokenChar.objectEndToken)

    const endLocation = shallowClone(this.current().location.end)

    // Skip end token `}`
    this.next()

    return {
      type: AstNodeType.Object,
      properties,
      location: {
        start: startLocation,
        end: endLocation
      }
    }
  }

  parseProperty (): AstPropertyNode {
    const key = this.parseIdentifier()

    if (!key) {
      this.throwUnexpectedIdentifier()
    }

    let value: AstPropertyNode['value']

    if (!this.is(TokenChar.objectPairSeparator)) {
      // Copy key node
      value = deepClone(key)
    } else {
      // Skip `:`
      this.next()

      if (!(value = this.parseValue())) {
        this.throwUnexpectedValue()
      }
    }

    return {
      type: AstNodeType.Property,
      key,
      value,
      location: {
        start: shallowClone(key.location.start),
        end: shallowClone(value.location.end)
      }
    }
  }

  parseSpread (): AstSpreadNode {
    const spreadToken = this.current()

    if (spreadToken.type !== TokenType.spread) {
      return null
    }

    // Skip spread token
    this.next()

    const identifier = this.parseIdentifier()

    if (!identifier) {
      this.throwUnexpectedIdentifier()
    }

    return {
      type: AstNodeType.Spread,
      identifier,
      location: {
        start: shallowClone(spreadToken.location.start),
        end: shallowClone(identifier.location.end)
      }
    }
  }

  parseTransform (transformer: AstIdentifierNode): AstIdentifierNode | AstTransformNode {
    if (!transformer || !this.is(TokenChar.transformToken)) {
      return transformer
    }

    // Skip transform token
    this.next()

    const value = this.parseValue()

    if (!value) {
      this.throwUnexpectedValue()
    }

    return {
      type: AstNodeType.Transform,
      transformer,
      value,
      location: {
        start: shallowClone(transformer.location.start),
        end: shallowClone(value.location.end)
      }
    }
  }

  parseIdentifier (): AstIdentifierNode {
    const identifier = this.current()

    if (identifier.type !== TokenType.identifier) {
      return null
    }

    // Advance to next token
    this.next()

    return {
      type: AstNodeType.Identifier,
      name: (identifier.value as string).replace(TRIM_IDENTIFIER_REGEX, ''),
      location: deepClone(identifier.location)
    }
  }

  parseValue (): AstValueNode {
    return (
      this.parseArray() ??
      this.parseObject() ??
      this.parseTransform(this.parseIdentifier())
    )
  }

  expect (token: TokenChar) {
    if (this.current().type === TokenType.EOF) {
      throw new ParserError('Unexpected EOF')
    }

    if (!this.is(token)) {
      this.throwUnexpected([
        token
      ])
    }
  }

  throwUnexpectedIdentifier () {
    this.throwUnexpected([
      TokenType.identifier
    ])
  }

  throwUnexpectedValue () {
    this.throwUnexpected([
      TokenChar.arrayStartToken,
      TokenChar.objectStartToken,
      TokenType.identifier
    ])
  }

  throwUnexpected (expected: string[]) {
    const token = this.current()

    this.throwWithCodeFrame(
      `Unexpected ${token.type === TokenType.EOF ? 'EOF' : `token: ${token.value}`}. Expecting ${expected.join(', ')}`
    )
  }

  throwWithCodeFrame (message: string) {
    throw new ParserError(
      [
        null,
        `${generateCodeframe(this.tokens, this.index)}`,
        message
      ].join('\n\n')
    )
  }

  is (value: string) {
    return this.current().value === value
  }

  current () {
    return this.tokens[this.index]
  }

  next () {
    ++this.index

    return this.current()
  }
}

export function parse (tokens: Token[]) {
  return new Parser(tokens).parse()
}
