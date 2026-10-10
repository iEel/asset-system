import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { readRootTokens } from "../src/lib/color-contrast.ts"

const readSource = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("app shell uses the light-shell visual tokens", async () => {
  const globals = readSource("src/app/globals.css")
  const layout = readSource("src/app/layout.tsx")
  const { default: manifest } = await import("../src/app/manifest.ts")
  const tokens = readRootTokens(globals)

  assert.equal(tokens["sidebar-active"], tokens["brand-navy"])
  assert.notEqual(tokens.primary, tokens["brand-navy"])
  assert.notEqual(tokens.canvas, tokens.card)
  assert.match(layout, /themeColor: "#0F172A"/)
  assert.equal(manifest().theme_color, "#0F172A")
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

  assert.match(source, /min-h-11/)
  assert.match(source, /sm:h-9 sm:min-h-0/)
})
