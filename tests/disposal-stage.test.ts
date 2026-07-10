import assert from "node:assert/strict"
import test from "node:test"

import { getDisposalNextAction, getDisposalStage } from "../src/lib/disposal-stage.ts"

test("maps disposal request statuses to operational stages", () => {
  assert.equal(getDisposalStage("pending"), "pending_approval")
  assert.equal(getDisposalStage("approved"), "awaiting_execution")
  assert.equal(getDisposalStage("disposed"), "complete")
  assert.equal(getDisposalStage("rejected"), "rejected")
})

test("offers one next action based on the request stage and permission", () => {
  assert.equal(getDisposalNextAction("pending", { canApprove: true, canExecute: true }), "review")
  assert.equal(getDisposalNextAction("pending", { canApprove: false, canExecute: true }), "view")
  assert.equal(getDisposalNextAction("approved", { canApprove: true, canExecute: true }), "execute")
  assert.equal(getDisposalNextAction("approved", { canApprove: true, canExecute: false }), "view")
  assert.equal(getDisposalNextAction("disposed", { canApprove: true, canExecute: true }), "view")
})
