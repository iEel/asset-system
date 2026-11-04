import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("the disposal options loader reads only employees and statuses, never the asset register", () => {
  const source = readFileSync("src/lib/disposal-options.ts", "utf8").replace(/\r/g, "")

  assert.doesNotMatch(source, /prisma\.asset\.findMany/)
  assert.doesNotMatch(source, /\bassets\b/)
  assert.match(source, /prisma\.employee\.findMany\(\{\n\s+where: \{ isActive: true \},\n\s+select: \{ id: true, code: true, fullNameTh: true \},/)
  assert.match(source, /label: `\$\{employee\.code\} - \$\{employee\.fullNameTh\}`/)
  assert.match(source, /prisma\.assetStatus\.findMany\(\{\n\s+where: \{ isActive: true \},\n\s+select: \{ id: true, name: true, nameTh: true \},/)
  assert.match(source, /id: status\.id,\n\s+name: status\.name,\n\s+label: status\.nameTh,/)
})

// Group 6 plan 3 Task 3: the decision dialog lost its status select; group 6 plan 4 (P4-R1) retired the execution
// dialog, so the request page loads no options at all.
test("the disposal request page loads no execution options", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/disposal/[id]/page.tsx", "utf8").replace(/\r/g, "")

  assert.doesNotMatch(page, /getDisposalOptions/)
  assert.doesNotMatch(page, /getDisposalDecisionStatusOptions/)
  assert.doesNotMatch(page, /getDisposalExecutionStatusOptions|filterDisposalExecutorOptions/)
})
