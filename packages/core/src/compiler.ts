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
  AstSpreadNode,
  AstTransformNode
} from './parser'
import {
  MockContextInput,
  MockContext,
  getTemplateAndRootContext,
  getContextAccessor,
  unknownIdent
} from './context'
import { TransformFn } from './transformer'

export type CompileMockArgs = Parameters<typeof String['raw']>

export class CompilerError extends Error {
  name = 'CompilerError'
}

const EMPTY_CONTEXT = Object.create(null)

export type CompileMockFn = (...args: CompileMockArgs) => any

export function createCompiler (contextOrAccessor: MockContextInput): CompileMockFn
export function createCompiler (...args: Parameters<CompileMockFn>): ReturnType<CompileMockFn>
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

export class Compiler {
  constructor (
    public input: string,
    public context: MockContext
  ) {}

  compile () {
    const tokens = scan(this.input)
    const rootNode = parse(tokens)

    return this.compileRoot(rootNode)
  }

  compileRoot<T extends AstRootNode> ({ value }: T): any {
    return value.type === AstNodeType.Array
      ? this.compileArray(value)
      : this.compileObject(value)
  }

  compileArray (node: AstArrayNode): any[] {
    const result = []

    for (const element of node.elements) {
      if (element.type === AstNodeType.Spread) {
        this.compileElementSpread(element, result)
      } else {
        this.compileElement(element, result)
      }
    }

    return result
  }

  compileElementSpread (node: AstSpreadNode, parent: any[]) {
    const result = this.compileIdent(node.identifier)

    for (const value of result) {
      parent.push(value)
    }
  }

  compileElement (node: AstElementNode, parent: any[]) {
    let count = typeof node.count !== 'number'
      ? this.compileIdent(node.count)
      : node.count

    while (count--) {
      parent.push(
        this.compileValue(node.value)
      )
    }
  }

  compileObject (node: AstObjectNode): Record<string, any> {
    const result = {}

    for (const property of node.properties) {
      if (property.type === AstNodeType.Spread) {
        this.compilePropertySpread(property, result)
      } else {
        result[property.key.name] = this.compileValue(property.value)
      }
    }

    return result
  }

  compilePropertySpread (node: AstSpreadNode, parent: object) {
    const result = this.compileIdent(node.identifier)

    for (const key of Object.keys(result)) {
      parent[key] = result[key]
    }
  }

  compileValue (node: AstValueNode) {
    switch (node.type) {
      case AstNodeType.Array: {
        return this.compileArray(node)
      }

      case AstNodeType.Object: {
        return this.compileObject(node)
      }

      case AstNodeType.Identifier: {
        return this.compileIdent(node)
      }

      case AstNodeType.Transform: {
        return this.compileTransform(node)
      }
    }
  }

  compileIdent ({ name }: AstIdentifierNode, shouldCompileFn = true) {
    const value = this.context[name]

    if (value === unknownIdent) {
      throw new CompilerError(`Unknown context identifier: ${name}`)
    }

    return typeof value === 'function' && shouldCompileFn
      ? value.call(this.context)
      : value
  }

  compileTransform (node: AstTransformNode) {
    const transformFn: TransformFn = this.compileIdent(node.transformer, false)
    const value = this.compileValue(node.value)

    return transformFn(value)
  }
}

export function compileMock (input: string, context: MockContext) {
  return new Compiler(input, context).compile()
}
