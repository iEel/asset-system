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

// Group 6 plan 3 Task 3: the decision dialog lost its status select, so only an editor (execution) needs the options.
test("the disposal request page loads options only for editors and reads only statuses and employees", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/disposal/[id]/page.tsx", "utf8").replace(/\r/g, "")

  assert.match(page, /canEdit \? getDisposalOptions\(\) : Promise\.resolve\(null\)/)
  assert.doesNotMatch(page, /options\??\.assets/)
  assert.doesNotMatch(page, /getDisposalDecisionStatusOptions/)
  assert.match(page, /getDisposalExecutionStatusOptions\(options\?\.statuses \?\? \[\]\)/)
  assert.match(page, /filterDisposalExecutorOptions\(options\?\.employees \?\? \[\]/)
})
