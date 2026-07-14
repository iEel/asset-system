import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { z } from "zod"

import {
  maintenanceTicketPlanningSchema,
} from "../src/lib/validations/maintenance.ts"

test("maintenance ticket optional dates use a Zod-v4 optional preprocess pattern", () => {
  const source = readFileSync("src/lib/validations/maintenance.ts", "utf8")

  assert.match(source, /const optionalDate = z\.preprocess\([\s\S]*z\.coerce\.date\(\)\.nullable\(\)\.optional\(\)[\s\S]*\)\.optional\(\)/)
  assert.doesNotMatch(source, /z\.union\(\[z\.coerce\.date\(\), z\.null\(\), z\.undefined\(\)\]\)/)
})

test("maintenance ticket optional date helper accepts omitted and blank values", () => {
  const optionalDate = z.preprocess(
    (value) => (value == null || (typeof value === "string" && value.trim().length === 0) ? undefined : value),
    z.coerce.date().nullable().optional()
  ).optional()
  const schema = z.object({
    dueDate: optionalDate,
    returnDate: optionalDate,
  })

  assert.deepEqual(schema.parse({}), {})
  assert.deepEqual(schema.parse({ dueDate: "", returnDate: "" }), { dueDate: undefined, returnDate: undefined })
})

test("maintenance status and close mutations require an optimistic concurrency timestamp", () => {
  const source = readFileSync("src/lib/validations/maintenance.ts", "utf8")
  const occurrences = source.match(/expectedUpdatedAt:\s*z\.coerce\.date\(\)/g) ?? []

  assert.equal(occurrences.length, 3)
})

test("planning input accepts cleared assignee and due date", () => {
  const parsed = maintenanceTicketPlanningSchema.parse({
    action: "planning",
    expectedUpdatedAt: "2026-07-14T03:00:00.000Z",
    assignedToId: "",
    dueDate: "",
  })
  assert.equal(parsed.assignedToId, undefined)
  assert.equal(parsed.dueDate, undefined)
})
