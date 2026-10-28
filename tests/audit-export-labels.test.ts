import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  auditExportActionStatusKey,
  auditExportActionTaken,
  auditExportActionTakenKey,
  auditExportFilterWords,
  auditExportFindingTypeKey,
  auditExportItemResultKey,
  auditExportItemStatusKey,
  auditExportReconcileStatusKey,
  auditExportReviewStatusKey,
  auditExportWord,
  auditFindingActionStatusCodes,
  auditFindingActionTakenCodes,
  auditFindingReviewStatusCodes,
  buildAuditExportFilterWords,
  buildAuditFindingExportFilterWords,
  resolveAuditExportLocale,
} from "../src/lib/audit-export-labels.ts"
import { auditFindingTypes } from "../src/lib/audit-finding-filters.ts"
import { attachmentContentDisposition } from "../src/lib/download-filename.ts"
import { workbookResponse } from "../src/lib/asset-excel.ts"
import { readSourceFiles } from "./helpers/source-files.ts"

// Group 2 plan 4 Task 6 (spec §5 "No raw code ever reaches the screen", P4-R7 to P4-R9; the plan 2 carry-over): the
// five audit exports write the page's words in the request's language, keep their English headers and sheet names, and
// a Thai file name no longer breaks the download. Sources read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = { th: JSON.parse(read("messages/th.json")), en: JSON.parse(read("messages/en.json")) }
// A small stand-in for next-intl's t: the key's text with its {name} arguments filled.
const translator = (locale: "th" | "en") => (key: string, values?: Record<string, string>) => {
  const text = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages[locale])
  assert.equal(typeof text, "string", `${locale} ${key}`)
  return (text as string).replace(/\{(\w+)\}/g, (_, name: string) => values?.[name] ?? `{${name}}`)
}
const th = translator("th")
const en = translator("en")
const ROUTES = {
  roundExcel: "src/app/api/audit-rounds/[id]/export/route.ts",
  roundPdf: "src/app/api/audit-rounds/[id]/export-pdf/route.ts",
  variance: "src/app/api/audit-rounds/[id]/variance-export/route.ts",
  findingsExcel: "src/app/api/audit-findings/export/route.ts",
  findingsPdf: "src/app/api/audit-findings/export-pdf/route.ts",
}

test("the language is the request's: en when asked, th otherwise (P4-R7)", () => {
  assert.equal(resolveAuditExportLocale("en"), "en")
  for (const value of ["th", null, undefined, "", "fr", "EN"]) assert.equal(resolveAuditExportLocale(value), "th", String(value))
})

