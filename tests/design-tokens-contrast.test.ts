import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  contrastRatio,
  mixOver,
  parseHexColor,
  readRootTokens,
  resolveToken,
  type Rgb,
} from "../src/lib/color-contrast.ts"

const tokens = readRootTokens(readFileSync("src/app/globals.css", "utf8"))
const color = (name: string) => parseHexColor(resolveToken(tokens, name))
const white = parseHexColor("#FFFFFF")
const AA = 4.5

function assertAA(foreground: string, background: string | Rgb, label: string) {
  const backgroundColor = typeof background === "string" ? color(background) : background
  const ratio = contrastRatio(color(foreground), backgroundColor)
  assert.ok(ratio >= AA, `${label}: ${ratio.toFixed(3)}:1 < 4.5:1`)
}

test("contrast helpers match WCAG reference values", () => {
  assert.equal(contrastRatio(parseHexColor("#000000"), white).toFixed(2), "21.00")
  assert.equal(contrastRatio(parseHexColor("#F59E0B"), white).toFixed(2), "2.15")
  assert.deepEqual(mixOver(parseHexColor("#000000"), 0.5), [127.5, 127.5, 127.5])
  assert.throws(() => parseHexColor("red"), /Unsupported color/)
})

test("resolveToken follows var() aliases and rejects cycles", () => {
  assert.equal(resolveToken({ a: "var(--b)", b: "#123456" }, "a"), "#123456")
  assert.throws(() => resolveToken({ a: "var(--a)" }, "a"), /cycle/)
  assert.throws(() => resolveToken({}, "nope"), /missing/)
})

for (const tone of ["success", "warning", "danger", "info"] as const) {
  test(`${tone} text is AA on every surface it sits on`, () => {
    assertAA(tone, white, `${tone} on white`)
    for (const surface of ["background", "card", "muted", `${tone}-soft`]) {
      assertAA(tone, surface, `${tone} on ${surface}`)
    }
  })

  test(`${tone} solid and hover fills keep their foreground AA`, () => {
    assertAA(`${tone}-foreground`, tone, `${tone}-foreground on ${tone}`)
    assertAA(`${tone}-foreground`, `${tone}-hover`, `${tone}-foreground on ${tone}-hover`)
  })
}

test("primary and destructive pairs are AA", () => {
  assertAA("primary-foreground", "primary", "primary-foreground on primary")
  assertAA("primary-foreground", "primary-hover", "primary-foreground on primary-hover")
  assertAA("primary", "primary-soft", "primary on primary-soft")
  assertAA("primary", "background", "primary on background")
  assertAA("destructive-foreground", "destructive", "destructive-foreground on destructive")
})

test("neutral text pairs are AA", () => {
  for (const surface of ["background", "card", "popover", "muted"]) {
    assertAA("foreground", surface, `foreground on ${surface}`)
    assertAA("muted-foreground", surface, `muted-foreground on ${surface}`)
  }
  assertAA("card-foreground", "card", "card-foreground on card")
  assertAA("popover-foreground", "popover", "popover-foreground on popover")
  assertAA("secondary-foreground", "secondary", "secondary-foreground on secondary")
  assertAA("accent-foreground", "accent", "accent-foreground on accent")
})

test("every token is exposed to Tailwind through @theme inline", () => {
  const css = readFileSync("src/app/globals.css", "utf8")
  for (const name of Object.keys(tokens)) {
    if (name === "radius") continue
    assert.match(css, new RegExp(`--color-${name}:\\s*var\\(--${name}\\);`), `--color-${name} missing in @theme inline`)
  }
  assert.match(css, /--font-sans:\s*var\(--font-inter\),\s*var\(--font-thai\)/)
  assert.match(css, /@import "tw-animate-css";/)
  assert.doesNotMatch(css, /@custom-variant dark/)
})
