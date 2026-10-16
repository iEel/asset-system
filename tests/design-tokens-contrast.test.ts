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
// WCAG 1.4.11: focus rings, field borders and meaningful icons need 3:1 against what they sit on.
const NON_TEXT = 3

function assertContrast(foreground: string, background: string | Rgb, minimum: number, label: string) {
  const backgroundColor = typeof background === "string" ? color(background) : background
  const ratio = contrastRatio(color(foreground), backgroundColor)
  assert.ok(ratio >= minimum, `${label}: ${ratio.toFixed(3)}:1 < ${minimum}:1`)
}

function assertAA(foreground: string, background: string | Rgb, label: string) {
  assertContrast(foreground, background, AA, label)
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
    for (const surface of ["background", "card", "muted", "accent", "canvas", "row-hover", `${tone}-soft`]) {
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
  assertAA("primary-foreground", "brand-navy", "primary-foreground on brand-navy")
  assertAA("primary", "primary-soft", "primary on primary-soft")
  assertAA("primary-hover", "primary-soft", "primary-hover on primary-soft")
  for (const surface of ["background", "muted", "accent", "canvas", "row-hover"]) {
    assertAA("primary", surface, `primary on ${surface}`)
  }
  assertAA("destructive-foreground", "destructive", "destructive-foreground on destructive")
})

test("neutral text pairs are AA", () => {
  for (const surface of ["background", "card", "popover", "muted", "accent", "canvas", "row-hover"]) {
    assertAA("foreground", surface, `foreground on ${surface}`)
    assertAA("muted-foreground", surface, `muted-foreground on ${surface}`)
  }
  // Toasts and notices keep a soft fill only for warning and danger; their title and body text sit on it.
  for (const surface of ["warning-soft", "danger-soft"]) {
    assertAA("foreground", surface, `foreground on ${surface}`)
    assertAA("muted-foreground", surface, `muted-foreground on ${surface}`)
  }
  assertAA("card-foreground", "card", "card-foreground on card")
  assertAA("popover-foreground", "popover", "popover-foreground on popover")
  assertAA("secondary-foreground", "secondary", "secondary-foreground on secondary")
  assertAA("accent-foreground", "accent", "accent-foreground on accent")
})

test("faint text is AA on every neutral surface, also on hovered and selected rows", () => {
  // Status soft fills are left out on purpose: faint text never sits on them (guard in tests/visual-foundation-guards.test.ts).
  for (const surface of ["background", "card", "popover", "muted", "accent", "canvas", "row-hover", "primary-soft"]) {
    assertAA("faint-foreground", surface, `faint-foreground on ${surface}`)
  }
})

test("the neutral badge marker is AA on every surface a badge sits on", () => {
  for (const surface of ["card", "background", "canvas", "muted", "accent", "row-hover"]) {
    assertAA("neutral-ink", surface, `neutral-ink on ${surface}`)
  }
})

test("light sidebar pairs are readable", () => {
  assertAA("sidebar-foreground", "sidebar", "sidebar-foreground on sidebar")
  assertAA("sidebar-foreground", "sidebar-hover", "sidebar-foreground on sidebar-hover")
  assertAA("sidebar-muted", "sidebar", "sidebar-muted on sidebar")
  assertAA("sidebar-active-foreground", "sidebar-active", "sidebar-active-foreground on sidebar-active")
  assertContrast("sidebar-active-icon", "sidebar-active", NON_TEXT, "sidebar-active-icon on sidebar-active")
  assertContrast("ring", "sidebar", NON_TEXT, "ring on sidebar")
})

test("focus ring and field borders reach 3:1 on the surfaces they sit on", () => {
  // primary-soft and danger-soft: the inset focus line of highlighted and destructive menu items.
  for (const surface of ["card", "background", "canvas", "muted", "row-hover", "primary-soft", "danger-soft"]) {
    assertContrast("ring", surface, NON_TEXT, `ring on ${surface}`)
  }
  // popover: the search box inside menus and SearchableSelect.
  for (const surface of ["card", "background", "canvas", "row-hover", "popover"]) {
    assertContrast("input", surface, NON_TEXT, `input on ${surface}`)
  }
})

test("roles that must look different stay different", () => {
  const value = (name: string) => resolveToken(tokens, name).toUpperCase()
  assert.notEqual(value("info"), value("primary"), "info must not reuse the primary color")
  assert.notEqual(value("canvas"), value("card"), "the page canvas must differ from panels")
  assert.notEqual(value("canvas"), value("background"), "the canvas must differ from field and dialog backgrounds")
  assert.notEqual(value("row-hover"), value("card"), "a hovered row must differ from the panel it sits in")
})

test("lines and text levels keep their order on a white panel", () => {
  // control-border is a decorative button outline (1.61:1), not a 3:1 field border: fields, checkboxes and drop zones keep --input.
  const onCard = (name: string) => contrastRatio(color(name), color("card"))
  const ordered = (names: string[]) => {
    for (let index = 1; index < names.length; index++) {
      const [lighter, darker] = [names[index - 1], names[index]]
      assert.ok(
        onCard(lighter) < onCard(darker),
        `${lighter} (${onCard(lighter).toFixed(2)}:1) must be lighter than ${darker} (${onCard(darker).toFixed(2)}:1)`,
      )
    }
  }
  ordered(["border-soft", "border", "control-border", "input"])
  ordered(["faint-foreground", "muted-foreground", "foreground"])
})

test("colors written out by hand in globals.css match their tokens", () => {
  const css = readFileSync("src/app/globals.css", "utf8").replace(/\r\n/g, "\n")
  const chevron = css.match(/@utility select-chevron \{[^}]*stroke='%23([0-9A-Fa-f]{6})'/)
  assert.ok(chevron, "the select-chevron stroke color was not found")
  assert.equal(`#${chevron[1]}`.toUpperCase(), resolveToken(tokens, "faint-foreground").toUpperCase(), "the select chevron is the faint ink")
  const halo = (name: string) => css.match(new RegExp(`--shadow-${name}: 0 0 0 4px rgb\\((\\d+ \\d+ \\d+) / 0\\.\\d+\\);`))?.[1]
  assert.equal(halo("field-focus"), color("ring").join(" "), "the focus halo is the ring color")
  assert.equal(halo("field-error"), color("danger").join(" "), "the error halo is the danger color")
})

test("every token is exposed to Tailwind through @theme inline", () => {
  const css = readFileSync("src/app/globals.css", "utf8")
  for (const name of Object.keys(tokens)) {
    if (name === "radius") continue
    assert.match(css, new RegExp(`--color-${name}:\\s*var\\(--${name}\\);`), `--color-${name} missing in @theme inline`)
  }
  assert.match(css, /--font-sans:\s*var\(--font-plex-sans\),\s*var\(--font-thai\),/)
  assert.match(css, /--font-mono:\s*var\(--font-plex-mono\),\s*ui-monospace/)
  assert.match(css, /@import "tw-animate-css";/)
  assert.doesNotMatch(css, /@custom-variant dark/)
})