test("every stored code reads the page's word in both languages; a blank stays blank", () => {
  assert.equal(auditExportWord(th, auditExportItemStatusKey("pending"), "pending"), "รอตรวจ")
  assert.equal(auditExportWord(th, auditExportItemStatusKey("reconciled"), "reconciled"), "ปรับปรุงข้อมูลแล้ว")
  assert.equal(auditExportWord(th, auditExportReconcileStatusKey("pending_investigation"), "pending_investigation"), "รอติดตามหาทรัพย์สิน")
  assert.equal(auditExportWord(th, auditExportReconcileStatusKey(""), ""), "", "no reconcile status, an empty cell")
  // The round page's ผล column (P2-R2): wrong_* and need_review read ไม่ตรง, a checked item with no result too.
  assert.equal(th(auditExportItemResultKey("reviewed", "wrong_location")), "ไม่ตรง")
  assert.equal(th(auditExportItemResultKey("reviewed", "need_review")), "ไม่ตรง")
  assert.equal(th(auditExportItemResultKey("reviewed", null)), "ไม่ตรง")
  assert.equal(th(auditExportItemResultKey("scanned", "confirmed_with_parent")), "ยืนยันกับทรัพย์สินหลัก")
  assert.equal(th(auditExportItemResultKey("reviewed", "out_of_scope")), "นอกขอบเขต")
  assert.equal(th(auditExportItemResultKey("pending", null)), "รอตรวจ")
  assert.equal(en(auditExportItemResultKey("scanned", "found")), "Matched")
  assert.equal(auditExportWord(th, auditExportFindingTypeKey("not_found"), "not_found"), "ไม่พบทรัพย์สิน")
  assert.equal(auditExportWord(en, auditExportFindingTypeKey("wrong_custodian"), "wrong_custodian"), "Wrong Custodian")
  assert.equal(auditExportWord(th, auditExportReviewStatusKey("exception"), "exception"), "ต้องตรวจสอบพิเศษ")
  assert.equal(auditExportWord(th, auditExportActionStatusKey("not_required"), "not_required"), "ยังไม่ต้องทำ")
  for (const [codes, key] of [
    [auditFindingTypes, auditExportFindingTypeKey],
    [auditFindingReviewStatusCodes, auditExportReviewStatusKey],
    [auditFindingActionStatusCodes, auditExportActionStatusKey],
    [auditFindingActionTakenCodes, auditExportActionTakenKey],
  ] as const) {
    for (const code of codes) {
      const path = key(code)
      assert.ok(path, code)
      th(path)
      en(path)
    }
  }
  // docs/19: a code with no word yet shows as stored, never hidden; actionTaken reads blank instead, never the code
  // (P4-R8, P4-R29).
  assert.equal(auditExportWord(th, auditExportFindingTypeKey("wrong_colour"), "wrong_colour"), "wrong_colour")
  assert.equal(auditExportActionTaken(th, "some_future_code"), "")
  assert.equal(auditExportActionTaken(th, null), "")
  assert.equal(auditExportActionTaken(th, "master_asset_updated"), "แก้ข้อมูลทรัพย์สินตามผลตรวจแล้ว")
  assert.equal(auditExportActionTaken(en, "found_later_by_audit_scan"), "Found later by a check scan")
})

test("P4-R8, P4-R29: every actionTaken and findingType code the routes write has its words (no code reaches an export)", () => {
  const written = new Set<string>()
  const types = new Set<string>()
  for (const file of readSourceFiles("src/app/api")) {
    // A comparison inside a ternary (review/route.ts:254 `input.action === "approve"`) is not a code, and an orderBy
    // direction (variance-export/route.ts:69 `findingType: "asc"`) is not a type.
    for (const match of file.source.matchAll(/actionTaken:\s*([^,\n}]+)/g)) for (const code of match[1].replace(/[\w.]+\s*[!=]==\s*"[a-z_]+"/g, "").matchAll(/"([a-z_]+)"/g)) written.add(code[1])
    for (const match of file.source.matchAll(/findingType:\s*"([a-z_]+)"/g)) if (match[1] !== "asc" && match[1] !== "desc") types.add(match[1])
  }
  assert.ok(written.size >= 13, `found ${written.size} actionTaken codes`)
  assert.deepEqual([...written].filter((code) => !auditFindingActionTakenCodes.includes(code as never)), [])
  assert.deepEqual([...types].filter((code) => !auditFindingTypes.includes(code as never)), [])
})

test("the round PDF's filter line reads as the round page's chips, in one order; none reads ทั้งหมด", () => {
  const sni = { code: "SNI" }
  const input = { result: "mismatch", search: " ห้อง 3 ", company: sni, branch: { code: "HQ", company: sni }, category: { code: "NB" }, field: "location", components: "missing" } as const
  assert.equal(buildAuditExportFilterWords(input, auditExportFilterWords(th)), "ไม่ตรง · บริษัท: SNI · สาขา: HQ · หมวดหมู่: NB · ที่ตั้งไม่ตรง · ส่วนควบไม่ครบ · ค้นหา: ห้อง 3")
  assert.equal(buildAuditExportFilterWords({ result: "all", search: "", branch: { code: "HQ", company: sni } }, auditExportFilterWords(th)), "สาขา: SNI-HQ", "a branch without its company names the company")
  assert.equal(buildAuditExportFilterWords({ result: "all", search: "", category: { code: "other" } }, auditExportFilterWords(th)), "หมวดหมู่: อื่น ๆ")
  assert.equal(buildAuditExportFilterWords({ result: "all", search: "" }, auditExportFilterWords(th)), "ทั้งหมด")
  assert.equal(buildAuditExportFilterWords({ result: "not_found", search: "" }, auditExportFilterWords(en)), "Not Found")
})

