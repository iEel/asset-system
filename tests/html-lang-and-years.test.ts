import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the html lang follows the open locale", () => {
  const layout = read("src/app/layout.tsx")
  assert.match(layout, /const locale = await getLocale\(\)/)
  assert.match(layout, /<html lang=\{locale\}/)
  assert.doesNotMatch(layout, /<html lang="th"/)
})

test("the coverage heading shows the year in the reader's calendar", () => {
  assert.match(read("src/app/[locale]/(dashboard)/audit/rounds/page.tsx"), /t\("coverageTitle", \{ year: toDisplayYear\(currentYear, locale\) \}\)/)
})

test("the audit-year field shows and accepts the display year and saves Gregorian", () => {
  const form = read("src/components/audit/audit-round-form.tsx")
  assert.match(form, /auditYear: String\(toDisplayYear\(new Date\(\)\.getFullYear\(\), locale\)\)/)
  assert.match(form, /min=\{yearRange\.min\} max=\{yearRange\.max\}/)
  assert.match(form, /fromDisplayYear\(Number\(values\.auditYear\), locale\)/)
  assert.doesNotMatch(form, /min=\{2000\} max=\{2100\}/)
})
