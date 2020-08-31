import { Token } from './lexer'

const PADDING_CHAR = ' '
const INDICATOR_CHAR = '^'
const MAX_LINES = 4

class CodeframeBuffer {
  private linesBuffer: { [line: number]: string } = {}

  constructor (
    private minLine: number,
    private maxLine: number) {}

  hasLine (line: number) {
    return line in this.linesBuffer
  }

  addLine (line: number, ...values: any[]) {
    this.linesBuffer[line] = values.join('')
  }

  prependToLine (line: number, ...values: any[]) {
    this.linesBuffer[line] = values.join('') + this.linesBuffer[line]
  }

  appendToLine (line: number, ...values: any[]) {
    this.linesBuffer[line] += values.join('')
  }

  getFormattedOutput (highlightLocation: Token['location']) {
    const formattedCode = []
    const maxLineLength = String(this.maxLine).length

    for (let line = this.minLine; line <= this.maxLine; line++) {
      const lineIndicator = `${getPadding(maxLineLength - String(line).length)}${line}|`

      formattedCode.push(lineIndicator + (this.linesBuffer[line] ?? ''))

      if (line === highlightLocation.start.line) {
        formattedCode.push(
          `${getPadding(maxLineLength)}|${getPadding(highlightLocation.start.column - 1)}` +
          getLineIndicator(highlightLocation.end.column - highlightLocation.start.column)
        )
      }
    }

    return formattedCode.join('\n')
  }
}

export function generateCodeframe (
  tokens: Token[], 
  highlightTokenIndex: number
) {
  const { location: highlightLocation, value: highlightValue } = tokens[highlightTokenIndex]
  const MIN_LINE = Math.max(highlightLocation.start.line - MAX_LINES, 1)
  const MAX_LINE = Math.min(
    highlightLocation.start.line + MAX_LINES, 
    tokens[tokens.length - 1].location.start.line
  )

  const buffer = new CodeframeBuffer(MIN_LINE, MAX_LINE)

  buffer.addLine(highlightLocation.start.line, highlightValue)

  let upperIndex = highlightTokenIndex - 1
  let lowerIndex = highlightTokenIndex + 1

  let upperToken: Token
  let lowerToken: Token

  let prevUpperTokenStartLocation = highlightLocation.start
  let prevLowerTokenEndLocation = highlightLocation.end

  /**
   * Build upper code block
   */
  while (
    upperIndex >= 0 &&
    (upperToken = tokens[upperIndex--]).location.start.line >= MIN_LINE
  ) {
    const { value, location: { start, end } } = upperToken

    if (buffer.hasLine(start.line)) {
      buffer.prependToLine(
        start.line, 
        value, 
        getPadding(prevUpperTokenStartLocation.column - end.column)
      )
    } else {
      buffer.addLine(start.line, value)
      buffer.prependToLine(
        prevUpperTokenStartLocation.line, 
        getPadding(prevUpperTokenStartLocation.column - 1)
      )
    }

    prevUpperTokenStartLocation = start
  }

  buffer.prependToLine(
    prevUpperTokenStartLocation.line, 
    getPadding(prevUpperTokenStartLocation.column - 1)
  )

  /**
   * Build lower code block
   */
  while (
    lowerIndex < tokens.length &&
    (lowerToken = tokens[lowerIndex++]).location.start.line <= MAX_LINE
  ) {
    const { value, location: { start, end } } = lowerToken

    if (!buffer.hasLine(start.line)) {
      buffer.addLine(start.line, getPadding(start.column - 1), value)
    } else {
      buffer.appendToLine(
        start.line, 
        getPadding(start.column - prevLowerTokenEndLocation.column), 
        value
      )
    }

    prevLowerTokenEndLocation = end
  }

  return buffer.getFormattedOutput(highlightLocation)
}

function getLineIndicator (size: number) {
  return INDICATOR_CHAR.repeat(size)
}

function getPadding (size: number) {
  return PADDING_CHAR.repeat(size)
}
