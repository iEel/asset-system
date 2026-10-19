import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { countMatchesByFile, findMatches, readSourceFiles } from "./helpers/source-files.ts"

// V track, the final plan: one whole-number rule, the label print queue's gates, a live field's polite region, and the
// form-error rule in the design docs (spec docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4.4, §4.5,
// §7.2, §7.3, §9). One test per task, appended in order. The working tree is CRLF on Windows: every read strips \r.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
const C = "src/components/"

test("one whole-number rule: every whole-number field reads its own sentence for a fraction (v-track final task 1, VF1)", async () => {
  const rules = (await import("../src/lib/validation-rules.ts")) as Record<string, unknown>
  assert.equal(typeof rules.wholeNumber, "function", "validation-rules.ts exports wholeNumber")
  const wholeNumber = rules.wholeNumber as (value: number | string | null | undefined) => string | null
  for (const value of ["0", "12", " 7 ", "2026", "1.0", "-3", "1e3", 5]) assert.equal(wholeNumber(value), null, String(value))
  for (const value of ["1.5", "40.5", "0.3", "2569.5", 2.5]) assert.equal(wholeNumber(value), "notWholeNumber", String(value))
  assert.equal(wholeNumber("abc"), "invalidNumber")
  for (const empty of ["", "  ", null, undefined]) assert.equal(wholeNumber(empty), null, "an empty value is left to required")
  const source = read("src/lib/validation-rules.ts")
  assert.match(source, /^export function wholeNumber\(value: number \| string \| null \| undefined\): RuleCode \| null \{$/m)
  assert.match(source, /^export type RuleCode = FieldErrorCode \| "endBeforeStart" \| "tooManyDecimals" \| "notWholeNumber"$/m)
  // Its own sentence, clearer than invalidNumber's "กรุณากรอกเป็นตัวเลข" (plan 3 open issue 2).
  assert.equal(messages("th").common.validation.notWholeNumber, "กรุณากรอกเป็นจำนวนเต็ม")
  assert.equal(messages("en").common.validation.notWholeNumber, "Enter a whole number")
  // Every whole-number field writes the shared rule after its range (plan 2 P-R8's three restatements are gone).
  const sites: Record<string, readonly string[]> = {
    [`${C}assets/asset-form.tsx`]: [
      'check("licenseTotalSeats", range(values.licenseTotalSeats, 0) ?? wholeNumber(values.licenseTotalSeats))',
      'check("licenseUsedSeats", range(values.licenseUsedSeats, 0) ?? wholeNumber(values.licenseUsedSeats) ?? seatsExceeded(values))',
    ],
    [`${C}audit/audit-round-form.tsx`]: [
      'check("auditYear", required(values.auditYear) ?? range(values.auditYear, yearRange.min, yearRange.max) ?? wholeNumber(values.auditYear))',
      'check("sampleRate", required(values.sampleRate) ?? range(values.sampleRate, 1, 100) ?? wholeNumber(values.sampleRate))',
    ],
    [`${C}maintenance/maintenance-plan-form.tsx`]: [
      'check("intervalDays", values.frequency === "custom" ? required(values.intervalDays) ?? range(values.intervalDays, 1, 3650) ?? wholeNumber(values.intervalDays) : null)',
    ],
    "src/lib/system-settings-field-rules.ts": [
      'if (key === "asset_tag_running_digits") return range(value, 1, 12) ?? wholeNumber(value)',
      "if (key === ldapSyncMaxScheduledDeactivationsKey) return range(value, 0) ?? wholeNumber(value)",
      "if (key === operationDocumentRunningDigitsKey || labelWidthKeys.has(key) || labelHeightKeys.has(key) || labelQrSizeKeys.has(key)) return wholeNumber(value)",
      // A label's margin and gap keep their 0.5 step (not a whole number).
      "if (labelSpacingKeys.has(key)) return step(value, 0.5)",
    ],
  }
  for (const [path, lines] of Object.entries(sites)) {
    const text = read(path)
    for (const line of lines) assert.ok(text.includes(line), `${path}: ${line}`)
    assert.match(text, /^import \{[^}]*\bwholeNumber\b[^}]*\} from "@\/lib\/validation-rules"$/m, path)
    assert.doesNotMatch(text, /pattern\(String\(|function wholeNumber\(|Number\.isInteger\(Number\(value\.trim/, `${path}: no rule of its own`)
  }
  // No form restates a whole number with step(v, 1) any more.
  assert.deepEqual(findMatches(readSourceFiles("src"), /\bstep\([^()]*, 1\)/g), [])
})
