import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The rules mirror docs/19_THAI_GLOSSARY.md — change both together.
type Rule = { term: string; pattern: RegExp; use: string }
const rules: Rule[] = [
  { term: "Finding", pattern: /finding/i, use: "รายการไม่ตรงทะเบียน" },
  { term: "Scope", pattern: /scope/i, use: "ขอบเขต / นอกขอบเขต" },
  { term: "Review", pattern: /review/i, use: "พิจารณา" },
  { term: "Asset Tag / Tag", pattern: /asset tag|\btag\b/i, use: "รหัสทรัพย์สิน" },
  { term: "Audit", pattern: /\baudit\b/i, use: "ตรวจนับ / ประวัติการแก้ไข" },
  { term: "Label", pattern: /\blabel\b/i, use: "ป้าย" },
  { term: "Template", pattern: /template/i, use: "แม่แบบ" },
  { term: "Prefix", pattern: /prefix/i, use: "คำนำหน้ารหัส" },
  { term: "workflow", pattern: /workflow/i, use: "ขั้นตอนงาน" },
  { term: "Checklist", pattern: /checklist/i, use: "รายการตรวจ" },
  { term: "action plan", pattern: /action plan/i, use: "แผนแก้ไข" },
  { term: "Preview", pattern: /preview/i, use: "ตัวอย่าง" },
  { term: "Filter", pattern: /\bfilter\b/i, use: "ตัวกรอง" },
  { term: "Role", pattern: /\brole\b/i, use: "บทบาท" },
  { term: "Timeline", pattern: /timeline/i, use: "ลำดับเหตุการณ์" },
  { term: "Lifecycle", pattern: /lifecycle/i, use: "วงจรทรัพย์สิน" },
  { term: "Running number", pattern: /running/i, use: "เลขลำดับ" },
  { term: "Retention", pattern: /retention/i, use: "ระยะเวลาเก็บ" },
  { term: "Sync", pattern: /\bsync\b/i, use: "ซิงก์" },
  { term: "Location", pattern: /\blocation\b/i, use: "ที่ตั้ง" },
  { term: "Asset", pattern: /\basset\b/i, use: "ทรัพย์สิน" },
  { term: "พื้นที่", pattern: /พื้นที่/, use: "ที่ตั้ง" },
  { term: "ผู้ครอบครอง", pattern: /ผู้ครอบครอง/, use: "ผู้ถือครอง" },
  { term: "ผู้ถือ (ย่อ)", pattern: /ผู้ถือ(?!ครอง)/, use: "ผู้ถือครอง" },
  { term: "เบิกใช้งานชั่วคราว / ถูกเบิก", pattern: /เบิกใช้งานชั่วคราว|ถูกเบิก/, use: "ยืมใช้ชั่วคราว / ถูกยืม" },
  { term: "ตรวจทาน", pattern: /ตรวจทาน/, use: "พิจารณา" },
  { term: "หมวด (ย่อ)", pattern: /หมวด(?!หมู่)/, use: "หมวดหมู่" },
  // Group 4 plan 3 (P3-R1): documents are counted in ใบ; "ฉบับสมบูรณ์" and other senses stay legal.
  { term: "ฉบับ (นับเอกสาร)", pattern: /number\}\s*ฉบับ/, use: "ใบ" },
  // Group 4 plan 3 Task 5: the two parts of เอกสารจัดซื้อ in the asset form, and its add button.
  // Group 4 plan 3 Task 6: the batch's old checkbox list went; assets linked to a document are counted in เครื่อง (P3-R1).
  { term: "ผูกแล้ว n ทรัพย์สิน", pattern: /ผูกแล้ว\s*(?:\d+\s*)?ทรัพย์สิน/, use: "ผูกกับ n เครื่อง" },
  { term: "เลือกเอกสารกลางที่มีอยู่ / สร้างเอกสารกลางใหม่ / เพิ่มเอกสารเข้าคิวบันทึก", pattern: /เลือกเอกสารกลางที่มีอยู่|สร้างเอกสารกลางใหม่|เพิ่มเอกสารเข้าคิวบันทึก/, use: "เลือกเอกสารที่มีอยู่ / อัปโหลดเอกสารใหม่ / + เพิ่มอีกใบ" },
  // Group 4 plan 4 (P4-R6): the repair action reads บันทึกซ่อม. Narrow on purpose: only a value that starts with the
  // word (a button or action label); "ใบแจ้งซ่อม", "วันที่แจ้งซ่อม" and the like inside a sentence stay legal.
  { term: "แจ้งซ่อม (ชื่อปุ่มหรือการกระทำ)", pattern: /^\s*แจ้งซ่อม/, use: "บันทึกซ่อม" },
  // Group 4 plan 6 (P6-R6): an asset whose tag changed after its last print is ต้องพิมพ์ใหม่, never "พิมพ์ซ้ำ".
  { term: "พิมพ์ซ้ำ", pattern: /พิมพ์ซ้ำ/, use: "ต้องพิมพ์ใหม่" },
  // Group 5 plan 1 (decision 5): every due date that has passed reads เกินกำหนด, never เลยกำหนด.
  { term: "เลยกำหนด", pattern: /เลยกำหนด/, use: "เกินกำหนด" },
  // Group 6 plan 3 (user 2026-11-04): the execute words carry no "จริง".
  { term: "ตัดจำหน่ายจริง", pattern: /ตัดจำหน่ายจริง/, use: "บันทึกตัดจำหน่าย" },
  // Inspection-confirm plan 1: the finding word reads รายการไม่ตรงทะเบียน; the short form and a doubled ทะเบียน are refused.
  { term: "รายการไม่ตรง (ไม่มี ทะเบียน)", pattern: /รายการไม่ตรง(?!ทะเบียน)/, use: "รายการไม่ตรงทะเบียน" },
  { term: "ทะเบียนซ้ำ", pattern: /ทะเบียนทะเบียน|รายการไม่ตรงทะเบียน.*ทะเบียน(?!ทรัพย์สิน)/, use: "รายการไม่ตรงทะเบียน" },
]

