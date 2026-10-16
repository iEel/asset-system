import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"
import { countMatchesByFile, findMatches, readSourceFiles } from "./helpers/source-files.ts"

const sources = readSourceFiles("src")
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const globals = () => read("src/app/globals.css")

test("focus styles use the single ring token", () => {
  assert.deepEqual(findMatches(sources, /(focus|focus-visible|focus-within):(ring|border)-(primary|brand-accent|danger|success|warning|info|destructive)(?![\w-])/g), [])
  assert.deepEqual(findMatches(sources, /focus-visible:ring-[a-z-]+\/\d+/g), [], "a see-through ring alone cannot reach 3:1")
})

test("every element gets a visible focus outline, also in Windows high-contrast mode", () => {
  const css = globals()
  assert.match(css, /@layer base \{\s*:focus-visible \{\s*outline: 2px solid var\(--ring\);\s*outline-offset: 2px;\s*\}\s*\}/)
  assert.match(css, /@media \(forced-colors: active\) \{\s*:focus-visible \{\s*outline: 2px solid CanvasText;\s*outline-offset: 2px;\s*\}\s*\}/)
  const forcedColorsAt = css.indexOf("@media (forced-colors: active)")
  const layerOpen = css.lastIndexOf("@layer", forcedColorsAt)
  const layerClose = layerOpen === -1 ? -1 : css.indexOf("\n}", layerOpen)
  assert.ok(layerOpen === -1 || layerClose < forcedColorsAt, "the forced-colors outline must sit outside every @layer so it beats outline-none")
})

test("script-focused containers do not draw an outline around whole forms", () => {
  assert.match(read("src/components/audit/audit-scan-check-panel.tsx"), /tabIndex=\{-1\} className="text-base font-semibold text-foreground outline-none"/)
  assert.match(read("src/components/disposal/disposal-bulk-approval.tsx"), /tabIndex=\{-1\} className=\{cn\("outline-none", className\)\}/)
  assert.match(read("src/components/disposal/disposal-bulk-execution.tsx"), /tabIndex=\{-1\}\s*className=\{cn\("outline-none", className\)\}/)
})

test("fonts load once, in the root layout, with Plex Sans before Noto Sans Thai Looped", () => {
  const fontImports = findMatches(sources, /from "next\/font\/(google|local)"/g)
  assert.deepEqual(fontImports.map((match) => match.split(": ")[0]), ["src/app/layout.tsx"])
  const layout = read("src/app/layout.tsx")
  assert.match(layout, /IBM_Plex_Sans\(\{ subsets: \["latin"\], variable: "--font-plex-sans", display: "swap" \}\)/)
  assert.match(layout, /Noto_Sans_Thai_Looped\(\{[^)]*subsets: \["thai"\][^)]*weight: \["400", "500", "600", "700"\][^)]*variable: "--font-thai"/)
  assert.doesNotMatch(layout, /IBM_Plex_Sans_Thai/, "the loopless Plex Sans Thai was hard to read at 12-14px")
  assert.match(layout, /IBM_Plex_Mono\(\{[^)]*weight: \["400", "500"\][^)]*preload: false[^)]*adjustFontFallback: false/)
  assert.match(layout, /<html lang=\{locale\} suppressHydrationWarning className=\{`\$\{plexSans\.variable\} \$\{thaiSans\.variable\} \$\{plexMono\.variable\}`\}>/)
})

