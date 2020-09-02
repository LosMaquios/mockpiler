import { scan } from './lexer'
import {
  parse,
  AstArrayNode,
  AstElementNode,
  AstValueNode,
  AstIdentifierNode,
  AstObjectNode,
  AstRootNode,
  AstNodeType,
  AstSpreadNode
} from './parser'

export interface MockContext {
  [key: string]: any
}

export function createCompiler (context: MockContext) {
  return function compileMock (...args: Parameters<typeof String['raw']>) {
    const input = String.raw(...args)
    const tokens = scan(input)
    const rootNode = parse(tokens)

    return compileRoot(rootNode)

    function compileRoot (node: AstRootNode) {
      switch (node.value.type) {
        case AstNodeType.Array: return compileArray(node.value)
        case AstNodeType.Object: return compileObject(node.value)
      }
    }

    function compileArray (node: AstArrayNode) {
      const result = []

      for (const element of node.elements) {
        if (element.type === AstNodeType.Spread) {
          compileElementSpread(element, result)
        } else {
          compileElement(element, result)
        }
      }

      return result
    }

    function compileElementSpread (node: AstSpreadNode, values: any[]) {
      const result = compileIdent(node.identifier)

      for (const value of result) {
        values.push(value)
      }
    }

    function compileElement (node: AstElementNode, values: any[]) {
      let count = typeof node.count !== 'number'
        ? compileIdent(node.count)
        : node.count

      while (count--) {
        values.push(
          compileValue(node.value)
        )
      }
    }

    function compileObject (node: AstObjectNode) {
      const result = {}

      for (const property of node.properties) {
        if (property.type === AstNodeType.Spread) {
          compilePropertySpread(property, result)
        } else {
          result[property.key.name] = compileValue(property.value)
        }
      }

      return result
    }

    function compilePropertySpread (node: AstSpreadNode, values: object) {
      const result = compileIdent(node.identifier)

      for (const key of Object.keys(result)) {
        values[key] = result[key]
      }
    }

    function compileValue (node: AstValueNode) {
      switch (node.type) {
        case AstNodeType.Array: return compileArray(node)
        case AstNodeType.Object: return compileObject(node)
        case AstNodeType.Identifier: return compileIdent(node)
      }
    }

    function compileIdent ({ name }: AstIdentifierNode) {
      if (!(name in context)) {
        throw new Error(`Unknown context identifier: ${name}`)
      }

      const value = context[name]

      return typeof value === 'function'
        ? value.call(context)
        : value
    }
  }
}