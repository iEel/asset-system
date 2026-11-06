import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 7 follow-ups Task 1 (G7F-R1): RecordStatusSegmented, the record-status switch with counts that replaces the
// status select on the employee list now and on the five group-8 lists later. Sources are read with \r stripped (CRLF-safe).
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const source = () => read("src/components/ui/record-status-segmented.tsx")

test("RecordStatusSegmented is server-safe and takes value, counts and hrefFor (G7F-R1)", () => {
  const text = source()
  assert.ok(!text.includes('"use client"'), "no client directive: a server page passes hrefFor")
  assert.doesNotMatch(text, /useState|useEffect|useRouter|onClick/)
  assert.match(text, /export type RecordStatusCounts = \{ active: number; inactive: number; all: number \}/)
  assert.match(text, /export function RecordStatusSegmented\(\{ value, counts, hrefFor, className \}: RecordStatusSegmentedProps\)/)
  assert.match(text, /hrefFor: \(status: RecordStatusFilter\) => string/)
  assert.match(text, /import type \{ RecordStatusFilter \} from "@\/lib\/master-data-query"/)
})

test("each status is a real link in the order ใช้งาน, ไม่ใช้งาน, ทั้งหมด, the current one with aria-current and the segmented look", () => {
  const text = source()
  assert.match(text, /const RECORD_STATUSES = \["active", "inactive", "all"\] as const/)
  assert.match(text, /<nav aria-label=\{t\("label"\)\} data-slot="record-status-segmented"/)
  assert.match(text, /<Link\n\s+href=\{hrefFor\(status\)\}\n\s+aria-current=\{selected \? "page" : undefined\}/)
  assert.match(text, /\{formatCount\(counts\[status\]\)\}/)
  assert.match(text, /useTranslations\("common\.recordStatus"\)/)
  for (const part of ["segmentedFrameClasses", "segmentedOptionClasses", "segmentedPressedClasses", "segmentedIdleClasses"]) {
    assert.ok(text.includes(part), part)
  }
  // The shared classes come from Segmented, so the link switch and the toggle switch look the same.
  const segmented = read("src/components/ui/segmented.tsx")
  for (const name of ["segmentedFrameClasses", "segmentedOptionClasses", "segmentedSizeClasses", "segmentedPressedClasses", "segmentedIdleClasses"]) {
    assert.match(segmented, new RegExp(`export const ${name} =`), name)
  }
})

test("the messages live under common.recordStatus in both locales", () => {
  const th = JSON.parse(read("messages/th.json")).common.recordStatus
  const en = JSON.parse(read("messages/en.json")).common.recordStatus
  // Group 8 plan 1 Task 2 added the five lists' "ปิดใช้งานเมื่อ {date}" line and the footer's status counts.
  assert.deepEqual(th, {
    label: "สถานะข้อมูล",
    active: "ใช้งาน",
    inactive: "ไม่ใช้งาน",
    all: "ทั้งหมด",
    deactivatedAt: "ปิดใช้งานเมื่อ {date}",
    footerCounts: "ใช้งาน {active, number} · ไม่ใช้งาน {inactive, number}",
  })
  assert.deepEqual(Object.keys(en).sort(), ["active", "all", "deactivatedAt", "footerCounts", "inactive", "label"])
})
