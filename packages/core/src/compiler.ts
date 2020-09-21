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
import {
  MockContextInput,
  MockContext,
  getTemplateAndRootContext,
  getContextAccessor,
  unknownIdent
} from './context'

export type CompileMockArgs = Parameters<typeof String['raw']>

export class CompilerError extends Error {
  name = 'CompilerError'
}

const EMPTY_CONTEXT = Object.create(null)

export function createCompiler (contextOrAccessor: MockContextInput): (...args: CompileMockArgs) => object
export function createCompiler (...args: CompileMockArgs): object
export function createCompiler (input: MockContextInput | TemplateStringsArray, ...values: any[]) {
  return Array.isArray(input) && input.hasOwnProperty('raw') 
    ? compileMockWithContext(input as any, values, EMPTY_CONTEXT)
    : (...[templateStrings, ...values]: CompileMockArgs) => compileMockWithContext(
        templateStrings,
        values,
        input
      )

  function compileMockWithContext (
    templateStrings: TemplateStringsArray,
    values: any[],
    contextOrAccessor: MockContextInput
  ) {
    return compileMock(
      ...getTemplateAndRootContext(
        templateStrings,
        values,
        getContextAccessor(contextOrAccessor)
      )
    )
  }
}

function compileMock (input: string, context: MockContext) {
  const tokens = scan(input)
  const rootNode = parse(tokens)

  return compileRoot(rootNode)

  function compileRoot ({ value }: AstRootNode) {
    return value.type === AstNodeType.Array
      ? compileArray(value)
      : compileObject(value)
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
      case AstNodeType.Array:
        return compileArray(node)

      case AstNodeType.Object:
        return compileObject(node)

      case AstNodeType.Identifier:
        return compileIdent(node)
    }
  }

  function compileIdent ({ name }: AstIdentifierNode) {
    const value = context[name]

    if (value === unknownIdent) {
      throw new CompilerError(`Unknown context identifier: ${name}`)
    }

    return typeof value === 'function'
      ? value.call(context)
      : value
  }
}