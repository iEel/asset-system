import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { normalizeDisposalBatchReturnTo } from "../src/lib/operational-return-navigation.ts"

test("operational return navigation helper only accepts internal workflow targets", () => {
  const source = readFileSync("src/lib/operational-return-navigation.ts", "utf8")

  assert.match(source, /normalizeOperationalReturnTo/)
  assert.match(source, /normalizeAuditRoundDetailReturnTo/)
  assert.match(source, /normalizeAuditRoundWorkflowReturnTo/)
  assert.match(source, /new URL\(raw, "http:\/\/asset\.local"\)/)
  assert.match(source, /url\.origin !== "http:\/\/asset\.local"/)
  assert.match(source, /url\.pathname !== fallback/)
  assert.match(source, /allowedPaths/)
  assert.match(source, /appendOperationalReturnTo/)
})

test("maintenance list and detail preserve filtered list context", () => {
  const listSource = readFileSync("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  const detailSource = readFileSync("src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx", "utf8")

  assert.match(listSource, /const returnHref = `\/\$\{locale\}\/maintenance\?\$\{listQuery\}`/)
  assert.match(listSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/\$\{id\}`, returnHref\)/)
  assert.match(listSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/new\?planId=\$\{plan\.id\}`, returnHref\)/)

  assert.match(detailSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
  assert.match(detailSource, /normalizeOperationalReturnTo\(locale, "maintenance", rawSearchParams\.returnTo\)/)
  assert.match(detailSource, /\{ label: t\("title"\), href: returnToHref \}/)
  assert.match(detailSource, /href=\{returnToHref\}/)
  assert.match(detailSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/\$\{ticket\.id\}\/print`, returnToHref\)/)
  assert.match(detailSource, /appendOperationalReturnTo\(\s*`\/\$\{locale\}\/disposal\/new\?assetId=\$\{ticket\.asset\.id\}&reason=/)
})

test("disposal list and detail preserve filtered list context", () => {
  const listSource = readFileSync("src/app/[locale]/(dashboard)/disposal/page.tsx", "utf8")
  const detailSource = readFileSync("src/app/[locale]/(dashboard)/disposal/[id]/page.tsx", "utf8")

  assert.match(listSource, /const disposalReturnHref = /)
  assert.match(listSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/disposal\/\$\{request\.id\}`, disposalReturnHref\)/)

  assert.match(detailSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
  assert.match(detailSource, /normalizeOperationalReturnTo\(locale, "disposal", rawSearchParams\.returnTo\)/)
  assert.match(detailSource, /\{ label: t\("title"\), href: returnToHref \}/)
  assert.match(detailSource, /href=\{returnToHref\}/)
  assert.match(detailSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/disposal\/\$\{disposalRequest\.id\}\/print`, returnToHref\)/)
})

test("audit rounds preserve list context across round detail, scan, and pending pages", () => {
  const roundsSource = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/page.tsx", "utf8")
  const detailSource = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", "utf8")
  const pendingSource = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx", "utf8")
  const scanSource = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx", "utf8")

  assert.match(roundsSource, /const auditRoundsReturnHref = buildAuditRoundsHref\(locale, activeView, searchText\)/)
  assert.match(roundsSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}`, auditRoundsReturnHref\)/)
  assert.match(roundsSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{pendingRounds\[0\]\.id\}\/scan`, auditRoundsReturnHref\)/)
  assert.match(roundsSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/findings\?status=pending`, auditRoundsReturnHref\)/)

  assert.match(detailSource, /searchParams: Promise<\{[^}]*returnTo\?: string \| string\[\][^}]*result\?: string \| string\[\][^}]*pageSize\?: string \| string\[\][^}]*\}>/)
  assert.match(detailSource, /normalizeOperationalReturnTo\(locale, "audit-rounds", rawSearchParams\.returnTo\)/)
  assert.match(detailSource, /const roundDetailReturnHref = appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}`, returnToHref\)/)
  assert.match(detailSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}\/pending`, roundDetailReturnHref\)/)
  assert.match(detailSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}\/scan`, roundDetailReturnHref\)/)
  assert.match(detailSource, /buildAuditRoundResultListHref\(\{ locale, roundId: round\.id, result: "found", returnTo: returnToHref/)

  assert.match(pendingSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; search\?: string \| string\[\]; locationId\?: string \| string\[\] \}>/)
  assert.match(pendingSource, /normalizeAuditRoundWorkflowReturnTo\(locale, round\.id, rawSearchParams\.returnTo\)/)
  assert.match(pendingSource, /href=\{returnToHref\}/)
  assert.match(pendingSource, /hiddenInputs=\{\{ returnTo: returnToHref, \.\.\.\(locationFilter \? \{ locationId: locationFilter \} : \{\}\) \}\}/)
  assert.match(pendingSource, /resolveAuditPendingScanReturnTo/)
  assert.match(pendingSource, /normalizeAuditRoundDetailReturnTo/)

  assert.match(scanSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; assetId\?: string \| string\[\]; mode\?: string \| string\[\] \}>/)
  assert.match(scanSource, /normalizeAuditRoundDetailReturnTo\(locale, round\.id, rawSearchParams\.returnTo\)/)
  assert.match(scanSource, /backHref=\{returnToHref\}/)
})

