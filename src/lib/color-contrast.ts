export type Rgb = [number, number, number]

export function parseHexColor(value: string): Rgb {
  const hex = value.trim().replace(/^#/, "")
  if (!/^[0-9a-f]{6}$/i.test(hex)) throw new Error(`Unsupported color: ${value}`)
  return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)) as Rgb
}

function linearChannel(value: number) {
  const normalized = value / 255
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance([red, green, blue]: Rgb) {
  return 0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue)
}

export function contrastRatio(foreground: Rgb, background: Rgb) {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

export function mixOver(color: Rgb, alpha: number, background: Rgb = [255, 255, 255]): Rgb {
  return color.map((channel, index) => channel * alpha + background[index] * (1 - alpha)) as Rgb
}

export function readRootTokens(css: string): Record<string, string> {
  const block = css.match(/:root\s*\{([\s\S]*?)\}/)
  if (!block) throw new Error(":root block not found")
  const tokens: Record<string, string> = {}
  for (const match of block[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) tokens[match[1]] = match[2].trim()
  return tokens
}

// The trimmed declarations of the first rule whose selector is exactly `selector`, written at the start of a line (any
// indent, so a rule inside @media counts). The dark set and the forced-light scope are read this way.
export function readBlockDeclarations(css: string, selector: string): string[] {
  const source = css.replace(/\r\n/g, "\n")
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const block = source.match(new RegExp(`(?:^|\\n)[ \\t]*${escaped} \\{([^}]*)\\}`))
  if (!block) throw new Error(`${selector} block not found`)
  return block[1].split("\n").map((line) => line.trim()).filter(Boolean)
}

export function readBlockTokens(css: string, selector: string): Record<string, string> {
  const tokens: Record<string, string> = {}
  for (const declaration of readBlockDeclarations(css, selector)) {
    const match = declaration.match(/^--([\w-]+)\s*:\s*([^;]+);$/)
    if (match) tokens[match[1]] = match[2].trim()
  }
  return tokens
}

export const DARK_THEME_SELECTOR = ':root[data-theme="dark"]'

export function readDarkTokens(css: string): Record<string, string> {
  return readBlockTokens(css, DARK_THEME_SELECTOR)
}

export function resolveToken(tokens: Record<string, string>, name: string): string {
  const seen = new Set<string>()
  let current = name
  for (;;) {
    if (seen.has(current)) throw new Error(`Token cycle at --${current}`)
    seen.add(current)
    const value = tokens[current]
    if (value === undefined) throw new Error(`Token --${current} is missing`)
    const alias = value.match(/^var\(--([\w-]+)\)$/)
    if (!alias) return value
    current = alias[1]
  }
}