test("line heights are ratios, and Thai pages get room for stacked marks", () => {
  const css = globals()
  assert.match(css, /--text-sm--line-height: calc\(22 \/ 14\);/)
  assert.match(
    css,
    /html:lang\(th\) \{[^}]*--text-xs--line-height: calc\(18 \/ 12\);[^}]*--text-xl--line-height: calc\(30 \/ 20\);[^}]*--text-2xl--line-height: calc\(36 \/ 24\);[^}]*--text-3xl--line-height: calc\(44 \/ 30\);/,
  )
  assert.doesNotMatch(css, /--text-[a-z0-9]+--line-height: \d+px/, "px line heights would be inherited by text-[11px] children")
  assert.match(css, /--text-meta: 0\.8125rem;\s*--text-meta--line-height: calc\(20 \/ 13\);/)
  assert.match(css, /--text-metric: 1\.75rem;\s*--text-metric--line-height: calc\(32 \/ 28\);\s*--text-metric--font-weight: 500;\s*--text-metric--letter-spacing: -0\.02em;/)
  assert.match(css, /--text-count: 1\.25rem;\s*--text-count--line-height: calc\(24 \/ 20\);\s*--text-count--font-weight: 600;\s*--text-count--letter-spacing: -0\.01em;/)
  const meta = css.match(/--text-meta--line-height: calc\((\d+) \/ (\d+)\);/)
  assert.ok(meta, "text-meta line height not found")
  assert.ok(Number(meta[1]) / Number(meta[2]) >= 1.44, "text-meta carries Thai text with no Thai override, so its line must be at least 1.44x the size")
  const thai = css.match(/html:lang\(th\) \{[^}]*\}/)?.[0]
  assert.ok(thai, "html:lang(th) block not found")
  assert.doesNotMatch(thai, /--text-(meta|metric|count)-/, "meta is Thai-safe as is; metric and count hold numbers only")
  assert.match(css, /@utility num \{\s*font-variant-numeric: tabular-nums lining-nums;\s*\}/)
  assert.match(
    css,
    /@utility tag \{\s*font-family: var\(--font-mono\);\s*font-size: calc\(1em - 1px\);\s*font-weight: 400;\s*white-space: nowrap;\s*font-variant-numeric: normal;\s*-webkit-user-select: all;\s*user-select: all;\s*:where\(a, button, label, summary\) & \{\s*-webkit-user-select: auto;\s*user-select: auto;\s*\}\s*\}/,
  )
  assert.match(css, /:root \[data-sonner-toaster\] \{\s*font-family: var\(--font-sans\);\s*\}/)
  assert.match(read("src/components/ui/stat-strip.tsx"), /"text-metric num text-foreground"/)
})

