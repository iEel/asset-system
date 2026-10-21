import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { buildTransferSignatures } from "../src/lib/transfer-document-signatures.ts"

const labels = { checkedOutBy: "ผู้ส่งมอบ", receiver: "ผู้รับ", approver: "ผู้อนุมัติ", signatureDate: "ลงชื่อ / วันที่" }

test("a transfer that changes the custodian has a box for the new custodian between the two (user decision 2026-10-21, FX13)", () => {
  assert.deepEqual(buildTransferSignatures({ beforeCustodianId: "emp-1", afterCustodianId: "emp-2" }, labels), [
    { title: "ผู้ส่งมอบ", helper: "ลงชื่อ / วันที่" },
    { title: "ผู้รับ", helper: "ลงชื่อ / วันที่" },
    { title: "ผู้อนุมัติ", helper: "ลงชื่อ / วันที่" },
  ])
  // A custodian given where there was none is a change too.
  assert.equal(buildTransferSignatures({ beforeCustodianId: null, afterCustodianId: "emp-2" }, labels).length, 3)
})

test("a transfer that keeps the custodian, or clears it, keeps two boxes (FX13)", () => {
  const two = [
    { title: "ผู้ส่งมอบ", helper: "ลงชื่อ / วันที่" },
    { title: "ผู้อนุมัติ", helper: "ลงชื่อ / วันที่" },
  ]
  assert.deepEqual(buildTransferSignatures({ beforeCustodianId: "emp-1", afterCustodianId: "emp-1" }, labels), two)
  assert.deepEqual(buildTransferSignatures({ beforeCustodianId: "emp-1", afterCustodianId: null }, labels), two)
  assert.deepEqual(buildTransferSignatures({ beforeCustodianId: undefined, afterCustodianId: undefined }, labels), two)
})

test("the TR- document takes its boxes from the helper, with the handover document's receiver title and no image (FX13)", () => {
  const print = readFileSync("src/app/[locale]/(print)/asset-management/transfers/[id]/page.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(print, /signatures=\{buildTransferSignatures\(\s*\{ beforeCustodianId: beforeSnapshot\?\.custodianId, afterCustodianId: afterSnapshot\?\.custodianId \},\s*\{ checkedOutBy: tCheckout\("checkedOutBy"\), receiver: tCheckout\("receiver"\), approver: tCheckout\("approver"\), signatureDate: tCheckout\("signatureDate"\) \},?\s*\)\}/)
  assert.doesNotMatch(read("src/lib/transfer-document-signatures.ts"), /imageSrc/)
})

function read(path: string) {
  return readFileSync(path, "utf8")
}
