import { Token } from './lexer'

const PADDING_CHAR = ' '
const INDICATOR_CHAR = '^'
const MAX_LINES = 4

export function generateCodeframe (
  tokens: Token[], 
  highlightTokenIndex: number
) {
  const highlightToken = tokens[highlightTokenIndex]
  const code = {
    [highlightToken.location.start.line]: highlightToken.value
  }

  const MIN_LINE = Math.max(highlightToken.location.start.line - MAX_LINES, 1)
  const MAX_LINE = Math.min(
    highlightToken.location.start.line + MAX_LINES, 
    tokens[tokens.length - 1].location.start.line
  )
  
  let upperIndex = highlightTokenIndex - 1
  let lowerIndex = highlightTokenIndex + 1
  
  let upperToken: Token
  let lowerToken: Token

  let prevUpperTokenStartLocation = highlightToken.location.start
  let prevLowerTokenEndLocation = highlightToken.location.end

  /**
   * Build upper code block
   */
  while (
    upperIndex >= 0 && 
    (upperToken = tokens[upperIndex]).location.start.line >= MIN_LINE
  ) {
    const { value, location: { start, end } } = upperToken

    if (!code[start.line]) {
      code[start.line] = value
      code[prevUpperTokenStartLocation.line] = `${getPadding(prevUpperTokenStartLocation.column - 1)}${code[prevUpperTokenStartLocation.line]}`
    } else {
      code[start.line] = `${value}${getPadding(prevUpperTokenStartLocation.column - end.column)}${code[start.line]}`
    }

    prevUpperTokenStartLocation = start
    upperIndex--
  }

  code[prevUpperTokenStartLocation.line] = `${getPadding(prevUpperTokenStartLocation.column - 1)}${code[prevUpperTokenStartLocation.line]}`

  /**
   * Build lower code block
   */
  while ((lowerToken = tokens[lowerIndex++]) && lowerToken.location.start.line <= MAX_LINE) {
    const { value, location: { start, end } } = lowerToken

    if (!code[start.line]) {
      code[start.line] = `${getPadding(start.column - 1)}${value}`
    } else {
      code[start.line] += `${getPadding(start.column - prevLowerTokenEndLocation.column)}${value}`
    }

    prevLowerTokenEndLocation = end
  }

  const formattedCode = []
  const maxLineLength = String(MAX_LINE).length

  for (let line = MIN_LINE; line <= MAX_LINE; line++) {
    const lineIndicator = `${getPadding(maxLineLength - String(line).length)}${line}|`

    if (!code[line]) {
      formattedCode.push(lineIndicator)
    } else {
      formattedCode.push(`${lineIndicator}${code[line]}`)
    }

    if (line === highlightToken.location.start.line) {
      formattedCode.push(`${
        getPadding(highlightToken.location.start.column + maxLineLength)
      }${
        getLineIndicator(highlightToken.location.end.column - highlightToken.location.start.column)
      }`)
    }
  }

  return formattedCode.join('\n')
}

function getLineIndicator (size: number) {
  return INDICATOR_CHAR.repeat(size)
}

function getPadding (size: number) {
  return PADDING_CHAR.repeat(size)
}
