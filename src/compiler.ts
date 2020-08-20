import { scan } from './lexer'
import {
  parse,
  AstArrayNode,
  AstElementNode,
  AstValueNode,
  AstIdentNode,
  AstObjectNode,
  AstRootNode
} from './parser'

export interface MockContext {
  [key: string]: any
}

export function createCompiler (context: MockContext) {
  return function compileMock (template: TemplateStringsArray, ...substitutions: any[]) {
    const input = String.raw(template, ...substitutions)
    const tokens = scan(input)
    const rootNode = parse(tokens)

    return compileRoot(rootNode)

    function compileRoot (node: AstRootNode) {
      switch (node.type) {
        case 'array': return compileArray(node)
        case 'object': return compileObject(node)
      }
    }

    function compileArray (node: AstArrayNode) {
      const result = []

      for (const element of node.elements) {
        result.push(...compileElement(element))   
      }

      return result
    }

    function compileElement (node: AstElementNode) {
      const values = []
      let count = typeof node.count !== 'number'
        ? compileIdent(node.count)
        : node.count

      while (count--) {
        values.push(
          compileValue(node.value)
        )
      }

      return values
    }

    function compileValue (node: AstValueNode) {
      switch (node.type) {
        case 'array': return compileArray(node)
        case 'object': return compileObject(node)
        case 'ident': return compileIdent(node)
      }
    }

    function compileObject (node: AstObjectNode) {
      const result = {}

      for (const pair of node.pairs) {
        result[pair.key.ident] = compileValue(pair.value)
      }

      return result
    }

    function compileIdent ({ ident }: AstIdentNode) {
      if (!(ident in context)) {
        throw new Error(`Unknown context identifier: ${ident}`)
      }

      const value = context[ident]

      return typeof value === 'function'
        ? value()
        : value
    }
  }
}