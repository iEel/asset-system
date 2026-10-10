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

test("modern enterprise tokens keep brand, action, and navigation roles separate", () => {
  const source = css()
  assert.notEqual(token(source, "primary"), token(source, "brand-navy"), "actions use their own blue, not the logo navy")
  assert.equal(token(source, "sidebar-active"), token(source, "brand-navy"), "the selected menu row carries the logo navy")
  assert.equal(token(source, "sidebar-active-icon"), token(source, "brand-accent"), "the selected menu icon carries the logo teal")
  assert.equal(token(source, "sidebar"), token(source, "card"), "the light-shell sidebar is a white surface")
  assert.notEqual(token(source, "info"), token(source, "primary"), "info has its own teal ink")
})

test("normal white action text meets WCAG AA contrast", () => {
  const source = css()
  assert.ok(contrast("#FFFFFF", token(source, "primary")) >= 4.5)
  assert.ok(contrast("#FFFFFF", token(source, "brand-navy")) >= 4.5)
  assert.ok(
    contrast("#FFFFFF", token(source, "brand-accent")) < 4.5,
    "the teal brand accent is for icons and focus, never a white-text fill",
  )
})

test("muted badge foreground meets WCAG AA against the muted background", () => {
  const source = css()
  assert.ok(contrast(token(source, "muted-foreground"), token(source, "muted")) >= 4.5)
})

test("semantic soft tokens are exposed to Tailwind; only statuses that need action use them in badges", () => {
  const source = css()
  const badges = readFileSync("src/components/ui/badge-variants.ts", "utf8")

  for (const tone of ["success", "warning", "danger", "info"] as const) {
    assert.match(source, new RegExp(`--color-${tone}-soft:\\s*var\\(--${tone}-soft\\);`))
  }
  for (const tone of ["warning", "danger"] as const) {
    assert.match(badges, new RegExp(`bg-${tone}-soft text-${tone}`))
  }
  assert.match(badges, /border-transparent text-muted-foreground/)
  assert.match(assetRegister(), /<StatusBadge\b/)
})
