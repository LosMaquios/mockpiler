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

type CompileMockArgs = Parameters<typeof String['raw']>

class RawValue {
  constructor (
    public raw: any) {}
}

const cleanUnwantedChars = (str: string) => str.replace(/\d+|=+$/g, '')

const toBase64 = typeof window === 'undefined'
  ? (str: any) => cleanUnwantedChars(Buffer.from(str.toString()).toString('base64'))
  : (str: any) => cleanUnwantedChars(btoa(str.toString()))

export class CompilerError extends Error {
  name = 'CompilerError'
}

export function raw (value: any) {
  return new RawValue(value)
}

export function createCompiler (...args: CompileMockArgs): object
export function createCompiler (context: MockContext): (...args: CompileMockArgs) => object
export function createCompiler (contextOrTemplateStrings: MockContext | TemplateStringsArray, ...values: any[]) {
  if (
    Array.isArray(contextOrTemplateStrings) && 
    contextOrTemplateStrings.hasOwnProperty('raw')
  ) {
    return compileMock(
      ...getTemplateAndContext(
        contextOrTemplateStrings as any,
        values
      )
    )
  }

  return (...[templateStrings, ...values]: CompileMockArgs) => {
    let [template, context] = getTemplateAndContext(templateStrings, values)

    // Merge contexts
    context = Object.assign({}, contextOrTemplateStrings, context)

    return compileMock(template, context)
  }
}

function getTemplateAndContext (templateStrings: TemplateStringsArray, values: any[]): [string, MockContext] {
  let template = templateStrings[0]
  const context: MockContext = {}
  const randomContextKey = toBase64(Math.random().toString().slice(2))

  values.forEach((value, index) => {
    if (value instanceof RawValue) {
      template += `${value.raw}${templateStrings[index + 1]}`
    } else {
      const contextKey = `__mockpiler__${randomContextKey}_${toBase64(index)}`

      context[contextKey] = value
      template += `${contextKey}${templateStrings[index + 1]}`
    }
  })

  return [
    template,
    context
  ]
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
    if (!(name in context)) {
      throw new CompilerError(`Unknown context identifier: ${name}`)
    }

    const value = context[name]

    return typeof value === 'function'
      ? value.call(context)
      : value
  }
}