test("the findings PDF's filter line: the round, the topic and the search; an unknown topic is left out, never its code", () => {
  assert.equal(buildAuditFindingExportFilterWords({ roundNo: "AUD-2026-0003", findingType: "wrong_department", search: "PC" }, th), "รอบตรวจ: AUD-2026-0003 · แผนกไม่ตรง · ค้นหา: PC")
  assert.equal(buildAuditFindingExportFilterWords({ roundNo: null, findingType: "wrong_colour", search: null }, th), "ทั้งหมด")
})

test("P4-R9: a Thai file name keeps an ASCII filename and the whole name in filename*", () => {
  const name = "audit-result-AUD-2026-0003-search-ห้อง-2026-10-28.xlsx"
  const value = attachmentContentDisposition(name)
  assert.equal(value, "attachment; filename=\"audit-result-AUD-2026-0003-search-2026-10-28.xlsx\"; filename*=UTF-8''audit-result-AUD-2026-0003-search-%E0%B8%AB%E0%B9%89%E0%B8%AD%E0%B8%87-2026-10-28.xlsx")
  assert.equal(new Response("x", { headers: { "Content-Disposition": value } }).headers.get("content-disposition"), value, "a ByteString: the 500 is gone")
  assert.equal(attachmentContentDisposition("it's (a) \"q\";.pdf"), "attachment; filename=\"it's (a) -q-.pdf\"; filename*=UTF-8''it%27s%20%28a%29%20%22q%22%3B.pdf")
  assert.equal(attachmentContentDisposition("audit-findings-pending-2026-10-28.xlsx"), "attachment; filename=\"audit-findings-pending-2026-10-28.xlsx\"; filename*=UTF-8''audit-findings-pending-2026-10-28.xlsx")
  assert.equal(workbookResponse(new ArrayBuffer(1), name).headers.get("content-disposition"), value, "every Excel export")
  assert.match(read("src/lib/audit-pdf.tsx"), /"Content-Disposition": attachmentContentDisposition\(filename\),/)
  assert.doesNotMatch(read("src/lib/audit-pdf.tsx") + read("src/lib/asset-excel.ts"), /filename="\$\{filename\}"/)
})

test("each export reads ?locale= after the permission and writes its codes through the map; headers and sheet names stay English (P4-R7)", () => {
  for (const [name, path] of Object.entries(ROUTES)) {
    const route = read(path)
    assert.match(route, /^import \{ getTranslations \} from "next-intl\/server"$/m, name)
    assert.match(route, /const locale = resolveAuditExportLocale\(request\.nextUrl\.searchParams\.get\("locale"\)\)/, name)
    assert.match(route, /getTranslations\(\{ locale \}\)/, name)
    assert.ok(route.indexOf("requirePermission(user, \"audit\", \"export\")") < route.indexOf("getTranslations({ locale })"), `${name}: the permission first`)
    assert.doesNotMatch(route, /(?:auditStatus|reconcileStatus|findingType|reviewStatus|actionStatus): (?:row|finding)\.(?:auditStatus|reconcileStatus|findingType|reviewStatus|actionStatus)(?:\s*\?\?\s*"")?,\n|actionTaken: finding\.actionTaken \?\? ""/, `${name}: no stored code in a cell (the round routes' item-to-row builders keep the codes on purpose)`)
  }
  const roundExcel = read(ROUTES.roundExcel)
  assert.match(roundExcel, /auditResult: t\(auditExportItemResultKey\(row\.auditStatus, row\.auditResult\)\),/)
  assert.match(roundExcel, /worksheet\.columns = auditResultColumns/)
  const roundPdf = read(ROUTES.roundPdf)
  assert.match(roundPdf, /title: t\("auditRound\.exportPdfTitle", \{ auditNo: round\.auditNo \}\),/)
  assert.match(roundPdf, /const filterWords = buildAuditExportFilterWords\(labelInput, auditExportFilterWords\(t\)\)/)
  const variance = read(ROUTES.variance)
  assert.match(variance, /workbook\.addWorksheet\("Variance Summary"\)/)
  assert.match(variance, /workbook\.addWorksheet\("Variance Details"\)/)
  assert.match(variance, /\{ header: "Finding Type", key: "findingType", width: 24 \}/)
  const findingsExcel = read(ROUTES.findingsExcel)
  assert.match(findingsExcel, /workbook\.addWorksheet\("Audit Findings"\)/)
  assert.match(findingsExcel, /actionTaken: auditExportActionTaken\(t, finding\.actionTaken\),/)
  assert.match(findingsExcel, /actionOwner: finding\.actionOwnerId \? \(ownerLabelById\.get\(finding\.actionOwnerId\) \?\? ""\) : "",/, "never an employee id (P4-R11)")
  const findingsPdf = read(ROUTES.findingsPdf)
  assert.match(findingsPdf, /title: t\("auditFinding\.exportPdfTitle", \{ filter: auditFindingFilterLabelKeys\(status\)\.map\(\(key\) => t\(key\)\)\.join\(" · "\) \}\),/)
  assert.match(findingsPdf, /actionOwner: finding\.actionOwnerId \? \(ownerCodeById\.get\(finding\.actionOwnerId\) \?\? ""\) : "",/)
  // The English the E2E steps and the users' sheets read stays.
  const excel = read("src/lib/audit-excel.ts")
  for (const header of ['{ header: "Asset Tag", key: "assetTag", width: 22 }', '{ header: "Audit Status", key: "auditStatus", width: 18 }', '{ header: "Action Taken", key: "actionTaken", width: 26 }']) assert.ok(excel.includes(header), header)
})