test("audit findings preserve resolution context for disposal follow-up links", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/audit/findings/page.tsx", "utf8")

  assert.match(source, /const auditFindingsReturnHref = buildAuditFindingsHref\(locale, status, searchText, \{ roundId, findingType \}, listPage\)/)
  assert.match(source, /const \{ search = "", status: statusParam = "pending", roundId: roundIdParam = "", findingType: findingTypeParam = "", page, pageSize \} = await searchParams/)
  assert.match(source, /hiddenInputs=\{\{ status, \.\.\.\(roundId \? \{ roundId \} : \{\}\), \.\.\.\(findingType \? \{ findingType \} : \{\}\), \.\.\.Object\.fromEntries\(appendListPage\(new URLSearchParams\(\), \{ pageSize: listPage\.pageSize \}\)\) \}\}/)
  assert.match(source, /appendOperationalReturnTo\(`\/\$\{locale\}\/disposal\/new\?assetId=\$\{finding\.asset\.id\}&reason=/)
  assert.match(source, /auditFindingsReturnHref\)/)
})

test("the pending list can be narrowed to one room from the scan screen", () => {
  const pendingSource = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx", "utf8")
  assert.match(pendingSource, /\.\.\.\(locationFilter \? \{ expectedLocationId: locationFilter \} : \{\}\)/)
  assert.match(pendingSource, /t\("roomFilter", \{ location: /)
  assert.match(pendingSource, /t\("roomFilterClear"\)/)
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { auditPending: Record<string, unknown> }
    assert.equal(typeof messages.auditPending.roomFilter, "string")
    assert.equal(typeof messages.auditPending.roomFilterClear, "string")
  }
})

// Plan 2B-2 Task 5 (spec 2B §5.9.2 row 5, §5.14): a disposal batch page goes back to the batch history list it came
// from, on the same page and page size, and to the disposal queue otherwise, as before.
test("normalizeDisposalBatchReturnTo accepts the batch history list and falls back to the disposal queue", () => {
  assert.equal(normalizeDisposalBatchReturnTo("th", "/th/disposal/batches?page=2&pageSize=50"), "/th/disposal/batches?page=2&pageSize=50")
  assert.equal(normalizeDisposalBatchReturnTo("th", "/th/disposal/batches"), "/th/disposal/batches")
  assert.equal(normalizeDisposalBatchReturnTo("th", ["/th/disposal/batches?page=3", "/th/admin"]), "/th/disposal/batches?page=3")
  assert.equal(normalizeDisposalBatchReturnTo("th", "/th/disposal?status=approved&page=1&pageSize=25"), "/th/disposal?status=approved&page=1&pageSize=25", "the queue stays a valid target")
  assert.equal(normalizeDisposalBatchReturnTo("th", undefined), "/th/disposal")
  assert.equal(normalizeDisposalBatchReturnTo("th", ""), "/th/disposal")
  assert.equal(normalizeDisposalBatchReturnTo("th", "/th/disposal/batches/batch-1"), "/th/disposal", "another batch page is not the list")
  assert.equal(normalizeDisposalBatchReturnTo("th", "/en/disposal/batches"), "/th/disposal", "another locale")
  assert.equal(normalizeDisposalBatchReturnTo("th", "https://evil.example/th/disposal/batches"), "/th/disposal")
  assert.equal(normalizeDisposalBatchReturnTo("th", "//evil.example/th/disposal/batches"), "/th/disposal")
})

test("the disposal batch page reads returnTo for its back button", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx", "utf8")
  assert.match(source, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
  assert.match(source, /const returnToHref = normalizeDisposalBatchReturnTo\(locale, rawSearchParams\.returnTo\)/)
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/)
})
