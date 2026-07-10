import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("component manager accepts only a return path to its parent asset detail", () => {
  const source = readFileSync("src/lib/asset-return-navigation.ts", "utf8")

  assert.match(source, /normalizeAssetComponentManagerReturnTo/)
  assert.match(source, /const allowedPath = `\/\$\{locale\}\/assets\/\$\{encodeURIComponent\(assetId\)\}`/)
  assert.match(source, /\?view=custody/)
})

test("component candidate route avoids database lookup below two characters", () => {
  const source = readFileSync("src/app/api/assets/component-candidates/route.ts", "utf8")

  assert.match(source, /if \(search\.length < 2\) return NextResponse\.json\(\{ data: \[\] \}\)/)
})

test("component manager provides scan, review, and integrated removal evidence", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx", "utf8")
  const manager = readFileSync("src/components/assets/asset-component-manager.tsx", "utf8")

  assert.match(page, /requirePagePermission\(locale, "asset", "view"\)/)
  assert.match(page, /hasPermission\(user, "asset", "edit"\)/)
  assert.match(page, /normalizeAssetComponentManagerReturnTo/)
  assert.match(manager, /ScannerTextInput/)
  assert.match(manager, /type InstallStep = "identify" \| "details" \| "review"/)
  assert.match(manager, /componentSearch\.trim\(\)\.length >= 2/)
  assert.match(manager, /installEvidence/)
  assert.match(manager, /removeEvidence/)
  assert.match(manager, /\/api\/assets\/\$\{assetId\}\/components/)
  assert.match(manager, /canEdit/)
})

test("component manager derives hidden search and reset state without synchronous effect updates", () => {
  const manager = readFileSync("src/components/assets/asset-component-manager.tsx", "utf8")

  assert.doesNotMatch(manager, /if \(!canSearchCandidates\) \{\s*setCandidates\(\[\]\)/)
  assert.doesNotMatch(manager, /if \(!component\) \{\s*setReason\(""\)/)
  assert.match(manager, /key=\{removeTarget\?\.id \?\? "closed"\}/)
})
