import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

test("maintenance list owns one shared action controller", () => {
  const controllerPath = "src/components/maintenance/maintenance-ticket-actions.tsx"
  assert.equal(existsSync(controllerPath), true)
  const page = readFileSync("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  assert.equal((page.match(/<MaintenanceTicketActions/g) ?? []).length, 1)
  assert.match(page, /data-maintenance-action=/)
  assert.doesNotMatch(page, /tickets\.map[\s\S]*<MaintenanceTicketCloseButton/)
})

test("maintenance actions submit optimistic timestamp and ticket kind", () => {
  const sources = [
    readFileSync("src/components/maintenance/maintenance-ticket-status-button.tsx", "utf8"),
    readFileSync("src/components/maintenance/maintenance-ticket-close-button.tsx", "utf8"),
  ].join("\n")
  assert.match(sources, /expectedUpdatedAt/)
  assert.match(sources, /isPreventive/)
  assert.match(sources, /MaintenanceOptionSelect/)
})

test("detail ticket actions receive the current optimistic timestamp", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx", "utf8")
  assert.match(page, /expectedUpdatedAt=\{ticket\.updatedAt/)
})
