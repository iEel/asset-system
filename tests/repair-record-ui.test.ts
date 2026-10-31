import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix]
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key))
    .sort()
}

test("Thai and English repair record copy has matching keys", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.ok(th.repairRecord, "messages/th.json needs a repairRecord namespace")
  assert.deepEqual(leafKeys(th.repairRecord), leafKeys(en.repairRecord))
})

test("the repair form sends one record with a done flag and a local default date", () => {
  const source = readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8")
  assert.match(source, /fetch\("\/api\/maintenance-tickets"/)
  assert.match(source, /done: values\.done/)
  assert.match(source, /toLocalDateInputValue\(\)/)
  assert.doesNotMatch(source, /toISOString\(\)\.slice\(0, 10\)/)
  assert.doesNotMatch(source, /assignedToId|dueDate|laborCost|partsCost|warrantyClaim/)
})

test("the repair form localizes API error codes and links to an unfinished record", () => {
  const source = readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8")
  assert.match(source, /getMaintenanceErrorMessage\(payload\?\.code, tMaintenance/)
  assert.match(source, /MAINTENANCE_OPEN_RECORD_EXISTS/)
  assert.match(source, /status=in_progress/)
})

test("files picked in the form upload after the record is saved", () => {
  const source = readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8")
  const upload = readFileSync("src/components/maintenance/repair-record-upload.ts", "utf8")
  assert.match(source, /uploadRepairFiles\(payload\.id, files/)
  assert.match(upload, /\/api\/maintenance-tickets\/\$\{recordId\}\/attachments/)
})

test("the reporter picker appears only for accounts without an employee", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/maintenance/new/page.tsx", "utf8")
  const form = readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8")
  assert.match(page, /needsReporter=\{!user\.employeeId\}/)
  assert.match(form, /needsReporter \?/)
})

test("recording PM from a plan pre-fills the plan and its asset", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/maintenance/new/page.tsx", "utf8")
  assert.match(page, /planId/)
  assert.match(page, /planState: "active"/)
})

test("the repair form uses the shared fields, a busy save button and an underlined link on the warning (2C batch 1a)", () => {
  const source = readFileSync("src/components/maintenance/repair-record-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.doesNotMatch(source, /function Field\(|const (?:inputClass|textareaClass)\b|<input|<textarea|Loader2/)
  // Each Field names its control and shows its error (v-track plan 2 M4).
  assert.match(source, /<Field label=\{t\("date"\)\} id="repair-record-date" required error=\{fieldErrors\.message\("reportedDate"\)\}>\n\s+<Input type="date" required /)
  assert.match(source, /<Field label=\{t\("problem"\)\} id="repair-record-problem" required error=\{fieldErrors\.message\("problem"\)\}>\n\s+<Textarea\n\s+required\n\s+rows=\{3\}\n\s+maxLength=\{4000\}/)
  assert.match(source, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "decoration-current"\)\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\} className="w-full sm:w-auto">\n\s+<Save \/>\n\s+\{t\("save"\)\}/)
})

// Closing a repair sets the asset's condition (group 3 spec §19.4): ใช้งานได้ asks สภาพหลังซ่อม (ดี/พอใช้) with the
// shared condition chips, ซ่อมไม่ได้ says the condition becomes ซาก, and the pages pass the options and the start.
test("the complete dialog and the record form ask the condition after a usable repair and say ซาก for one beyond repair", () => {
  const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  for (const [path, id, hook, usable, beyond] of [
    ["src/components/maintenance/repair-record-actions.tsx", "repair-complete-condition", "completeErrors", 'complete.outcome === "usable"', 'complete.outcome === "beyond_repair"'],
    ["src/components/maintenance/repair-record-form.tsx", "repair-create-condition", "fieldErrors", "isUsableDone(values)", 'values.outcome === "beyond_repair"'],
  ] as const) {
    const source = read(path)
    assert.match(source, /import \{ AssetConditionChoice \} from "@\/components\/asset-operations\/condition-choice"/, path)
    const choice = source.match(/<AssetConditionChoice\n([\s\S]*?)\n\s+\/>/)
    assert.ok(choice, path)
    for (const prop of [`id="${id}"`, 'legend={t("conditionAfterRepair")}', "options={conditionOptions}", "required", `error={${hook}.message("conditionId")}`]) {
      assert.ok(choice[1].includes(prop), `${path}: ${prop}`)
    }
    assert.ok(source.includes(`{${usable} ? (\n`), `${path}: only a usable repair asks it`)
    // The ซาก line is the outcome group's hint, so the group's aria-describedby reads it with the choice (final review M9).
    assert.ok(source.includes(`hint={${beyond} ? t("conditionBecomesSalvage") : undefined}`), `${path}: the ซาก line`)
    assert.doesNotMatch(source, /<p className="text-sm text-muted-foreground">\{t\("conditionBecomesSalvage"\)\}<\/p>/, path)
    assert.ok(source.includes("conditionOptions: Option[]\n  initialConditionId: string"), `${path}: the props`)
  }
  for (const path of ["src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx", "src/app/[locale]/(dashboard)/maintenance/new/page.tsx"]) {
    const source = read(path)
    assert.match(source, /getRepairConditionOptions\(/, path)
    assert.match(source, /orderBy: \{ sortOrder: "asc" \}/, path)
    assert.match(source, /initialConditionId=\{repairConditionDefault\(/, path)
  }
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.repairRecord.conditionAfterRepair, "สภาพหลังซ่อม")
  assert.equal(en.repairRecord.conditionAfterRepair, "Condition after repair")
  assert.equal(th.repairRecord.conditionBecomesSalvage, "สภาพของทรัพย์สินจะเปลี่ยนเป็น ซาก")
  assert.equal(en.repairRecord.conditionBecomesSalvage, "The asset's condition becomes Salvage.")
  assert.equal(th.apiErrors.conditionAfterRepairRequired, "เลือกสภาพหลังซ่อม")
  assert.equal(en.apiErrors.conditionAfterRepairRequired, "Choose the condition after repair.")
  assert.equal(th.apiErrors.invalidConditionAfterRepair, "สภาพนี้ใช้หลังซ่อมไม่ได้ เลือก ดี หรือ พอใช้")
  assert.equal(en.apiErrors.invalidConditionAfterRepair, "Choose Good or Fair after a repair.")
})

test("an asset picked on the record form pre-chooses ดี or พอใช้ from its own condition (final review M1)", () => {
  const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  const form = read("src/components/maintenance/repair-record-form.tsx")
  assert.ok(form.includes('import { repairConditionDefault } from "@/lib/asset-lifecycle-policy"'))
  assert.ok(form.includes('setField("conditionId", repairConditionDefault(option?.conditionId ?? null, conditionOptions))'))
  const select = read("src/components/maintenance/maintenance-option-select.tsx")
  assert.ok(select.includes("onChange: (value: string, option?: MaintenanceOption) => void"))
  assert.ok(select.includes("conditionId?: string"))
})
