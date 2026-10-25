import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { contrastRatio, parseHexColor, readRootTokens } from "../src/lib/color-contrast.ts"
import { findJsxTags, jsxAttrValue, readSourceFiles } from "./helpers/source-files.ts"

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
  assert.equal(light["app-icon-frame"], light.card, "in light the frame is white like the icon tile, so it does not show")
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

// The forced-light scope sits on paper only (spec §4.4): the A4 sheet, the label sheet, the settings label sample and
// the signature canvas. No part forces dark; the attribute on <html> is the root layout's expression, not a literal.
const LIGHT_SCOPES: Record<string, number> = {
  [`${C}admin/system-settings-form.tsx`]: 1,
  [`${C}asset-operations/operation-document-print.tsx`]: 1,
  [`${C}asset-operations/signature-pad.tsx`]: 1,
  [`${C}assets/asset-label-print.tsx`]: 1,
}

test("the signature canvas is a forced-light scope, and the scope sits on paper only (dark mode P-R4, P-R5)", () => {
  const source = read(`${C}asset-operations/signature-pad.tsx`)
  assert.match(source, /<canvas\n\s+ref=\{canvasRef\}\n\s+data-theme="light"\n/)
  // The PNG it exports does not change: a white fill, the same stroke, cleared to white.
  assert.match(source, /context\.strokeStyle = "#0f172a"/)
  assert.equal(source.match(/context\.fillStyle = "#ffffff"/g)?.length, 2)
  assert.match(source, /onChange\(canvas\.toDataURL\("image\/png"\)\)/)
  // The group around it (its label, helper line and clear button) follows the theme.
  assert.match(source, /<div role="group" aria-labelledby=\{labelId\} aria-describedby=\{helperId\} className="rounded-md border border-border bg-background p-3">/)
  const counts = Object.fromEntries(
    sources.map((file) => [file.path, file.source.match(/\bdata-theme="light"/g)?.length ?? 0] as const).filter(([, count]) => count > 0),
  )
  assert.deepEqual(counts, LIGHT_SCOPES)
  // White paper always carries the scope, so tokens drawn on it stay light (the void banner's case, Review Focus 4). The
  // other solid whites keep their own colors: the camera controls and the preview's white page under a PDF (P-R8).
  const solidWhite = sources.filter((file) => /(?<![\w:-])bg-white(?![\w/-])/.test(file.source)).map((file) => file.path)
  assert.deepEqual(solidWhite.sort(), [
    `${C}asset-operations/operation-document-print.tsx`,
    `${C}asset-operations/signature-pad.tsx`,
    `${C}assets/asset-label-print.tsx`,
    `${C}audit/audit-scan-camera.tsx`,
    `${C}ui/attachment-preview-dialog.tsx`,
    `${C}ui/scanner-text-input.tsx`,
  ])
  // No part forces dark: the only literal is the dark block's selector in the CSS reader (Task 1, T1).
  assert.deepEqual(sources.filter((file) => /\bdata-theme="dark"/.test(file.source)).map((file) => file.path), ["src/lib/color-contrast.ts"])
})

// Every image of an uploaded file carries the image stage on its own element (spec §4.4, P-R1): a see-through PNG keeps
// its dark ink on a dark page, and a placeholder icon in the same frame keeps the frame's token fill. The images that
// are not uploads keep their own backing.
const NOT_UPLOADS: Record<string, number> = {
  "src/app/[locale]/(auth)/login/page.tsx": 1, // the app icon, framed in P7
  [`${C}asset-operations/operation-document-print.tsx`]: 1, // a signature on the white A4 paper
  [`${C}layout/sidebar.tsx`]: 1, // the app icon, framed in P7
  [`${C}ui/attachment-preview-dialog.tsx`]: 1, // the preview's black stage (spec §4.4)
}

test("every uploaded photo, logo and attachment image sits on the fixed light image stage (dark mode P-R1)", () => {
  const images = sources.flatMap((file) =>
    findJsxTags(file.source, ["img", "Image"]).map((tag) => ({ path: file.path, className: jsxAttrValue(tag.text, "className") ?? "" })),
  )
  assert.equal(images.length, 19, "every <img> and next/image in src")
  const unstaged: Record<string, number> = {}
  for (const image of images) {
    if (!/(?:^|\s)bg-image-stage(?:\s|$)/.test(image.className)) unstaged[image.path] = (unstaged[image.path] ?? 0) + 1
  }
  assert.deepEqual(unstaged, NOT_UPLOADS)
  // The stage is on the 15 images only, never on a frame that also shows a placeholder icon or a file type.
  assert.equal(sources.reduce((sum, file) => sum + (file.source.match(/\bbg-image-stage\b/g)?.length ?? 0), 0), 15)
  assert.match(read(`${C}assets/asset-thumbnail.tsx`), /"relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground"/)
})

test("the bell's unread count is the danger ink on the danger dot, a pair the contrast suite checks in both themes (dark mode P-R7)", () => {
  const topbar = read(`${C}layout/topbar.tsx`)
  // White on the dark theme's light danger fill falls below 4.5:1; the danger foreground is AA on it in both sets.
  assert.match(topbar, /className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold leading-none text-danger-foreground"/)
  assert.doesNotMatch(topbar, /\btext-white\b/)
  assert.equal(topbar.match(/\btext-(?:success|warning|danger|info)-foreground\b/g)?.length, 1, "the one status ink outside src/components/ui")
})

test("the app icon keeps its light tile and gets a hairline frame that shows in dark only (dark mode P-R6)", () => {
  // No new icon files: the opaque near-white tile stays; the frame is the sidebar color in light and a navy line in dark.
  const sidebar = read(`${C}layout/sidebar.tsx`)
  assert.match(sidebar, /src="\/icons\/icon-192\.png"[\s\S]*?className="h-8 w-8 shrink-0 rounded-md ring-1 ring-app-icon-frame"/)
  const login = read("src/app/[locale]/(auth)/login/page.tsx")
  assert.match(login, /src="\/icon\.png"[\s\S]*?className="mx-auto mb-4 h-16 w-16 rounded-xl sm:h-\[72px\] sm:w-\[72px\] ring-1 ring-app-icon-frame"/)
  assert.deepEqual(sources.filter((file) => /\bring-app-icon-frame\b/.test(file.source)).map((file) => file.path).sort(), [
    "src/app/[locale]/(auth)/login/page.tsx",
    `${C}layout/sidebar.tsx`,
  ])
})