test("overlays use the navy scrim and the overlay shadow, and respect reduced motion", () => {
  const ui = sources.filter((file) => file.path.startsWith("src/components/ui/"))
  assert.deepEqual(findMatches(ui, /\bbg-black\/\d+/g), [])
  for (const name of ["dialog", "alert-dialog", "sheet"]) {
    const source = read(`src/components/ui/${name}.tsx`)
    assert.match(source, /"fixed inset-0 z-50 bg-scrim [^"]*motion-reduce:animate-none!"/, `${name} scrim`)
    assert.match(source, /shadow-overlay[^"]*motion-reduce:animate-none!/, `${name} content`)
  }
  for (const name of ["popover", "dropdown-menu"]) {
    const source = read(`src/components/ui/${name}.tsx`)
    assert.match(source, /shadow-overlay[^"]*motion-reduce:animate-none!/, `${name} panel`)
    assert.doesNotMatch(source, /\bshadow-(sm|md|lg|xl)\b|zoom-(?:in|out)/, name)
  }
  const accessibleDialog = read("src/components/ui/accessible-dialog.tsx")
  assert.match(accessibleDialog, /shadow-overlay/, "accessible-dialog")
  assert.doesNotMatch(accessibleDialog, /\bshadow-(sm|md|lg|xl)\b/, "accessible-dialog")
  assert.match(read("src/components/ui/sheet.tsx"), /ease-out data-\[state=closed\]:animate-out data-\[state=closed\]:duration-200 data-\[state=open\]:animate-in data-\[state=open\]:duration-250/)
})

test("panels and bottom action bars are flat", () => {
  const panel = read("src/lib/design-system.ts").match(/function getPanelClasses\(\) \{[\s\S]*?\n\}/)?.[0]
  assert.ok(panel, "getPanelClasses() not found")
  assert.doesNotMatch(panel, /shadow/)
  // MetricCard and its tone fills are gone (spec 2B R-d): number tiles are StatStrip, one flat frame with no status fill
  // and no drop shadow. Its current cell's 2px line is an inset shadow, which the size list below does not match.
  assert.equal(existsSync("src/components/ui/metric-card.tsx"), false)
  assert.doesNotMatch(read("src/components/ui/stat-strip.tsx"), /\bbg-(?:success|warning|danger|info)-soft\b|\bshadow-(?:sm|md|lg|xl|2xl)\b/)
  for (const path of ["src/components/ui/action-bar.tsx"]) {
    assert.doesNotMatch(read(path), /backdrop-blur|bg-surface\/95|shadow-md/, path)
  }
})

test("globals keep a light-only, token-driven base", () => {
  const css = globals()
  assert.ok(css.indexOf(":root {") < css.indexOf("@layer base"), "the token :root block must stay first")
  assert.match(css, /--canvas: #[0-9A-F]{6};/)
  assert.match(css, /--color-scrim: rgb\(/)
  assert.match(css, /--shadow-overlay: /)
  assert.match(css, /:root \{\s*color-scheme: only light;\s*accent-color: var\(--primary\);\s*\}/)
  assert.match(css, /::backdrop \{\s*border-color: var\(--border\);\s*\}/)
  assert.match(css, /::selection \{\s*background-color: var\(--primary-border\);/)
  assert.doesNotMatch(css, /@custom-variant dark|scrollbar-color/)
  assert.match(css, /@source not "\.\.\/\.\.\/docs";/)
})

test("full-bleed bars blend into the canvas", () => {
  assert.match(read("src/components/layout/dashboard-shell.tsx"), /className="fixed inset-0 flex max-w-full overflow-hidden bg-canvas"/)
  assert.match(read("src/components/assets/asset-register-toolbar.tsx"), /sticky top-0 z-20 -mx-4 mb-3 bg-canvas /)
  assert.doesNotMatch(read("src/components/assets/asset-register-toolbar.tsx"), /md:shadow-sm/)
  assert.match(read("src/components/audit/audit-scan-search.tsx"), /sticky -top-4 sm:-top-6 z-20 -mx-4 bg-canvas /)
  assert.match(read("src/components/assets/asset-detail-tabs.tsx"), /border-r border-border bg-canvas\/95 /)
})

test("no caller passes a database color to StatusBadge", () => {
  const badges = findMatches(sources, /<StatusBadge\b[\s\S]*?\/>/g)
  assert.ok(badges.length > 40, `expected the shared StatusBadge call sites, found ${badges.length}`)
  assert.deepEqual(badges.filter((match) => /\bcolor=/.test(match)), [])
  assert.deepEqual(findMatches(sources, /getStatusDotColor|statusDotVariants/g), [])
})

test("the topbar is flat and the bottom bar is solid with Thai-safe labels", () => {
  assert.doesNotMatch(read("src/components/layout/topbar.tsx"), /shadow-sm/)
  const nav = read("src/components/layout/mobile-field-navigation.tsx")
  assert.doesNotMatch(nav, /backdrop-blur|bg-surface\/95|leading-tight|text-\[11px\]/)
  assert.match(nav, /"fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-2 /)
  assert.equal(nav.match(/text-xs font-medium text-muted-foreground/g)?.length, 2)
})

test("the offline page and service worker follow the new palette", () => {
  const offline = read("public/offline.html")
  assert.match(offline, /<meta name="theme-color" content="#FFFFFF" \/>/)
  assert.doesNotMatch(offline, /#1E3A5F|#1e3a5f|Inter,/)
  assert.match(read("public/sw.js"), /const ASSET_SYSTEM_PWA_CACHE = "asset-system-pwa-v2"/)
})

test("A4 documents keep the 20px text-sm line height so signatures stay on page 1", () => {
  assert.match(read("src/components/asset-operations/operation-document-print.tsx"), /className="operation-print-page \[--text-sm--line-height:calc\(20\/14\)\] /)
})

test("the register status tabs keep their underline at every width and the row still scrolls", () => {
  // The register tabs are TabNav (2B-3, I9): the base line is an inset shadow on the list at every width, and the
  // current tab's line sits inside the list, so it scrolls with the tabs and is never clipped.
  const tabNav = read("src/components/ui/tab-nav.tsx")
  assert.doesNotMatch(tabNav, /overflow-visible|-mb-px/)
  assert.match(tabNav, /overflow-x-auto/)
  assert.match(tabNav, /shadow-\[inset_0_-1px_0_var\(--border\)\]/)
  assert.doesNotMatch(tabNav, /md:shadow-\[inset/)
  assert.match(read("src/components/assets/asset-register-status-tabs.tsx"), /<TabNav\b[\s\S]*?data-asset-status-tabs/)
})

test("every field gets one placeholder color, and native selects get a token-colored chevron", () => {
  const css = globals()
  assert.match(css, /::placeholder \{\s*color: var\(--faint-foreground\);\s*\}/)
  const placeholderAt = css.indexOf("::placeholder {")
  const layerOpen = css.lastIndexOf("@layer base", placeholderAt)
  assert.ok(layerOpen !== -1 && css.indexOf("\n}", layerOpen) > placeholderAt, "the placeholder rule sits inside @layer base: the same layer as preflight's, later in the file")
  assert.match(css, /--radius-control: 6px;/)
  assert.match(
    css,
    /@utility select-chevron \{\s*appearance: none;[^}]*@media \(forced-colors: active\) \{\s*appearance: auto;\s*background-image: none;\s*\}\s*\}/,
    "forced-colors mode gets the system arrow back",
  )
})

test("placeholders take their color from the base rule only", () => {
  assert.deepEqual(findMatches(sources, /placeholder:text-(?!faint-foreground\b)[\w-]+/g), [])
})

test("the mockup type sizes and the 6px radius are used through their tokens", () => {
  assert.deepEqual(
    findMatches(sources, /text-\[(?:13|28)px\]/g, (path) => path === "src/components/assets/asset-label-print.tsx"),
    [],
    "use text-meta (13px) or text-metric (28px); the thermal label keeps its own px sizes",
  )
  assert.deepEqual(findMatches(sources, /rounded-\[6px\]/g), [], "use rounded-control")
})

// "Class string" = one double-quoted string on one line, as findMatches reports it.
const classStrings = findMatches(sources, /"[^"\n]*"/g).map((match) => ({ where: match, text: match.slice(match.indexOf(': "') + 2) }))
const stringsWhere = (keep: (text: string) => boolean) => classStrings.filter(({ text }) => keep(text)).map(({ where }) => where)

test("big numbers, codes and faint text follow their token rules", () => {
  assert.deepEqual(
    stringsWhere((text) => /\btext-(?:metric|count)\b/.test(text) && !/\bnum\b/.test(text)),
    [],
    "text-metric and text-count are for numbers only (their line height is not Thai-safe): put num in the same class string",
  )
  // The tag utility as its own class (also md:tag), not words like asset-tag-template.
  const tagClass = /(?:^|[^\w-])tag(?![\w-])/
  assert.deepEqual(
    stringsWhere((text) => tagClass.test(text) && (/\bfont-(?:semibold|bold|extrabold|black)\b/.test(text) || /\btext-(?:xs|sm|base|meta|lg)\b/.test(text))),
    [],
    "tag is weight 400 or font-medium only (Plex Mono has no 700) and sizes itself 1px under its parent: set the size on a wrapper",
  )
  assert.deepEqual(
    stringsWhere((text) => /\bbg-(?:success|warning|danger|info)-soft\b/.test(text) && /\btext-faint-foreground\b/.test(text)),
    [],
    "faint text never sits on a status fill: use the tone ink or text-muted-foreground",
  )
})

// Ratchet guards (UI phase 2A). A file missing from the budget may have no match; a listed file may have at most its number.
// Lower a number in the task that removes a site; never raise one. Phase 2D sets every budget to {}.
function assertWithinBudget(pattern: RegExp, budget: Record<string, number>, allow?: (path: string) => boolean) {
  const counts = countMatchesByFile(sources, pattern, allow)
  const over = Object.entries(counts)
    .filter(([path, count]) => count > (budget[path] ?? 0))
    .map(([path, count]) => `${path}: ${count} > ${budget[path] ?? 0}`)
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  assert.equal(over.length, 0, `${total} matches in ${Object.keys(counts).length} files; over budget:\n${over.join("\n")}`)
}

test("countMatchesByFile counts matches per file and skips allowed paths", () => {
  const files = [
    { path: "src/a.tsx", source: "border-warning/30 bg-warning-soft border-danger/20" },
    { path: "src/b.tsx", source: "border-border" },
    { path: "src/c.tsx", source: "border-info/30" },
  ]
  assert.deepEqual(countMatchesByFile(files, /border-[a-z]+\/\d+/g), { "src/a.tsx": 2, "src/c.tsx": 1 })
  assert.deepEqual(countMatchesByFile(files, /border-[a-z]+\/\d+/g, (path) => path === "src/a.tsx"), { "src/c.tsx": 1 })
})

// R1: a tone color with an opacity suffix (border-warning/30, ring-primary/20, bg-destructive/10). Use the -border / -soft tokens.
const TONE_OPACITY =
  /(?<![\w-])(?:[\w\-\[\]=&\/]+:)*(?:bg|border|ring|text|divide|outline|fill|stroke|from|via|to|decoration|shadow|accent|caret|placeholder)-(?:primary|success|warning|danger|info|destructive)(?:-[a-z]+)?\/\d+/g

test("R1 tone colors never fade with opacity", () => {
  assertWithinBudget(TONE_OPACITY, {})
})

const NEUTRAL_FILL_OPACITY = /(?<![\w-])(?:[\w\-\[\]=&\/]+:)*(?:bg-(?:muted|accent)|border-border)\/\d+/g

// R7, locked by phase 2B plan 5 (spec 2B §9.2.2): every neutral fill is an opaque token, table headers included; the
// <th line filter of plans 2B-1 to 2B-4 is gone. The budget keeps its name, which the guard scripts of the 2B plans
// read (spec 2D §5.5). Plan 2D-3 moved its last row, the import preview table header, onto DataTable: it is {}.
const TABLE_HEADER_FILLS: Record<string, number> = {}

test("R7 neutral fills are opaque tokens, table headers included", () => {
  const css = globals()
  assert.match(css, /--row-hover: #[0-9A-F]{6};/)
  assert.match(css, /--border-soft: #[0-9A-F]{6};/)
  assert.match(css, /--color-row-hover: var\(--row-hover\);/, "without this line Tailwind drops bg-row-hover without an error")
  assert.match(css, /--color-border-soft: var\(--border-soft\);/, "without this line Tailwind drops border-border-soft without an error")
  assertWithinBudget(NEUTRAL_FILL_OPACITY, TABLE_HEADER_FILLS)
})

// R2: panels and cards are flat. A shadow belongs only to floating layers (shadow-overlay, not matched here),
// controls drawn over the camera image or a photo, paper previews, and the few bars that later phases own.
const SURFACE_SHADOW = /(?<![\w-])(?:[\w\-\[\]=&\/]+:)*shadow-(?:sm|md|lg|xl|2xl)(?![\w-])/g

test("R2 only floating layers, camera controls and paper previews cast a shadow", () => {
  assertWithinBudget(SURFACE_SHADOW, {
    "src/components/ui/scanner-text-input.tsx": 2, // two controls over the camera image
    "src/components/audit/audit-scan-check-form.tsx": 1, // delete button over a photo thumbnail
    "src/components/assets/asset-label-print.tsx": 1, // label sheet preview
    "src/components/asset-operations/operation-document-print.tsx": 1, // A4 page preview
    "src/components/admin/system-settings-form.tsx": 1, // label preview
    "src/components/layout/mobile-field-navigation.tsx": 1, // round scan button shadow-md, kept since phase 1
    "src/components/assets/asset-register-table.tsx": 1, // mobile bulk-action bar shadow-lg (phase 3, R-q)
  })
})

test("the shared segmented control marks the chosen option with primary-soft and 6px corners, not a shadow", () => {
  // Mockup .seg (base.css): white frame with a 1px line, 8px corners, 2px padding and gap; buttons 6px;
  // the pressed one is primary-soft with primary-hover text at weight 600; the others hover to the subtle fill.
  assert.match(globals(), /--radius-control: 6px;/, "rounded-control needs its token, or Tailwind drops the class without an error")

  const segmented = read("src/components/ui/segmented.tsx")
  assert.match(segmented, /<div role="group" aria-label=\{ariaLabel\} data-slot="segmented" className=\{cn\(fill \? "flex" : "inline-flex", segmentedFrameClasses, className\)\}>/)
  assert.match(segmented, /const segmentedFrameClasses = "gap-0\.5 rounded-md border border-border bg-surface p-0\.5"/)
  // No weight in the shared part (font-medium and font-semibold never sit in one class list) and no ring offset (2px gap).
  assert.equal(segmented.match(/const segmentedOptionClasses = "([^"]+)"/)?.[1], "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")
  assert.match(segmented, /const segmentedPressedClasses = "bg-primary-soft font-semibold text-primary-hover"/)
  assert.match(segmented, /const segmentedIdleClasses = "font-medium text-muted-foreground hover:bg-background hover:text-foreground"/)
  assert.match(segmented, /aria-pressed=\{pressed\}/)
  for (const path of ["src/components/audit/audit-scan-room-list.tsx", "src/components/admin/system-settings-form.tsx"]) assert.match(read(path), /<Segmented\b/, path)
  assert.doesNotMatch(read("src/components/audit/audit-scan-room-list.tsx"), /aria-pressed/, "the room list tabs get aria-pressed from Segmented")
})

test("R3 no text smaller than 12px outside the thermal label", () => {
  // The thermal label prints at its physical size, so it keeps its own type scale. On screen the floor is text-xs (12px).
  const labelPrint = "src/components/assets/asset-label-print.tsx"
  assert.deepEqual(findMatches(sources, /text-\[(?:\d|1[01])(?:\.\d+)?px\]/g, (path) => path === labelPrint), [])
  // leading-4 (16px) is below the Thai minimum of 1.44 × 12px; without it text-xs gets calc(18 / 12) on Thai pages.
  for (const path of ["src/components/admin/IntegrationClientManager.tsx", "src/components/ui/file-dropzone.tsx"]) {
    assert.doesNotMatch(read(path), /\bleading-4\b/, path)
  }
  // The white count on the solid red dot is 600, not 700 (spec 2A section 9.8, ruling 11).
  assert.match(read("src/components/layout/topbar.tsx"), /rounded-full bg-danger px-1 text-xs font-semibold leading-none text-white/)
})

test("no emoji in source or messages: icons come from lucide and languages are named in words", () => {
  // Emoji_Presentation covers flags and pictographs; U+FE0F turns a text symbol into an emoji. © ® ✓ ↑ ↓ · › ⋯ stay allowed.
  const messages = ["messages/th.json", "messages/en.json"].map((path) => ({ path, source: read(path) }))
  assert.deepEqual(findMatches([...sources, ...messages], /\p{Emoji_Presentation}|\uFE0F/gu), [])
})