test("the links carry the page's language: the round page through its one builder, the reports page's three findings links", () => {
  const roundPage = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx")
  for (const [name, endpoint] of [["auditRoundExportHref", "export"], ["auditRoundExportPdfHref", "export-pdf"], ["auditRoundVarianceHref", "variance-export"]]) {
    assert.match(roundPage, new RegExp(`const ${name} = buildAuditRoundExportHref\\(locale, round\\.id, "${endpoint}", filters\\)`), name)
  }
  const reports = read("src/app/[locale]/(dashboard)/reports/page.tsx")
  assert.ok(reports.includes("href: `/api/audit-findings/export?status=pending&locale=${locale}`"))
  assert.ok(reports.includes("exportHref: `/api/audit-findings/export?status=all&locale=${locale}`"))
  assert.ok(reports.includes("exportHref: `/api/audit-findings/export-pdf?status=all&locale=${locale}`"))
})

test("the new words, Thai and English; English reads as today's export (glossary: รหัสทรัพย์สิน, รายการไม่ตรง, ตรวจนับ)", () => {
  assert.equal(th("auditRound.exportPdfTitle", { auditNo: "AUD-1" }), "ผลตรวจนับ AUD-1")
  assert.equal(en("auditRound.exportPdfTitle", { auditNo: "AUD-1" }), "Audit Result - AUD-1")
  assert.equal(th("auditRound.exportPdfFilter", { filter: "ทั้งหมด" }), "ตัวกรอง: ทั้งหมด")
  assert.equal(en("auditRound.exportSummary_mismatchOrNotFound"), "Mismatch/Not Found")
  assert.equal(th("auditRound.varianceMetric_totalExpected"), "ทรัพย์สินในรอบ")
  assert.equal(en("auditRound.varianceMetric_outOfScopeFindings"), "Out-of-scope Findings")
  assert.equal(th("auditFinding.exportPdfTitle", { filter: "รอพิจารณา" }), "รายการไม่ตรง · รอพิจารณา")
  assert.equal(en("auditFinding.exportSummary_rejectedOrException"), "Rejected/Exception")
  assert.equal(Object.keys(messages.th.auditRound).filter((key) => key.startsWith("varianceMetric_")).length, 13)
  assert.equal(Object.keys(messages.th.auditFinding).filter((key) => key.startsWith("actionTaken_")).length, auditFindingActionTakenCodes.length)
})
