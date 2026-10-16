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

  assert.match(roundsSource, /const auditRoundsReturnHref = buildAuditRoundsHref\(locale, activeView, searchText, roundPage\)/)
  assert.match(roundsSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}`, auditRoundsReturnHref\)/)
  assert.match(roundsSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{pendingRounds\[0\]\.id\}\/scan`, auditRoundsReturnHref\)/)
  assert.match(roundsSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/findings\?status=pending`, auditRoundsReturnHref\)/)

  assert.match(detailSource, /searchParams: Promise<\{[^}]*returnTo\?: string \| string\[\][^}]*result\?: string \| string\[\][^}]*pageSize\?: string \| string\[\][^}]*\}>/)
  assert.match(detailSource, /normalizeOperationalReturnTo\(locale, "audit-rounds", rawSearchParams\.returnTo\)/)
  assert.match(detailSource, /const roundDetailReturnHref = appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}`, returnToHref\)/)
  assert.match(detailSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}\/pending`, roundDetailReturnHref\)/)
  assert.match(detailSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}\/scan`, roundDetailReturnHref\)/)
  assert.match(detailSource, /buildAuditRoundResultListHref\(\{ locale, roundId: round\.id, result: "found", returnTo: returnToHref/)

  assert.match(pendingSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; search\?: string \| string\[\]; locationId\?: string \| string\[\]; page\?: string \| string\[\]; pageSize\?: string \| string\[\] \}>/)
  assert.match(pendingSource, /normalizeAuditRoundWorkflowReturnTo\(locale, round\.id, rawSearchParams\.returnTo\)/)
  assert.match(pendingSource, /href=\{returnToHref\}/)
  assert.match(pendingSource, /hiddenInputs=\{\{ returnTo: returnToHref, \.\.\.\(locationFilter \? \{ locationId: locationFilter \} : \{\}\), \.\.\.pageSizeInput \}\}/)
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

// Plan 2B-2 Task 14 (spec 2B B4, §5.9.2 row 6, §5.14): the PM edit page goes back to the PM list page and page size
// it was opened from. The helper is pure, so it is imported here; the page and form are read as text (with \r, so no
// regex below holds \n).
test("maintenance-pm returnTo keeps the PM list's page and page size and falls back to the PM list", async () => {
  const { normalizeOperationalReturnTo } = await import("../src/lib/operational-return-navigation.ts")
  assert.equal(normalizeOperationalReturnTo("th", "maintenance-pm", "/th/maintenance/pm?page=2&pageSize=50"), "/th/maintenance/pm?page=2&pageSize=50")
  assert.equal(normalizeOperationalReturnTo("th", "maintenance-pm", ["/th/maintenance/pm?page=3", "/th/maintenance"]), "/th/maintenance/pm?page=3")
  assert.equal(normalizeOperationalReturnTo("th", "maintenance-pm", undefined), "/th/maintenance/pm")
  assert.equal(normalizeOperationalReturnTo("th", "maintenance-pm", "/th/maintenance?page=2"), "/th/maintenance/pm", "the repair-record list is another page")
  assert.equal(normalizeOperationalReturnTo("th", "maintenance-pm", "https://example.com/th/maintenance/pm"), "/th/maintenance/pm", "never another site")
  assert.equal(normalizeOperationalReturnTo("en", "maintenance-pm", "/th/maintenance/pm?page=2"), "/en/maintenance/pm", "the locale is part of the path")
})

test("the PM edit page reads returnTo and the plan form goes there after a save (spec 2B §5.9.2 row 6)", () => {
  const edit = readFileSync("src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx", "utf8")
  const form = readFileSync("src/components/maintenance/maintenance-plan-form.tsx", "utf8")
  assert.match(edit, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
  assert.match(edit, /const returnTo = normalizeOperationalReturnTo\(locale, "maintenance-pm", rawSearchParams\.returnTo\)/)
  assert.match(edit, /returnHref=\{returnTo\}/)
  assert.match(form, /returnHref = `\/\$\{locale\}\/maintenance\/pm`,/, "the create page passes nothing and keeps going to the PM list")
  assert.match(form, /router\.push\(returnHref\)/)
})

// Plan 2D-3 (spec 2D M32 c, spec 2B §5.9.2 row 9): the My Assets detail page goes back to the list page and page size
// it was opened from. The pages are read as text with \r, so no regex below holds \n.
test("my-assets returnTo keeps the list page and page size and falls back to My Assets", async () => {
  const { normalizeOperationalReturnTo } = await import("../src/lib/operational-return-navigation.ts")
  assert.equal(normalizeOperationalReturnTo("th", "my-assets", "/th/my-assets?page=2&pageSize=50"), "/th/my-assets?page=2&pageSize=50")
  assert.equal(normalizeOperationalReturnTo("th", "my-assets", undefined), "/th/my-assets")
  assert.equal(normalizeOperationalReturnTo("th", "my-assets", "/th/assets?page=2"), "/th/my-assets", "the register is another page")
  assert.equal(normalizeOperationalReturnTo("th", "my-assets", "https://example.com/th/my-assets"), "/th/my-assets", "never another site")
  assert.equal(normalizeOperationalReturnTo("en", "my-assets", "/th/my-assets?page=2"), "/en/my-assets", "the locale is part of the path")
  const list = readFileSync("src/app/[locale]/(dashboard)/my-assets/page.tsx", "utf8")
  const detail = readFileSync("src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx", "utf8")
  assert.match(list, /return appendOperationalReturnTo\(`\/\$\{locale\}\/my-assets\/\$\{encodeURIComponent\(assetId\)\}`, returnHref\)/)
  assert.equal(list.match(/buildMyAssetDetailHref\(locale, asset\.id, returnHref\)/g)?.length, 2, "the phone card and the table row")
  assert.match(detail, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
  assert.match(detail, /const returnToHref = normalizeOperationalReturnTo\(locale, "my-assets", rawSearchParams\.returnTo\)/)
})