// Removed before matching: product names and allowed compounds.
const allowedPhrases = ["Asset Management System", "พื้นที่จัดเก็บ"]

// "namespace.key": "why this key may keep the word" — a reviewer must be able to check the reason.
const keyExceptions: Record<string, string> = {
  "productionReadinessPage.check_publicQrBaseUrl_description": "\"asset\" is the example host name in https://asset.company.com, not a word for readers",
  "systemSettingsPage.publicQrBaseUrlDescription": "\"asset\" is the example host name in https://asset.company.com, not a word for readers",
  "systemSettingsPage.publicQrBaseUrlPlaceholder": "the value is the example URL https://asset.company.com shown in an empty input, not a word for readers",
  "maintenancePage.statuses.reported": "the record status แจ้งซ่อม (reported) is a state of the repair record, not the repair action (P4-R6)",
  "repairRecord.detail.reportedOn": "the record header's meta \"แจ้งซ่อม {date}\" names the day the repair was reported, not the action (group 5 spec §8.1, §13 repairRecord (detail), verbatim)",
}

// Bare ICU arguments like {label} are code names, not text a reader sees. Plural/select blocks
// ({count, plural, …}) are not matched, so the Thai inside their branches is still checked.
function readableText(value: string): string {
  const withoutPlaceholders = value.replace(/\{\s*[A-Za-z_][A-Za-z0-9_]*\s*\}/g, "")
  return allowedPhrases.reduce((current, phrase) => current.split(phrase).join(""), withoutPlaceholders)
}

function brokenRules(value: string): string[] {
  const text = readableText(value)
  return rules.filter((rule) => rule.pattern.test(text)).map((rule) => rule.term)
}

function flatEntries(value: unknown, prefix: string): Array<[string, string]> {
  if (typeof value === "string") return [[prefix, value]]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => flatEntries(child, `${prefix}.${key}`))
}

const th = JSON.parse(readFileSync("messages/th.json", "utf8")) as Record<string, unknown>

// Every namespace in messages/th.json is checked.
const enforcedNamespaces: string[] = Object.keys(th)

