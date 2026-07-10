import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const readSource = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("app shell uses the agreed Navy and Electric Blue visual tokens", async () => {
  const globals = readSource("src/app/globals.css")
  const layout = readSource("src/app/layout.tsx")
  const { default: manifest } = await import("../src/app/manifest.ts")

  assert.match(globals, /--brand-navy: #0F172A/)
  assert.match(globals, /--brand-accent: #3B82F6/)
  assert.match(globals, /--primary: #2563EB/)
  assert.match(globals, /--sidebar-active: #1E3A8A/)
  assert.match(layout, /themeColor: "#0F172A"/)
  assert.equal(manifest().theme_color, "#0F172A")
})

test("shared status pill owns semantic tones and replaces duplicated Asset Detail pills", () => {
  const sharedPill = readSource("src/components/ui/status-pill.tsx")
  const assetDetail = readSource("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  const myAssets = readSource("src/app/[locale]/(dashboard)/my-assets/page.tsx")
  const myAssetDetail = readSource("src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx")

  assert.match(sharedPill, /export type StatusPillTone/)
  assert.match(sharedPill, /bg-success\/10 text-success-foreground/)
  assert.match(sharedPill, /bg-info\/10 text-info-foreground/)
  assert.match(sharedPill, /bg-warning\/10 text-warning-foreground/)
  assert.match(sharedPill, /bg-danger\/10 text-danger-foreground/)
  assert.match(assetDetail, /import \{ StatusPill \} from "@\/components\/ui\/status-pill"/)
  assert.match(myAssets, /import \{ StatusPill \} from "@\/components\/ui\/status-pill"/)
  assert.match(myAssetDetail, /import \{ StatusPill \} from "@\/components\/ui\/status-pill"/)
  assert.doesNotMatch(assetDetail, /function StatusPill/)
  assert.doesNotMatch(myAssets, /function StatusPill/)
  assert.doesNotMatch(myAssetDetail, /function StatusPill/)
})

test("empty-state link actions remain thumb-friendly on mobile", () => {
  const source = readSource("src/components/ui/action-empty-state.tsx")

  assert.match(source, /min-h-11/)
  assert.match(source, /sm:h-9 sm:min-h-0/)
})
