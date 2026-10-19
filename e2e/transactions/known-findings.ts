// App findings of the transaction rehearsal that every visit of a page would trip (details and evidence in the plan's
// findings file). Each one has its own expected-to-fail test in findings.spec.ts, which passes, and so is
// reported, once the app is fixed; until then a workflow test that visits the page drops exactly that violation (the
// rule on its known element), so the workflow's other measurements still count. Any other violation still fails.
import type { TestInfo } from "@playwright/test"
import type { PageRecord } from "../support/measure-core.ts"

export type KnownAxe = { finding: string; rule: string; target: RegExp; why: string }

// TX-A2: the asset page's QR code (qrcode.react's QRCodeSVG draws role="img" and the app gives it no title).
export const QR_WITHOUT_NAME: KnownAxe = {
  finding: "TX-A2",
  rule: "svg-img-alt",
  target: /^svg\[height="160"\]$/,
  why: "the asset page's QR code is an image with no text alternative",
}

// TX-A3: the A4 documents' fields (operation-document-print.tsx) are <dt>/<dd> pairs in a <div> grid with no <dl>. axe
// names a pair's cell by its tag or by its classes, inside the field's grid-cols-[38%_1fr] row.
export const PRINT_FIELDS_WITHOUT_DL: KnownAxe = {
  finding: "TX-A3",
  rule: "dlitem",
  target: /grid-cols-\\\[38\\%_1fr\\\]/,
  why: "the A4 document's field pairs are dt and dd outside a dl",
}

export const KNOWN_AXE: readonly KnownAxe[] = [QR_WITHOUT_NAME, PRINT_FIELDS_WITHOUT_DL]

// Drop the known violations from a recorded page (the counts stay as axe gave them, so the summary still shows them),
// and say so on the test.
export function dropKnownAxe(record: PageRecord, known: readonly KnownAxe[], testInfo: TestInfo): PageRecord {
  if (!record.axe) return record
  record.axe.failing = record.axe.failing.filter((violation) => {
    const match = known.find((entry) => entry.rule === violation.id && violation.targets.every((target) => entry.target.test(target)))
    if (!match) return true
    testInfo.annotations.push({ type: "known app finding", description: `${match.finding}: ${match.why} (axe ${violation.id} on ${record.label})` })
    return false
  })
  return record
}