test("cleaned Thai namespaces use the shared glossary", () => {
  const violations: string[] = []
  for (const namespace of enforcedNamespaces) {
    assert.ok(namespace in th, `unknown namespace ${namespace}`)
    for (const [key, value] of flatEntries(th[namespace], namespace)) {
      if (keyExceptions[key]) continue
      const text = readableText(value)
      for (const rule of rules) {
        if (rule.pattern.test(text)) violations.push(`${key}: "${rule.term}" → ${rule.use} :: ${value}`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

test("placeholder names are ignored but the words around them are still checked", () => {
  assert.deepEqual(brokenRules("แนบรูป {label}"), [])
  assert.deepEqual(brokenRules("พิมพ์ Label"), ["Label"])
  assert.deepEqual(brokenRules("พิมพ์ Label {label}"), ["Label"])
  assert.deepEqual(brokenRules("{count, plural, other {# Label}}"), ["Label"])
})

test("the repair rule flags แจ้งซ่อม as an action only, never ใบแจ้งซ่อม or the word inside a sentence (P4-R6)", () => {
  assert.deepEqual(brokenRules("แจ้งซ่อม"), ["แจ้งซ่อม (ชื่อปุ่มหรือการกระทำ)"])
  assert.deepEqual(brokenRules("แจ้งซ่อม {tag}"), ["แจ้งซ่อม (ชื่อปุ่มหรือการกระทำ)"])
  assert.deepEqual(brokenRules("บันทึกซ่อม"), [])
  assert.deepEqual(brokenRules("ยกเลิกใบแจ้งซ่อม"), [])
  assert.deepEqual(brokenRules("ไม่พบใบแจ้งซ่อมนี้"), [])
  assert.deepEqual(brokenRules("วันที่ซ่อมเสร็จต้องไม่ก่อนวันที่แจ้งซ่อม"), [])
})

test("the labels page words have glossary rows before use, and the page's fixed names read as the plan rules (plan 6)", () => {
  const glossary = readFileSync("docs/19_THAI_GLOSSARY.md", "utf8")
  assert.match(glossary, /\| นับป้ายในหน้าพิมพ์ป้าย \| \*\*ดวง\*\*/)
  assert.match(glossary, /\| ทรัพย์สินที่เปลี่ยนรหัสหลังพิมพ์ป้ายครั้งล่าสุด \| \*\*ต้องพิมพ์ใหม่\*\*/)
  assert.match(glossary, /\| ทรัพย์สินที่เพิ่มเข้ารายการพิมพ์แล้ว \| \*\*อยู่ในรายการพิมพ์\*\*/)
  assert.match(glossary, /\| รหัสที่ป้ายซึ่งติดอยู่ยังแสดง \(พิมพ์ก่อนเปลี่ยนรหัส\) \| \*\*ป้ายเดิม <รหัส>\*\*/)
  // The row shows it whenever the printed tag differs, in every mode and in search results (plan 6 final review).
  assert.match(glossary, /\*\*ป้ายเดิม <รหัส>\*\* ในแถวคิวและผลค้นหาเมื่อรหัสบนป้ายต่างจากรหัสปัจจุบัน \(เช่นในคิว "ต้องพิมพ์ใหม่"\) \|/)
  assert.deepEqual(brokenRules("พิมพ์ซ้ำ"), ["พิมพ์ซ้ำ"])

  const tools = th.assetTools as Record<string, unknown>
  const page = tools.labelsPage as Record<string, unknown>
  assert.equal(tools.labelSearchPlaceholder, "รหัสทรัพย์สิน ชื่อ Serial ผู้ถือครอง หรือที่ตั้ง", "P6-R12")
  // Stable hooks (plan Global Constraints) and P6-R3, P6-R8, P6-R10.
  assert.equal(page.print, "พิมพ์ป้าย {count, number} ดวง")
  assert.equal(page.testPrint, "พิมพ์ทดสอบ 1 ดวง")
  assert.equal(page.testPrintNote, "พิมพ์ทดสอบ")
  assert.equal(page.clearList, "ล้างรายการพิมพ์")
  assert.equal(page.barSummary, "{count, number} ดวงที่จะพิมพ์ · เทป {size}")
  assert.equal(page.addAllSummary, "ตรงตัวกรอง {matched, number} รายการ · อยู่ในรายการพิมพ์แล้ว {listed, number} · จะเพิ่มใหม่ {added, number}")
  assert.equal(page.addAll, "เพิ่มทั้งหมด {count, number} รายการ")
  assert.equal(page.addSome, "เพิ่ม {count, number} รายการ")
  assert.equal(page.addFirst100, "เพิ่ม 100 รายการแรก")
  assert.equal(page.addRemaining, "เหลืออีก {count, number} รายการ")
  // The board's names (recon critic X7).
  assert.equal(page.queueListLabel, "คิวป้าย {count, number} รายการ")
  assert.equal(page.filtersLabel, "ตัวกรองคิวป้าย")
  assert.equal(page.previewName, "ตัวอย่างป้ายเทป {size} ของ {tag}")
  assert.equal(page.previewPrevious, "ดวงก่อนหน้า")
  assert.equal(page.previewNext, "ดวงถัดไป")
  assert.equal(page.previewPosition, "ดวงที่ {index, number} จาก {total, number}")
  assert.equal(page.rowListed, "อยู่ในรายการพิมพ์แล้ว: {name}")
  assert.equal(page.oldTag, "ป้ายเดิม {tag}")
  // P6-R5: four modes.
  assert.deepEqual(page.mode, { unprinted: "ยังไม่เคยพิมพ์", printed: "เคยพิมพ์แล้ว", recent: "ทั้งหมดล่าสุด", reprint: "ต้องพิมพ์ใหม่" })
})

test("the disposal round word is รอบตัดจำหน่าย, never รอบจำหน่าย (group 6)", () => {
  assert.equal(readFileSync("messages/th.json", "utf8").includes("รอบจำหน่าย"), false)
})

test("every glossary exception points at a real key and explains itself", () => {
  const keys = new Set(Object.keys(th).flatMap((namespace) => flatEntries(th[namespace], namespace).map(([key]) => key)))
  for (const [key, reason] of Object.entries(keyExceptions)) {
    assert.ok(keys.has(key), `exception for missing key ${key}`)
    assert.ok(reason.length >= 10, `exception ${key} needs a reason`)
  }
})

test("the execute words read บันทึกตัดจำหน่าย, never ตัดจำหน่ายจริง (group 6 plan 3)", () => {
  const glossary = readFileSync("docs/19_THAI_GLOSSARY.md", "utf8")
  assert.match(glossary, /\| \*\*บันทึกตัดจำหน่าย\*\* .*\| บันทึกตัดจำหน่ายจริง/)
  assert.doesNotMatch(readFileSync("messages/th.json", "utf8"), /ตัดจำหน่ายจริง/)
  assert.deepEqual(brokenRules("บันทึกตัดจำหน่ายจริง"), ["ตัดจำหน่ายจริง"])
  assert.deepEqual(brokenRules("บันทึกตัดจำหน่าย"), [])
  const page = th.disposalPage as Record<string, unknown>
  assert.equal((page.types as Record<string, unknown>).dispose, "ตัดจำหน่าย") // the user kept the word (2026-11-04)
  // No "จริง" on the value labels either (user 2026-11-04); the request's old estimates read ที่ประเมิน.
  assert.equal(page.actualSaleValue, "มูลค่าขาย")
  assert.equal(page.saleValue, "มูลค่าขายที่ประเมิน")
  assert.equal(page.executionDetail, "รายละเอียดการดำเนินการ")
  assert.equal(page.executeDisposal, "บันทึกตัดจำหน่าย")
  // Task 3: the request page's rail ends at the round (spec §9.2); the stepper's workflowSteps went with the stepper.
  assert.equal(page.workflowSteps, undefined)
  assert.equal(((page.requestPage as Record<string, unknown>).steps as Record<string, unknown>).round, "บันทึกในรอบตัดจำหน่าย")
})

test("the finding word reads รายการไม่ตรงทะเบียน (inspection-confirm plan 1)", () => {
  assert.deepEqual(brokenRules("ดูรายการไม่ตรง"), ["รายการไม่ตรง (ไม่มี ทะเบียน)"])
  assert.deepEqual(brokenRules("ดูรายการไม่ตรงทะเบียน"), [])
  assert.deepEqual(brokenRules("ที่ตั้งไม่ตรง"), [])
  // The user asked (2026-11-09) that the approved-no-change toast not repeat ทะเบียน; ทะเบียนทรัพย์สิน stays legal.
  assert.deepEqual(brokenRules("อนุมัติรายการไม่ตรงทะเบียนสำเร็จ ทะเบียนไม่เปลี่ยน"), ["ทะเบียนซ้ำ"])
  assert.deepEqual(brokenRules("รายการไม่ตรงทะเบียนในทะเบียนทรัพย์สิน"), [])
  assert.equal((th.auditFinding as Record<string, unknown>).approvedSuccessNoRegisterChange, "อนุมัติรายการไม่ตรงทะเบียนสำเร็จ ข้อมูลทรัพย์สินไม่เปลี่ยน")
  assert.equal((th.nav as Record<string, unknown>).auditFinding, "รายการไม่ตรงทะเบียน")
  assert.equal((th.auditFinding as Record<string, unknown>).title, "รายการไม่ตรงทะเบียนจากการตรวจนับ")
  assert.equal((th.systemLogPage as Record<string, unknown>).field_findingType, "ประเภทรายการไม่ตรงทะเบียน")
  assert.equal((th.auditRound as Record<string, unknown>).multipleFieldsNote, "บางรายการไม่ตรงทะเบียนมากกว่าหนึ่งเรื่อง")
  const glossary = readFileSync("docs/19_THAI_GLOSSARY.md", "utf8")
  assert.match(glossary, /\| ผลตรวจที่ไม่ตรงระบบ \| \*\*รายการไม่ตรงทะเบียน\*\* \|/)
  const row = glossary.split(/\r?\n/).find((line) => line.startsWith("| ผลตรวจที่ไม่ตรงระบบ |")) ?? ""
  const retired = row.split("|").map((cell) => cell.trim())[3] ?? ""
  assert.ok(retired.includes("รายการไม่ตรง (ไม่มีคำว่า ทะเบียน)"), retired)
})
