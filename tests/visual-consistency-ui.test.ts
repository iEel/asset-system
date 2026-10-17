import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { readRootTokens } from "../src/lib/color-contrast.ts"
import { buttonVariants } from "../src/components/ui/button-variants.ts"

const readSource = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("app shell uses the light-shell visual tokens", async () => {
  const globals = readSource("src/app/globals.css")
  const layout = readSource("src/app/layout.tsx")
  const { default: manifest } = await import("../src/app/manifest.ts")
  const tokens = readRootTokens(globals)

  assert.equal(tokens["sidebar-active"], tokens["brand-navy"])
  assert.notEqual(tokens.primary, tokens["brand-navy"])
  assert.notEqual(tokens.canvas, tokens.card)
  assert.match(layout, /themeColor: themeColorFor\(await readThemeChoice\(\)\),/, "the browser bar takes the chrome color of the theme on screen (src/lib/theme.ts)")
  assert.equal(manifest().theme_color, tokens.card)
  assert.equal(manifest().background_color, tokens.canvas)
})

test("one shared status badge replaces the old status pill", () => {
  const assetDetail = readSource("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  const myAssets = readSource("src/app/[locale]/(dashboard)/my-assets/page.tsx")
  const myAssetDetail = readSource("src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx")

  for (const source of [assetDetail, myAssets, myAssetDetail]) {
    assert.match(source, /import \{ StatusBadge \} from "@\/components\/ui\/status-badge"/)
    assert.doesNotMatch(source, /status-pill|function StatusPill|function StatusBadge/)
    assert.match(source, /tone=\{getAssetStateTone\(asset\.status\.name\)\}/)
    assert.match(source, /tone=\{getAssetStateTone\(asset\.condition\.name\)\}/)
  }
})

test("empty-state link actions remain thumb-friendly on mobile", () => {
  const source = readSource("src/components/ui/action-empty-state.tsx")

  // The link takes the md Button classes: 44px below md, 36px from md up (the old sm:h-9, now on the md breakpoint).
  assert.match(source, /buttonVariants\(\{[^}]*size: "md"/)
  assert.match(buttonVariants({ size: "md" }), /min-h-11 px-3\.5 text-sm md:h-9 md:min-h-0/)
})
