import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const pageSource = readFileSync("src/app/[locale]/(dashboard)/assets/page.tsx", "utf8").replace(/\r\n/g, "\n")

test("the register names a custodian who is not active", () => {
  // The option list stays active-only.
  assert.match(pageSource, /prisma\.employee\.findMany\(\{\n\s*where: \{ isActive: true \},/)
  // A custodian filter that is not among the active employees is loaded on its own for the chip label.
  const start = pageSource.indexOf("const selectedCustodian")
  assert.ok(start > 0, "selectedCustodian is defined")
  const block = pageSource.slice(start, pageSource.indexOf("const filterChips", start))
  assert.match(block, /employees\.find\(\(employee\) => employee\.id === filters\.custodianId\)/)
  assert.match(
    block,
    /prisma\.employee\.findUnique\(\{ where: \{ id: filters\.custodianId \}, select: \{ code: true, fullNameTh: true \} \}\)/,
  )
  assert.match(pageSource, /custodian: selectedCustodian \? `\$\{selectedCustodian\.code\} - \$\{selectedCustodian\.fullNameTh\}` : undefined/)
})
