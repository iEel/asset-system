import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { maintenanceErrorCodes } from "../src/lib/maintenance-api-errors.ts"

test("Thai and English define every maintenance error code", async () => {
  const [th, en] = await Promise.all([
    readFile("messages/th.json", "utf8").then(JSON.parse),
    readFile("messages/en.json", "utf8").then(JSON.parse),
  ])
  for (const code of maintenanceErrorCodes) {
    assert.equal(typeof th.maintenancePage.errors[code], "string")
    assert.equal(typeof en.maintenancePage.errors[code], "string")
  }
})

test("Thai and English maintenance copy has matching keys", async () => {
  const [th, en] = await Promise.all([
    readFile("messages/th.json", "utf8").then(JSON.parse),
    readFile("messages/en.json", "utf8").then(JSON.parse),
  ])
  assert.deepEqual(getLeafKeys(th.maintenancePage), getLeafKeys(en.maintenancePage))
})

test("maintenance clients localize stable error codes instead of exposing raw API text", async () => {
  const files = [
    "src/components/maintenance/maintenance-ticket-form.tsx",
    "src/components/maintenance/maintenance-ticket-status-button.tsx",
    "src/components/maintenance/maintenance-ticket-planning-button.tsx",
    "src/components/maintenance/maintenance-ticket-close-button.tsx",
    "src/components/maintenance/maintenance-plan-form.tsx",
    "src/components/maintenance/maintenance-plan-generate-button.tsx",
    "src/components/maintenance/maintenance-attachments.tsx",
  ]
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n")
  assert.doesNotMatch(source, /payload\?\.error/)
  assert.match(source, /getMaintenanceErrorMessage\(payload\?\.code, t/)
  assert.doesNotMatch(source, /toISOString\(\)\.slice\(0, 10\)/)
  assert.match(source, /toLocalDateInputValue/)
})

test("maintenance option selectors use the shared loading message namespace", async () => {
  const files = [
    "src/components/maintenance/maintenance-ticket-planning-button.tsx",
    "src/components/maintenance/maintenance-ticket-close-button.tsx",
  ]
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n")

  assert.doesNotMatch(source, /loadingLabel=\{t\("loading"\)\}/)
  assert.equal(source.match(/loadingLabel=\{tCommon\("loading"\)\}/g)?.length, files.length)
})

function getLeafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix]
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => getLeafKeys(child, prefix ? `${prefix}.${key}` : key))
    .sort()
}
