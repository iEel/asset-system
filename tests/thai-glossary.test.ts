import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The rules mirror docs/19_THAI_GLOSSARY.md — change both together.
type Rule = { term: string; pattern: RegExp; use: string }
const rules: Rule[] = [
  { term: "Finding", pattern: /finding/i, use: "รายการไม่ตรง" },
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
]

// Removed before matching: product names and allowed compounds.
const allowedPhrases = ["Asset Management System", "พื้นที่จัดเก็บ"]

// "namespace.key": "why this key may keep the word" — a reviewer must be able to check the reason.
const keyExceptions: Record<string, string> = {
  "productionReadinessPage.check_publicQrBaseUrl_description": "\"asset\" is the example host name in https://asset.company.com, not a word for readers",
  "systemSettingsPage.publicQrBaseUrlDescription": "\"asset\" is the example host name in https://asset.company.com, not a word for readers",
  "systemSettingsPage.publicQrBaseUrlPlaceholder": "the value is the example URL https://asset.company.com shown in an empty input, not a word for readers",
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

test("every glossary exception points at a real key and explains itself", () => {
  const keys = new Set(Object.keys(th).flatMap((namespace) => flatEntries(th[namespace], namespace).map(([key]) => key)))
  for (const [key, reason] of Object.entries(keyExceptions)) {
    assert.ok(keys.has(key), `exception for missing key ${key}`)
    assert.ok(reason.length >= 10, `exception ${key} needs a reason`)
  }
})
