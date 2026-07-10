import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const css = () => readFileSync("src/app/globals.css", "utf8")
const assetRegister = () => readFileSync("src/components/assets/asset-register-table.tsx", "utf8")

function channel(value: number) {
  const normalized = value / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string) {
  const value = hex.replace("#", "")
  const [r, g, b] = [0, 2, 4].map((index) => channel(Number.parseInt(value.slice(index, index + 2), 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

function token(source: string, name: string) {
  const match = source.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6});`))
  assert.ok(match, `missing --${name} token`)
  return match[1]
}

function optionalToken(source: string, name: string) {
  return source.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6});`))?.[1]
}

function alphaBlend(foreground: string, background: string, alpha: number) {
  const foregroundValue = foreground.replace("#", "")
  const backgroundValue = background.replace("#", "")
  const channels = [0, 2, 4].map((index) => {
    const foregroundChannel = Number.parseInt(foregroundValue.slice(index, index + 2), 16)
    const backgroundChannel = Number.parseInt(backgroundValue.slice(index, index + 2), 16)
    return Math.round(foregroundChannel * alpha + backgroundChannel * (1 - alpha))
  })
  return `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`
}

test("modern enterprise tokens keep brand, action, and navigation roles separate", () => {
  const source = css()
  assert.match(source, /--brand-navy:\s*#0F172A;/)
  assert.match(source, /--brand-accent:\s*#3B82F6;/)
  assert.match(source, /--primary:\s*#2563EB;/)
  assert.match(source, /--sidebar:\s*#0F172A;/)
  assert.match(source, /--sidebar-foreground:\s*#CBD5E1;/)
  assert.match(source, /--sidebar-active:\s*#1E3A8A;/)
})

test("normal white action text meets WCAG AA contrast", () => {
  assert.ok(contrast("#FFFFFF", "#2563EB") >= 4.5)
  assert.ok(contrast("#FFFFFF", "#0F172A") >= 4.5)
  assert.ok(contrast("#FFFFFF", "#3B82F6") < 4.5, "electric blue must remain an accent, not the normal white-text button fill")
})

for (const tone of ["success", "warning", "danger", "info"] as const) {
  test(`${tone} badge foreground meets WCAG AA against its 10% tint`, () => {
    const source = css()
    const base = token(source, tone)
    const foreground = optionalToken(source, `${tone}-foreground`) ?? base
    const tintedBackground = alphaBlend(base, token(source, "surface"), 0.1)

    assert.ok(
      contrast(foreground, tintedBackground) >= 4.5,
      `${tone} badge contrast must be at least 4.5:1`,
    )
  })
}

test("muted badge foreground meets WCAG AA against the muted background", () => {
  const source = css()
  assert.ok(contrast(token(source, "muted-foreground"), token(source, "muted")) >= 4.5)
})

test("semantic badge foreground tokens are exposed to Tailwind and used by StatusPill", () => {
  const source = css()
  const register = assetRegister()

  for (const tone of ["success", "warning", "danger", "info"] as const) {
    assert.match(source, new RegExp(`--color-${tone}-foreground:\\s*var\\(--${tone}-foreground\\);`))
    assert.match(register, new RegExp(`bg-${tone}\\/10 text-${tone}-foreground`))
  }
  assert.match(register, /bg-muted text-muted-foreground/)
})
