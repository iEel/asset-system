import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 6 plan 3 Task 2: the request form as board DP-New (spec §8) and the batch form's photo rule (P3-R3).
const form = readFileSync("src/components/disposal/disposal-request-form.tsx", "utf8")
const card = readFileSync("src/components/disposal/disposal-asset-card.tsx", "utf8")
const page = readFileSync("src/app/[locale]/(dashboard)/disposal/new/page.tsx", "utf8")
const batch = readFileSync("src/components/disposal/disposal-batch-form.tsx", "utf8")
const guards = readFileSync("tests/form-migration-guards.test.ts", "utf8")

test("the request form sits on the operation frame with breadcrumbs and method cards, not a type select", () => {
  assert.match(form, /<OperationFormFrame\b/)
  assert.match(form, /breadcrumbs=\{breadcrumbs\}/)
  assert.match(form, /<ChoiceCard\b/)
  assert.doesNotMatch(form, /NativeSelect/)
  assert.match(form, /summaryOnPhone/)
})

test("the method starts with no default (only a valid ?type= chooses one, inspection-confirm plan 4 task 3)", () => {
  assert.match(form, /disposalType: initialDisposalType \?\? ""/)
  assert.doesNotMatch(form, /disposalType: "dispose"/)
})

test("the photo rule gates the send and a refused file is never queued", () => {
  assert.match(form, /getDisposalPhotoRequirementError\(/)
  assert.match(form, /getDisposalQueuedFileError\(/)
  assert.match(form, /accept=\{disposalEvidenceAccept\}/)
  assert.match(form, /capture="environment"/)
  assert.match(form, /t\("photoTypeRefused"\)/)
})

test("the footer's submit reads ส่งคำขอตัดจำหน่าย and the summary comes from the rules", () => {
  assert.match(form, /submitLabel: t\("submitRequest"\)/)
  assert.match(form, /buildDisposalRequestSummary\(/)
  assert.match(form, /<OperationSummaryCard\b/)
})

test("the send keeps create-then-upload and passes the failed count to the request page", () => {
  assert.match(form, /fetch\("\/api\/disposal-requests", \{/)
  assert.match(form, /\/api\/disposal-requests\/\$\{payload\.id\}\/attachments/)
  assert.match(form, /uploadErrors=/)
})

test("the stable E2E ids stay", () => {
  for (const id of ["disposal-request-asset", "disposal-request-requested-by", "disposal-request-reason"]) {
    assert.match(form, new RegExp(`"${id}"`), id)
  }
})

test("the asset card reads the ?id= card and shows the readiness line", () => {
  assert.match(card, /data-disposal-asset-card/)
  assert.match(card, /t\("readyLine"\)/)
  assert.match(card, /disposalReadinessLine\(/)
  assert.match(form, /\/api\/disposal-assets\?id=/)
})

test("the page passes the requester default and names each employee with the department", () => {
  assert.match(page, /defaultDisposalRequester\(/)
  assert.match(page, /department: \{ select: \{ name: true \} \}/)
  assert.match(page, /breadcrumbs=\{/)
})

test("/th/disposal/new is a sticky-footer route of the operation frame", () => {
  const line = guards.split("\n").find((entry) => entry.includes("asset-operations/operation-form-frame.tsx`]:"))
  assert.ok(line)
  assert.match(line, /"\/th\/disposal\/new"/)
})

test("the batch form checks the photo rule with the same accept list", () => {
  assert.match(batch, /getDisposalPhotoRequirementError\(/)
  assert.match(batch, /getDisposalQueuedFileError\(/)
  assert.match(batch, /accept=\{disposalEvidenceAccept\}/)
})

test("the new words exist in both locales", () => {
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage
    assert.equal(typeof messages.anyApprover, "string", `${locale}.anyApprover`)
    assert.equal(typeof messages.methodRequired, "string", `${locale}.methodRequired`)
  }
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).disposalPage
  assert.equal(th.anyApprover, "ผู้มีสิทธิ์คนใดก็ได้")
  assert.equal(th.methodRequired, "เลือกวิธีจำหน่าย")
})
