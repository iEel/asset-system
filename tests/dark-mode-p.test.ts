import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { contrastRatio, parseHexColor, readRootTokens } from "../src/lib/color-contrast.ts"
import { readSourceFiles } from "./helpers/source-files.ts"

// Dark mode, area P (spec 2026-10-17 §4.4): paper keeps the light tokens through the data-theme="light" scope, photos and
// logos sit on a fixed light image stage, the bell's count dot takes the danger ink and the app icon gets a hairline
// frame that shows in dark only. One test per commit, each failing before its commit. Sources are read with LF endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

// The --name: value pairs of every innermost block of globals.css that declares the color set (the light :root block,
// the two dark copies, the forced-light scope and the print reset all declare --sidebar-border).
function tokenSets(css: string): Array<Record<string, string>> {
  return [...css.matchAll(/\{([^{}]*)\}/g)]
    .filter((block) => /(?:^|[\s;])--sidebar-border\s*:/.test(block[1]))
    .map((block) => Object.fromEntries([...block[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((pair) => [pair[1], pair[2].trim()])))
}

test("photos and logos get a fixed light image stage and the app icon a frame that shows in dark only (dark mode P-R1, P-R6)", () => {
  const css = read("src/app/globals.css")
  const light = readRootTokens(css)
  const STAGE = "#E9EEF5"
  const FRAME = { light: "#FFFFFF", dark: "#34496A" }
  assert.equal(light["image-stage"], STAGE, "the light value is the muted fill the thumbnail frames show today")
  assert.equal(light["app-icon-frame"], FRAME.light)
  assert.equal(light["app-icon-frame"], light.sidebar, "in light the frame is the sidebar color, so the sidebar looks as before")
  for (const name of ["image-stage", "app-icon-frame"]) {
    assert.match(css, new RegExp(`--color-${name}:\\s*var\\(--${name}\\);`), `--color-${name} in @theme inline`)
  }
  // Each block that declares the color set declares both tokens: the light value where the block holds the light
  // canvas (the light block, the forced-light scope, the print reset), the dark value in the two dark copies.
  const sets = tokenSets(css)
  assert.ok(sets.length >= 4, `${sets.length} token blocks`)
  for (const set of sets) {
    const theme = set.canvas === light.canvas ? "light" : "dark"
    assert.equal(set["image-stage"], STAGE, `image-stage in a ${theme} block`)
    assert.equal(set["app-icon-frame"], FRAME[theme], `app-icon-frame in a ${theme} block`)
  }
  const dark = sets.find((set) => set.canvas !== light.canvas)
  assert.ok(dark, "a dark block")
  for (const opener of [':root[data-theme="dark"] {', ':root:not([data-theme="light"]) {', '[data-theme="light"] {']) {
    const at = css.indexOf(opener)
    assert.ok(at > 0, opener)
    assert.match(css.slice(at, css.indexOf("}", at)), /--image-stage: #E9EEF5;/, opener)
  }
  const ratio = (a: string, b: string) => contrastRatio(parseHexColor(a), parseHexColor(b))
  // The stage stays light in both themes: dark ink in a see-through logo keeps more than 12:1 on it.
  assert.ok(ratio(STAGE, light.foreground) >= 12)
  // In dark the hairline separates the near-white icon tile (253 253 254) from the sidebar and the login page.
  for (const surface of ["sidebar", "background"]) {
    assert.ok(ratio(FRAME.dark, dark[surface]) >= 1.5, `the frame on the dark ${surface}: ${ratio(FRAME.dark, dark[surface]).toFixed(2)}:1`)
  }
  assert.ok(ratio(FRAME.dark, "#FDFDFE") >= 3, "the frame against the icon tile")
})

const C = "src/components/"
const sources = readSourceFiles("src")

test("the A4 paper is a forced-light scope, so its void banner keeps the light danger tokens on a dark page (dark mode P-R2)", () => {
  const source = read(`${C}asset-operations/operation-document-print.tsx`)
  const paper = source.match(/<div data-theme="light" className="operation-print-page \[--text-sm--line-height:calc\(20\/14\)\] relative mx-auto max-w-5xl overflow-hidden rounded-md border border-slate-300 bg-white p-8 text-slate-950 shadow-sm">/)
  assert.ok(paper, "the paper div carries the scope; its classes stay")
  const paperAt = source.indexOf(paper[0])
  assert.ok(source.indexOf('<div className="operation-print-toolbar') < paperAt, "the toolbar above the paper follows the theme")
  assert.ok(source.indexOf("<VoidDocumentBanner info={voidInfo} />") > paperAt, "the void banner renders inside the paper")
  assert.equal(source.match(/data-theme=/g)?.length, 1)
  // The banner keeps its tokens; the scope is what keeps them light. Nothing else renders it.
  const banner = read(`${C}asset-operations/void-document-banner.tsx`)
  assert.match(banner, /className="mb-6 break-inside-avoid rounded-md border border-danger-border bg-danger-soft p-4 text-danger"/)
  assert.doesNotMatch(banner, /data-theme|\b(?:bg|text|border)-(?:white|black|slate-\d+|red-\d+)\b/)
  assert.deepEqual(sources.filter((file) => file.source.includes("<VoidDocumentBanner")).map((file) => file.path), [`${C}asset-operations/operation-document-print.tsx`])
})

test("the label sheet and the settings label sample are forced-light scopes, so labels look printed on a dark page (dark mode P-R3)", () => {
  const print = read(`${C}assets/asset-label-print.tsx`)
  const sheet = print.match(/<div data-theme="light" className="asset-label-sheet [^"]*">/)
  assert.ok(sheet, "the sheet carries the scope")
  assert.match(sheet[0], / rounded-md bg-white p-3 text-slate-950 /, "its own paper colors stay")
  const sheetAt = print.indexOf(sheet[0])
  assert.ok(print.indexOf('<div className="asset-label-toolbar') < sheetAt, "the toolbar and its notices follow the theme")
  assert.ok(print.indexOf('<section className="asset-label-title') < sheetAt, "so does the title")
  assert.ok(print.indexOf("<AssetLabelItem") > sheetAt, "every label sits on the sheet")
  assert.equal(print.match(/data-theme=/g)?.length, 1)
  // The sample keeps its tokens (no raw colors, no N1 row): inside the scope they are the light ones, so the QR box, the
  // label body and its lines look as they do in light today; the panel around the sample follows the theme.
  const settings = read(`${C}admin/system-settings-form.tsx`)
  const preview = settings.slice(settings.indexOf("function LabelPreviewPanel("))
  assert.match(preview, /<div\n\s+data-theme="light"\n\s+className="overflow-hidden rounded border border-control-border bg-surface text-foreground[^"]*"\n\s+style=\{\{ width: widthPx, height: heightPx, padding: marginPx \}\}\n\s+>/)
  assert.match(preview, /<div className="shrink-0 rounded-sm border border-control-border bg-surface p-1">\n\s+<QRCodeSVG /)
  assert.match(preview, /<div className="rounded-md border border-border bg-background p-3">\n\s+<div className="text-sm font-semibold text-foreground">\{labels\.labelPreview\}<\/div>/)
  assert.equal(settings.match(/data-theme=/g)?.length, 1)
  // bg-surface reads --surface, an alias of --card that the scope must declare again: declared on :root only, it would
  // keep the dark card inside the sample (a custom property resolves where it is declared).
  const css = read("src/app/globals.css")
  const scope = css.slice(css.indexOf('[data-theme="light"] {'))
  assert.match(scope.slice(0, scope.indexOf("}")), /--surface: var\(--card\);/)
})
