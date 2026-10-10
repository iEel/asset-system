import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findMatches, readSourceFiles } from "./helpers/source-files.ts"

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

test("fonts load once, in the root layout, with Plex Sans before Plex Sans Thai", () => {
  const fontImports = findMatches(sources, /from "next\/font\/(google|local)"/g)
  assert.deepEqual(fontImports.map((match) => match.split(": ")[0]), ["src/app/layout.tsx"])
  const layout = read("src/app/layout.tsx")
  assert.match(layout, /IBM_Plex_Sans\(\{ subsets: \["latin"\], variable: "--font-plex-sans", display: "swap" \}\)/)
  assert.match(layout, /IBM_Plex_Sans_Thai\(\{[^)]*weight: \["400", "500", "600", "700"\][^)]*variable: "--font-plex-thai"/)
  assert.match(layout, /IBM_Plex_Mono\(\{[^)]*weight: \["400", "500", "600"\][^)]*preload: false[^)]*adjustFontFallback: false/)
  assert.match(layout, /<html lang=\{locale\} suppressHydrationWarning className=\{`\$\{plexSans\.variable\} \$\{plexSansThai\.variable\} \$\{plexMono\.variable\}`\}>/)
})

test("line heights are ratios, and Thai pages get room for stacked marks", () => {
  const css = globals()
  assert.match(css, /--text-sm--line-height: calc\(22 \/ 14\);/)
  assert.match(
    css,
    /html:lang\(th\) \{[^}]*--text-xs--line-height: calc\(18 \/ 12\);[^}]*--text-xl--line-height: calc\(30 \/ 20\);[^}]*--text-2xl--line-height: calc\(36 \/ 24\);[^}]*--text-3xl--line-height: calc\(44 \/ 30\);/,
  )
  assert.doesNotMatch(css, /--text-[a-z0-9]+--line-height: \d+px/, "px line heights would be inherited by text-[11px] children")
  assert.match(css, /@utility num \{\s*font-variant-numeric: tabular-nums lining-nums;\s*\}/)
  assert.match(css, /@utility tag \{/)
  assert.match(css, /:root \[data-sonner-toaster\] \{\s*font-family: var\(--font-sans\);\s*\}/)
  assert.match(read("src/components/ui/metric-card.tsx"), /cn\("num mt-2 font-bold"/)
})

test("overlays use the navy scrim and the overlay shadow, and respect reduced motion", () => {
  const ui = sources.filter((file) => file.path.startsWith("src/components/ui/"))
  assert.deepEqual(findMatches(ui, /\bbg-black\/\d+/g), [])
  for (const name of ["dialog", "alert-dialog", "sheet"]) {
    const source = read(`src/components/ui/${name}.tsx`)
    assert.match(source, /"fixed inset-0 z-50 bg-scrim [^"]*motion-reduce:animate-none!"/, `${name} scrim`)
    assert.match(source, /shadow-overlay[^"]*motion-reduce:animate-none!/, `${name} content`)
  }
  for (const name of ["popover", "dropdown-menu", "accessible-dialog"]) {
    const source = read(`src/components/ui/${name}.tsx`)
    assert.match(source, /shadow-overlay/, name)
    assert.doesNotMatch(source, /\bshadow-(sm|md|lg|xl)\b/, name)
  }
  assert.match(read("src/components/ui/sheet.tsx"), /ease-out data-\[state=closed\]:animate-out data-\[state=closed\]:duration-200 data-\[state=open\]:animate-in data-\[state=open\]:duration-250/)
})

test("panels and bottom action bars are flat", () => {
  const panel = read("src/lib/design-system.ts").match(/function getPanelClasses\(\) \{[\s\S]*?\n\}/)?.[0]
  assert.ok(panel, "getPanelClasses() not found")
  assert.doesNotMatch(panel, /shadow/)
  assert.match(read("src/components/ui/metric-card.tsx"), /cn\("rounded-lg border p-5", toneClasses\.container, className\)/)
  for (const path of ["src/components/ui/mobile-action-bar.tsx", "src/components/disposal/disposal-mobile-action-bar.tsx"]) {
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

test("the selected register status tab keeps its underline on desktop and the row still scrolls", () => {
  const source = read("src/components/assets/asset-register-status-tabs.tsx")
  assert.doesNotMatch(source, /md:overflow-visible|md:-mb-px/)
  assert.match(source, /data-asset-status-tabs className="[^"]*\boverflow-x-auto\b/)
  assert.match(source, /md:shadow-\[inset_0_-1px_0_var\(--border\)\]/)
})
