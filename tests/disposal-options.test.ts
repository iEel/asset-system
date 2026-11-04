import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 6 plan 3 Task 3: the decision dialog lost its status select; group 6 plan 4 (P4-R1) retired the execution
// dialog, so the request page loads no options at all, and plan 4 Task 3 deleted the options loader (no caller left).
test("the disposal request page loads no execution options", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/disposal/[id]/page.tsx", "utf8").replace(/\r/g, "")

  assert.doesNotMatch(page, /getDisposalOptions/)
  assert.doesNotMatch(page, /getDisposalDecisionStatusOptions/)
  assert.doesNotMatch(page, /getDisposalExecutionStatusOptions|filterDisposalExecutorOptions/)
})
