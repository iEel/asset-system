import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("operational return navigation helper only accepts internal workflow targets", () => {
  const source = readFileSync("src/lib/operational-return-navigation.ts", "utf8")

  assert.match(source, /normalizeOperationalReturnTo/)
  assert.match(source, /normalizeAuditRoundDetailReturnTo/)
  assert.match(source, /new URL\(raw, "http:\/\/asset\.local"\)/)
  assert.match(source, /url\.origin !== "http:\/\/asset\.local"/)
  assert.match(source, /url\.pathname !== fallback/)
  assert.match(source, /appendOperationalReturnTo/)
})

test("maintenance list and detail preserve filtered list context", () => {
  const listSource = readFileSync("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  const detailSource = readFileSync("src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx", "utf8")

  assert.match(listSource, /const maintenanceReturnHref = /)
  assert.match(listSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/\$\{ticket\.id\}`, maintenanceReturnHref\)/)
  assert.match(listSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/\$\{ticket\.id\}\/print`, maintenanceReturnHref\)/)
  assert.match(listSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\?view=tickets&status=\$\{status\}`, maintenanceReturnHref\)/)

  assert.match(detailSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
  assert.match(detailSource, /normalizeOperationalReturnTo\(locale, "maintenance", rawSearchParams\.returnTo\)/)
  assert.match(detailSource, /\{ label: t\("title"\), href: returnToHref \}/)
  assert.match(detailSource, /href=\{returnToHref\}/)
  assert.match(detailSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/\$\{ticket\.id\}\/print`, returnToHref\)/)
  assert.match(detailSource, /appendOperationalReturnTo\(\s*`\/\$\{locale\}\/disposal\?assetId=\$\{ticket\.asset\.id\}&reason=/)
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

  assert.match(detailSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
  assert.match(detailSource, /normalizeOperationalReturnTo\(locale, "audit-rounds", rawSearchParams\.returnTo\)/)
  assert.match(detailSource, /const roundDetailReturnHref = appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}`, returnToHref\)/)
  assert.match(detailSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}\/pending`, roundDetailReturnHref\)/)
  assert.match(detailSource, /appendOperationalReturnTo\(`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}\/scan`, roundDetailReturnHref\)/)

  assert.match(pendingSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
  assert.match(pendingSource, /normalizeAuditRoundDetailReturnTo\(locale, round\.id, rawSearchParams\.returnTo\)/)
  assert.match(pendingSource, /href=\{returnToHref\}/)

  assert.match(scanSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
  assert.match(scanSource, /normalizeAuditRoundDetailReturnTo\(locale, round\.id, rawSearchParams\.returnTo\)/)
  assert.match(scanSource, /backHref=\{returnToHref\}/)
})

test("audit findings preserve resolution context for disposal follow-up links", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/audit/findings/page.tsx", "utf8")

  assert.match(source, /const auditFindingsReturnHref = buildAuditFindingsHref\(locale, status, searchText\)/)
  assert.match(source, /appendOperationalReturnTo\(`\/\$\{locale\}\/disposal\?assetId=\$\{finding\.asset\.id\}&reason=/)
  assert.match(source, /auditFindingsReturnHref\)/)
})
