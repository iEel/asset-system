import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getDisposalAssetEligibilityError } from "../src/lib/disposal-policy.ts"

// ยืนยันผลตรวจ plan 4 Task 1: a หาไม่พบ (Missing) asset may start a disposal request only as สูญหาย (lost).
const refused = "Asset status does not allow a new disposal request"

test("lost takes Missing", () => {
  assert.equal(getDisposalAssetEligibilityError({ name: "Missing" }, "lost"), null)
  assert.equal(getDisposalAssetEligibilityError({ nameTh: "ไม่พบ" }, "lost"), null)
})

test("other types refuse Missing", () => {
  assert.equal(getDisposalAssetEligibilityError({ name: "Missing" }, "sell"), refused)
  assert.equal(getDisposalAssetEligibilityError({ name: "Missing" }, "dispose"), refused)
  assert.equal(getDisposalAssetEligibilityError({ name: "Missing" }), refused)
  assert.equal(getDisposalAssetEligibilityError({ name: "Missing" }, null), refused)
  assert.equal(getDisposalAssetEligibilityError({ name: "Missing" }, ""), refused)
})

test("Lost stays refused", () => {
  assert.equal(getDisposalAssetEligibilityError({ name: "Lost" }, "lost"), refused)
  for (const statusName of ["Disposed", "Retired", "Under Maintenance", "Pending Repair"]) {
    assert.equal(getDisposalAssetEligibilityError({ name: statusName }, "lost"), refused, statusName)
  }
  assert.equal(getDisposalAssetEligibilityError({ name: "Ready" }, "lost"), null)
})

test("the asset-detail callers pass no type, so they keep refusing Missing", () => {
  const source = readFileSync("src/lib/asset-detail-frame-rules.ts", "utf8")
  assert.match(source, /getDisposalAssetEligibilityError\(input\.status\) !== null/)
})

test("each server caller passes the request's type to the eligibility check", () => {
  const requests = readFileSync("src/app/api/disposal-requests/route.ts", "utf8")
  assert.match(requests, /getDisposalAssetEligibilityError\(asset\.status, input\.disposalType\)/)

  const batches = readFileSync("src/app/api/disposal-batches/route.ts", "utf8")
  assert.match(batches, /getDisposalAssetEligibilityError\(asset\.status, packet\.disposalType\) !== null/)

  const picker = readFileSync("src/app/api/disposal-assets/route.ts", "utf8")
  assert.match(picker, /const disposalType = \(request\.nextUrl\.searchParams\.get\("type"\) \?\? ""\)\.trim\(\) \|\| null\r?\n/)
  // The picker's option goes through the shared mapper (inspection-confirm plan 4 task 4), which makes the check.
  assert.match(picker, /toDisposalAssetOption\(asset, disposalType\)/)
  const option = readFileSync("src/lib/disposal-asset-option.ts", "utf8")
  assert.match(option, /getDisposalAssetEligibilityError\(asset\.status, disposalType\) !== null/)

  const prefill = readFileSync("src/app/[locale]/(dashboard)/disposal/new/page.tsx", "utf8")
  assert.match(prefill, /const initialDisposalType = getSingleSearchParam\(rawSearchParams\.type\) \?\? null\r?\n/)
  assert.match(prefill, /getDisposalAssetEligibilityError\(initialAsset\.status, initialDisposalType\) !== null/)
})

test("the batch route writes the packet's source on every request it creates", () => {
  const batches = readFileSync("src/app/api/disposal-batches/route.ts", "utf8")
  assert.match(batches, /sourceType: packet\.sourceType \?\? null,\r?\n\s+sourceId: packet\.sourceId \?\? null,/)
})

test("the asset picker asks with ?type=lost only for a lost request", () => {
  const picker = readFileSync("src/components/disposal/disposal-asset-picker.tsx", "utf8")
  assert.match(picker, /const typeQuery = disposalType === "lost" \? "&type=lost" : ""\r?\n/)
  assert.match(picker, /fetch\(`\/api\/disposal-assets\?q=\$\{encodeURIComponent\(normalized\)\}\$\{typeQuery\}`/)
  assert.match(picker, /\}, \[query, typeQuery\]\)/)

  const batchForm = readFileSync("src/components/disposal/disposal-batch-form.tsx", "utf8")
  assert.match(batchForm, /disposalType=\{values\.disposalType\}/)
  const requestForm = readFileSync("src/components/disposal/disposal-request-form.tsx", "utf8")
  assert.match(requestForm, /disposalType=\{values\.disposalType\}/)
})

test("the request form reads its asset card with the method's ?type= and reads it again when lost is chosen or left", () => {
  const requestForm = readFileSync("src/components/disposal/disposal-request-form.tsx", "utf8")
  assert.match(requestForm, /const typeQuery = values\.disposalType === "lost" \? "&type=lost" : ""\r?\n/)
  assert.match(requestForm, /fetch\(`\/api\/disposal-assets\?id=\$\{encodeURIComponent\(assetId\)\}\$\{typeQuery\}`/)
  assert.match(requestForm, /if \(!assetId \|\| \(card\?\.id === assetId && cardTypeQuery === typeQuery\)\) return/)
})

test("the request form's card read is never aborted: a newer read makes the old one stale (inspection-confirm plan 4, E2E-1109Q)", () => {
  const form = readFileSync("src/components/disposal/disposal-request-form.tsx", "utf8").replace(/\r\n/g, "\n")
  const block = form.slice(form.indexOf("fetch(`/api/disposal-assets?id="), form.indexOf("}, [card?.id, cardTypeQuery, typeQuery, values.assetId, cardAttempt])"))
  assert.doesNotMatch(block, /AbortController|\.abort\(\)|signal:/)
  assert.match(form, /let stale = false\n\s*fetch\(`\/api\/disposal-assets\?id=/)
  assert.match(block, /if \(stale\) return/)
})
