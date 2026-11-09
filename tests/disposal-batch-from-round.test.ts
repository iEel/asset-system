import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { toDisposalAssetOption } from "../src/lib/disposal-asset-option.ts"
import { normalizeDisposalFormReturnTo } from "../src/lib/operational-return-navigation.ts"

// Inspection-confirm plan 4 task 4: the batch form opens with a round's หาไม่พบ assets for a lost request
// (?type=lost&fromAuditRound=<uuid>), the source audit_round in its POST, and its way back to the confirm page.
// Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/disposal/batch/new/page.tsx"
const FORM = "src/components/disposal/disposal-batch-form.tsx"
const ROUTE = "src/app/api/disposal-assets/route.ts"
const SINGLE_PAGE = "src/app/[locale]/(dashboard)/disposal/new/page.tsx"
const ROUND = "8b0c2f6e-1d2a-4c3b-9e8f-0a1b2c3d4e5f"

test("the page reads the round's summary only when type=lost and fromAuditRound is a uuid", () => {
  const page = read(PAGE)
  assert.match(page, /const fromRoundId = type === "lost" && fromAuditRound && uuidPattern\.test\(fromAuditRound\) \? fromAuditRound : null/)
  assert.match(page, /fromRoundId\s*\n?\s*\? readRoundPrefill\(fromRoundId\)\s*\n?\s*: null/)
  assert.match(page, /loadRoundDisposalSummary\(prisma, round\.id\)/)
  // The summary is read once, inside readRoundPrefill, after the round itself was found active.
  assert.equal(page.match(/loadRoundDisposalSummary\(/g)?.length, 1)
  assert.match(page, /prisma\.auditRound\.findUnique\(\{ where: \{ id \}, select: \{ id: true, auditNo: true, isActive: true \} \}\)/)
  assert.match(page, /if \(!round \|\| !round\.isActive\) return null/)
})

test("the page keeps the first DISPOSAL_BATCH_MAX_ASSETS and says so when more were left out", () => {
  const page = read(PAGE)
  assert.match(page, /summary\.missingForDisposal\.slice\(0, DISPOSAL_BATCH_MAX_ASSETS\)/)
  assert.match(page, /capped: summary\.missingForDisposal\.length > DISPOSAL_BATCH_MAX_ASSETS/)
  assert.match(page, /capNotice=\{prefill\?\.capped \?\? false\}/)
})

test("the shared option mapper is used by both the picker route and the page", () => {
  const route = read(ROUTE)
  const page = read(PAGE)
  for (const source of [route, page]) {
    assert.match(source, /from "@\/lib\/disposal-asset-option"/)
    assert.match(source, /select: disposalAssetOptionSelect/)
    assert.match(source, /toDisposalAssetOption\(asset, /)
  }
  assert.match(page, /toDisposalAssetOption\(asset, "lost"\)/)
  assert.match(route, /toDisposalAssetOption\(asset, disposalType\)/)
  assert.doesNotMatch(route, /getDisposalReadinessBlockersForAsset\(asset\)/, "the route no longer maps the option itself")
})

test("the page passes the prefill to the form: machines, the lost method, the audit_round source and the notice", () => {
  const page = read(PAGE)
  assert.match(page, /initialMachines=\{prefill\?\.machines\}/)
  assert.match(page, /initialDisposalType=\{prefill \? "lost" : undefined\}/)
  assert.match(page, /source=\{prefill \? \{ sourceType: "audit_round", sourceId: prefill\.roundId \} : undefined\}/)
  assert.match(page, /roundNotice=\{prefill \? \{ auditNo: prefill\.auditNo, count: prefill\.machines\.length, href: prefill\.confirmHref, blocked: prefill\.blocked \} : undefined\}/)
  assert.match(page, /const confirmPath = `\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}\/confirm`/)
  assert.match(page, /confirmHref: returnToHref\.startsWith\(`\$\{confirmPath\}\?`\) \|\| returnToHref === confirmPath \? returnToHref : `\$\{confirmPath\}\?tab=notFound`,/)
})

test("the page's back link and cancel follow returnTo, normalized to the queue or the confirm page", () => {
  const page = read(PAGE)
  assert.match(page, /const returnToHref = normalizeDisposalFormReturnTo\(locale, rawSearchParams\.returnTo\)/)
  assert.match(page, /const back = <PageBackLink href=\{returnToHref\} label=\{backLabel\} \/>/)
  // The queue keeps "กลับไปคิว"; the confirm page reads the common back.
  assert.match(page, /const backLabel = returnToHref\.startsWith\(`\/\$\{locale\}\/disposal`\) \? t\("backToQueue"\) : tCommon\("back"\)/)
  assert.match(page, /cancelHref=\{returnToHref\}/)
  // The single form honours the confirm page too (controller addition A).
  const single = read(SINGLE_PAGE)
  assert.match(single, /const returnToHref = normalizeDisposalFormReturnTo\(locale, rawSearchParams\.returnTo\)/)
  assert.doesNotMatch(single, /normalizeOperationalReturnTo\(locale, "disposal"/)
})

test("the form starts with the given machines and method, and its POST carries the source when given", () => {
  const form = read(FORM)
  assert.match(form, /useState<DisposalAssetOption\[\]>\(initialMachines \?\? \[\]\)/)
  assert.match(form, /disposalType: initialDisposalType \?\? ""/)
  assert.match(form, /initialDisposalType\?: "lost"/)
  assert.match(form, /source\?: \{ sourceType: "audit_round"; sourceId: string \}/)
  assert.match(form, /approverId: values\.approverId \|\| null,\n\s+\.\.\.\(source \? \{ sourceType: source\.sourceType, sourceId: source\.sourceId \} : \{\}\),/)
})

test("the form shows the round notice with a link back to the confirm page, and the capped line", () => {
  const form = read(FORM)
  assert.match(form, /t\("batchForm\.fromRoundNotice", \{ auditNo: roundNotice\.auditNo, count: roundNotice\.count \}\)/)
  // Plan 4 final review: a link (not an outline button) that says where it goes.
  assert.match(form, /<Link href=\{roundNotice\.href\} data-disposal-batch-round-back="" className=\{linkVariants\(\)\}>\n\s+\{t\("batchForm\.backToConfirm"\)\}/)
  assert.doesNotMatch(form, /tConfirm|inspectionConfirmPage/)
  assert.match(form, /capNotice \? <p data-disposal-batch-capped[^>]*>\{t\("batchForm\.fromRoundCapped"\)\}<\/p> : null/)
})

// Plan 4 final review: the round's หาไม่พบ assets that cannot be requested yet are named in the notice; the cap counts
// the eligible ones only (missingForDisposal leaves the blocked out).
test("the page names the round's blocked หาไม่พบ assets in the notice, by tag", () => {
  const page = read(PAGE)
  assert.match(page, /\.\.\.summary\.missingBlockedForDisposal\.map\(\(item\) => item\.assetTag\),\n\s+\.\.\.kept\.filter\(\(item\) => !chosen\.has\(item\.assetId\)\)\.map\(\(item\) => item\.assetTag\),/)
  assert.match(page, /blocked: \{ count: blockedTags\.length, tags: blockedTags\.slice\(0, ROUND_BLOCKED_TAGS\) \},/)
  const form = read(FORM)
  assert.match(form, /roundNotice\.blocked && roundNotice\.blocked\.count > 0 \?/)
  assert.match(form, /t\("batchForm\.fromRoundBlocked", \{\n\s+count: roundNotice\.blocked\.count,/)
})

// Plan 4 final review: on a phone the single form keeps the round's context.
test("the phone notice from a round links to the single lost form with the round as source and the way back, and names the round", () => {
  const page = read(PAGE)
  assert.match(page, /`\/\$\{locale\}\/disposal\/new\?type=lost&sourceType=audit_round&sourceId=\$\{encodeURIComponent\(prefill\.roundId\)\}&returnTo=\$\{encodeURIComponent\(prefill\.confirmHref\)\}`/)
  assert.match(page, /: `\/\$\{locale\}\/disposal\/new`/)
  assert.match(page, /<Link href=\{phoneHref\}/)
  assert.match(page, /t\("batchForm\.phoneFromRound", \{ auditNo: prefill\.auditNo \}\)/)
})

// Plan 4 final review: a หาไม่พบ machine goes only with สูญหาย; under another method its row is blocked.
test("the form blocks the chosen หาไม่พบ machines in their rows when the method leaves lost, and allows them again on lost", () => {
  const form = read(FORM)
  assert.match(form, /const lostOnlyBlocked = values\.disposalType !== "" && !lost \? machines\.filter\(\(machine\) => machine\.lostOnly\) : \[\]/)
  assert.match(form, /blockedReason=\{lostOnlyBlockedIds\.has\(row\.machine\.id\) \? t\("readinessBlockers\.lifecycle_status"\) : undefined\}/)
  assert.match(form, /if \(field === "disposalType" && value === "lost" && fieldErrors\.errors\.assets === DISPOSAL_BATCH_LOST_ONLY\) fieldErrors\.clear\("assets"\)/)
  assert.match(form, /done: machines\.length >= DISPOSAL_BATCH_MIN_ASSETS && lostOnlyBlocked\.length === 0/)
  const row = read("src/components/disposal/disposal-batch-machine-row.tsx")
  assert.match(row, /\{blockedReason \? \(\n\s+<p data-disposal-batch-machine-blocked="" className="mt-1 text-meta font-medium text-danger">\{blockedReason\}<\/p>/)
})

test("the messages: th as written, en a plural on count", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.disposalPage.batchForm.backToConfirm, "กลับไปหน้ายืนยันผลตรวจ")
  assert.equal(en.disposalPage.batchForm.backToConfirm, "Back to confirm results")
  assert.equal(th.disposalPage.batchForm.fromRoundBlocked, "{count, number} ชิ้นยังขอไม่ได้: {tags}")
  assert.equal(th.inspectionConfirmPage.lostBlock, "ชิ้นหาไม่พบจากรอบนี้ที่ยังไม่ได้ขอตัดจำหน่าย: {count, number} ชิ้น")
  assert.match(en.inspectionConfirmPage.lostBlock, /\{count, plural, one \{[^}]*\} other \{[^}]*\}\}/)
  assert.equal(th.inspectionConfirmPage.damagedDialogTitle, "ยืนยันผลตรวจ {assetTag}")
  assert.equal(th.disposalPage.rounds.form.blocked.DISPOSAL_ROUND_LOST_METHOD, "ขอเป็นสูญหาย · บันทึกได้เฉพาะรอบวิธีสูญหาย")
  assert.equal(typeof en.disposalPage.rounds.form.blocked.DISPOSAL_ROUND_LOST_METHOD, "string")
  assert.equal(th.disposalPage.batchForm.fromRoundNotice, "เลือกทรัพย์สินที่ตั้งเป็นหาไม่พบจากรอบ {auditNo} ไว้ให้ {count, number} ชิ้น")
  assert.equal(th.disposalPage.batchForm.fromRoundCapped, "เลือกให้ 100 ชิ้นแรก ส่งชุดนี้แล้วกลับมาขอชุดถัดไป")
  assert.match(en.disposalPage.batchForm.fromRoundNotice, /\{count, plural, one \{[^}]*\} other \{[^}]*\}\}/)
  assert.equal(typeof en.disposalPage.batchForm.fromRoundCapped, "string")
})

test("toDisposalAssetOption: eligibility by the type, readiness blockers, the label and the metadata", () => {
  const asset = {
    id: "a1",
    assetTag: "NB-001",
    name: "Notebook",
    serialNumber: null,
    status: { name: "Missing", nameTh: "หาไม่พบ" },
    company: { code: "C1" },
    branch: { code: "B1", name: "HQ" },
    currentLocation: { code: "L1", name: "Room 1" },
    custodian: null,
  }
  const lost = toDisposalAssetOption(asset, "lost")
  assert.deepEqual(lost, {
    id: "a1",
    label: "NB-001 - Notebook",
    assetTag: "NB-001",
    name: "Notebook",
    serialNumber: null,
    metadata: "หาไม่พบ · C1/B1 · Room 1",
    eligible: true,
    blockers: [],
    outstandingComponentTags: [],
    lostOnly: true,
  })
  const other = toDisposalAssetOption(asset, null)
  assert.equal(other.eligible, false)
  assert.deepEqual(other.blockers, ["lifecycle_status"])
  const held = toDisposalAssetOption({ ...asset, custodian: { code: "E1", fullNameTh: "สมชาย" } }, "lost")
  assert.equal(held.metadata, "หาไม่พบ · C1/B1 · Room 1 · E1 - สมชาย")
  const ready = toDisposalAssetOption({ ...asset, status: { name: "Ready", nameTh: "พร้อมใช้งาน" } }, "lost")
  assert.equal(ready.lostOnly, false, "a Ready asset is not held to the lost method")
  assert.equal(other.lostOnly, true)
})

test("normalizeDisposalFormReturnTo keeps the queue and one round's confirm page, else the queue", () => {
  const f = normalizeDisposalFormReturnTo
  assert.equal(f("th", undefined), "/th/disposal")
  assert.equal(f("th", ""), "/th/disposal")
  assert.equal(f("th", "/th/disposal?status=pending#list"), "/th/disposal?status=pending#list")
  const confirm = `/th/audit/rounds/${ROUND}/confirm?tab=notFound&returnTo=%2Fth%2Faudit%2Frounds%2F${ROUND}`
  assert.equal(f("th", confirm), confirm)
  assert.equal(f("th", [`/th/audit/rounds/${ROUND}/confirm`, "/th/admin"]), `/th/audit/rounds/${ROUND}/confirm`)
  assert.equal(f("th", `/th/audit/rounds/${ROUND}/confirm#x`), `/th/audit/rounds/${ROUND}/confirm`, "the hash is dropped")
  assert.equal(f("th", "/th/audit/rounds/not-a-uuid/confirm"), "/th/disposal")
  assert.equal(f("th", `/th/audit/rounds/${ROUND}`), "/th/disposal", "the round page is not the confirm page")
  assert.equal(f("th", `/th/audit/rounds/${ROUND}/confirm/x`), "/th/disposal")
  assert.equal(f("th", `/en/audit/rounds/${ROUND}/confirm`), "/th/disposal", "another locale")
  assert.equal(f("th", `https://evil.example/th/audit/rounds/${ROUND}/confirm`), "/th/disposal")
  assert.equal(f("th", `//evil.example/th/audit/rounds/${ROUND}/confirm`), "/th/disposal")
  assert.equal(f("th", `/th/disposal/../audit/rounds/${ROUND}/confirm`), `/th/audit/rounds/${ROUND}/confirm`, "resolved first")
  assert.equal(f("th", "/th/admin"), "/th/disposal")
  assert.equal(f("th", "/th/disposal/batches"), "/th/disposal")
})
