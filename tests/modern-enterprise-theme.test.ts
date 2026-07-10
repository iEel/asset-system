import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const css = () => readFileSync("src/app/globals.css", "utf8")

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
