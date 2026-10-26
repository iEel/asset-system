import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findJsxTags, hasJsxAttr } from "./helpers/source-files.ts"

// Phase 2C batch 3 (spec 2C §8.9 "ชุด 3"): the new audit round form on the shared fields and buttons. The form is CRLF
// in the working tree, so the source is read with \r stripped before the multi-line regexes.
const source = readFileSync("src/components/audit/audit-round-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the audit round form uses the shared fields, the sample-rate hint and a busy create button (2C batch 3; group 2 spec §7)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select\b|<textarea\b|<button\b|Loader2|ml-1 text-danger|mt-1\.5 text-xs text-muted-foreground/)
  assert.doesNotMatch(source, /<input\b/, "the include-closed checkbox is a ChoiceCard since plan 2D-4")
  const inputs = findJsxTags(source, ["Input"])
  assert.equal(inputs.length, 5)
  assert.equal(inputs.filter((tag) => hasJsxAttr(tag.text, "required")).length, 5, "every round field keeps its required attribute (validate() restates it, v-track U1)")
  // Each Field names its control and shows its error (v-track plan 2 U1).
  assert.equal(source.match(/<Field label=\{t\("(?:name|startDate)"\)\} id="audit-round-[\w-]+" required error=\{fieldErrors\.message\("\w+"\)\}>/g)?.length, 2)
  assert.match(source, /<Field label=\{t\("endDate"\)\} id="audit-round-end-date" required hint=\{t\("endDateHint"\)\} error=\{fieldErrors\.message\("endDate"\)\}>/)
  assert.match(source, /<Field\n\s+label=\{t\("auditYear"\)\}\n\s+id="audit-round-year"\n\s+required\n[^\n]*\n\s+>/)
  assert.match(source, /<Field\n\s+label=\{t\("sampleRate"\)\}\n\s+id="audit-round-sample-rate"\n\s+required\n\s+hint=\{t\("sampleRateHelp"\)\}\n[^\n]*\n\s+>/)
  assert.match(source, /<Field label=\{label\} id=\{id\} required=\{required\} error=\{error\}>\n\s+<NativeSelect value=\{value\} required=\{required\} onChange=\{\(event\) => onChange\(event\.target\.value\)\}>/)
  assert.doesNotMatch(source, /audit-round-status|values\.status|t\("status"\)|statusDraft|statusOpen/, "a new round always opens: no status field (group 2 spec §14)")
  assert.match(source, /<ChoiceCard\s+type="checkbox"\s+className="md:col-span-2"/)
  assert.doesNotMatch(source, /handlePreview|previewing|t\("preview"\)|<StatStrip\b/, "the live count replaces the preview button (group 2 spec §7)")
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{t\("createRound"\)\}/)
})

test("the round form: a trail, three numbered sections, conditions as chips with a searchable picker, the advanced options folded, a live summary and a save bar that says what it creates (group 2 spec §7, R10)", () => {
  // The trail ends on the page's word, not a code.
  assert.match(source, /breadcrumbs=\{\[\{ label: t\("title"\), href: `\/\$\{locale\}\/audit\/rounds` \}, \{ label: t\("createRound"\) \}\]\}/)
  for (const [number, key] of [[1, "sectionNameDates"], [2, "sectionScope"], [3, "sectionAdvanced"]] as const) {
    assert.match(source, new RegExp(`<FormSection number=\\{${number}\\} title=\\{t\\("${key}"\\)\\}>`), key)
  }
  // The end date a month after the start (bug §13.7), with its hint.
  assert.match(source, /const startDate = toLocalDateInputValue\(\)\n[\s\S]*?endDate: addMonthsToDateKey\(startDate, 1\),/)
  // Each scope condition: an entry with its picker id, the add menu, the picker, and the chip that removes it.
  for (const picker of ["company", "branch", "department", "location", "category", "custodian", "status", "condition"]) {
    assert.ok(source.includes(`id: "audit-round-scope-${picker}"`), picker)
  }
  assert.match(source, /<DropdownMenuTrigger asChild>\n\s+<Button ref=\{addConditionRef\} type="button" variant="outline" size="sm" disabled=\{availableScopes\.length === 0\}>\n\s+<Plus aria-hidden="true" \/>\n\s+\{t\("addCondition"\)\}/)
  assert.match(source, /<DropdownMenuItem key=\{field\.key\} onSelect=\{\(\) => openScopePicker\(field\.key\)\}>/)
  assert.match(source, /<SearchableSelect\n\s+id=\{pendingField\.id\}\n\s+label=\{t\(pendingField\.label\)\}\n\s+value=""/)
  assert.match(source, /aria-label=\{t\("removeCondition", \{ condition: `\$\{t\(field\.label\)\}: \$\{label\}` \}\)\}/)
  // Disposed and retired statuses only while "รวม…" is ticked; unticking clears them (Appendix A §7).
  assert.match(source, /const statusOptions = filterAuditStatusOptions\(options\.statuses, values\.includeClosedAssets\)/)
  assert.match(source, /scopeStatusId: checked \|\| !isClosedStatusId\(options\.statuses, current\.scopeStatusId\) \? current\.scopeStatusId : "",/)
  // Section 3 folded, its line saying what is in use; an error inside opens it before focus moves.
  assert.match(source, /<details ref=\{advancedRef\}>/)
  // The last rate that parses, never "สุ่มตรวจ %" while the field is empty or out of 1-100 (final review M7).
  assert.match(source, /\{t\("advancedNow", \{ risk: t\(`riskPreset_\$\{values\.riskPreset\}`\), rate: formatCount\(shownSampleRate\) \}\)\}/)
  assert.match(source, /const shownSampleRate = parseAuditSampleRate\(values\.sampleRate\) \?\? lastSampleRate/)
  assert.match(source, /reveal: \(key\) => \{\n\s+if \(ADVANCED_FIELDS\.has\(key\) && advancedRef\.current\) advancedRef\.current\.open = true/)
  // The live count: the scope alone, 450ms after the last change, the earlier request aborted, and a refusal never
  // moves focus or shows under a field (R10). Only the save applies the server's fieldErrors.
  assert.match(source, /const scopeRequest = JSON\.stringify\(scopeBody\(values\)\)/)
  assert.match(source, /fetch\("\/api\/audit-rounds\/preview", \{[\s\S]*?body: scopeRequest,\n\s+signal: controller\.signal,/)
  assert.match(source, /\}, 450\)\n[\s\S]*?controller\.abort\(\)[\s\S]*?\}, \[scopeRequest\]\)/)
  assert.equal(source.match(/fieldErrors\.applyServer\(/g)?.length, 1)
  // The summary: the count, matched and sampled below 100%, the components note, the largest categories, the overlap,
  // the daily load and the sample behind "ดูตัวอย่างรายการ".
  assert.match(source, /\{t\("summaryTitle"\)\}/)
  assert.match(source, /preview\.sampleRate < 100 \?/)
  // The count follows the conditions (AU-New board).
  assert.match(source, /<p className="text-meta text-muted-foreground">\{t\("summaryItems"\)\}<\/p>\n\s+<p className="text-meta text-muted-foreground">\{t\("summaryLiveHint"\)\}<\/p>/)
  assert.match(source, /t\("summaryMatchedSampled", \{ matched: formatCount\(preview\.matchedAssets\), sampled: formatCount\(preview\.directSampled\) \}\)/)
  assert.match(source, /const categories = foldTopCategories\(preview\?\.categories \?\? \[\]\)/)
  assert.match(source, /<Notice tone="warning" title=\{t\("overlapWarning", \{ count: formatCount\(preview\.overlap\.count\) \}\)\}>/)
  assert.match(source, /href=\{`\/\$\{locale\}\/audit\/rounds\/\$\{round\.id\}`\}/)
  assert.match(source, /const dailyLoad = preview \? auditRoundDailyLoad\(preview\.sampledAssets, values\.startDate, values\.endDate\) : null/)
  assert.match(source, /<summary className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "list-item cursor-pointer text-sm"\)\}>\{t\("showSample"\)\}<\/summary>/)
  // The save bar: what it creates, then ยกเลิก and สร้างรอบ.
  // The live region announces settled answers only; "กำลังนับรายการ…" shows beside it, outside the region (final review M3).
  assert.match(source, /const counting = !preview && !previewFailed/)
  assert.match(source, /<StickyFormFooter\n\s+className="lg:col-span-2"\n\s+status=\{\n\s+<>\n\s+\{counting \? <span>\{footerStatus\}<\/span> : null\}\n\s+<span role="status">\{counting \? null : footerStatus\}<\/span>\n\s+<\/>\n\s+\}\n\s+>\n\s+<Link href=\{`\/\$\{locale\}\/audit\/rounds`\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>/)
  // The overlap rounds open in the same tab, so no unannounced new tab.
  assert.doesNotMatch(source, /target="_blank"/)
  // Counts are grouped (final review M6).
  assert.match(source, /t\("createSuccess", \{ count: formatCount\(payload\.generatedItems \?\? 0\) \}\)/)
  // Focus after a condition is chosen or removed goes to "+ เพิ่มเงื่อนไข" (final review M2).
  assert.match(source, /<Button ref=\{addConditionRef\} type="button" variant="outline" size="sm" disabled=\{availableScopes\.length === 0\}>/)
  assert.match(source, /function chooseCondition\(key: ScopeField\["key"\], value: string\) \{\n\s+setField\(key, value\)\n\s+setPendingScope\(null\)\n\s+focusAfterConditionChange\(key\)/)
  assert.match(source, /onClick=\{\(\) => removeCondition\(field\.key\)\}/)
  assert.match(source, /window\.requestAnimationFrame\(\(\) => \{\n\s+const add = addConditionRef\.current\n\s+if \(add && !add\.disabled\) add\.focus\(\)/)
  // The end follows the start until the person sets it (final review M1).
  assert.match(source, /endDate: auditRoundEndAfterStartChange\(value, current\.endDate, endTouched\)/)
  assert.match(source, /if \(field === "endDate"\) setEndTouched\(true\)/)
  assert.match(source, /t\("willCreate", \{ count: formatCount\(preview\.sampledAssets\) \}\)/)
  assert.match(source, /t\("willCreateNone"\)/)
  assert.match(source, /<\/StickyFormFooter>\n\s*<\/form>/, "the save bar is the form's last child")
})

test("the create form's words (group 2 spec §7)", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).auditRound
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).auditRound
  const words: Record<string, string> = {
    createRound: "สร้างรอบ",
    sectionNameDates: "ชื่อและช่วงวันที่",
    sectionScope: "ตรวจอะไรบ้าง",
    sectionAdvanced: "ตัวเลือกขั้นสูง",
    addCondition: "เพิ่มเงื่อนไข",
    advancedNow: "ตอนนี้: {risk} · สุ่มตรวจ {rate}%",
    summaryTitle: "ขอบเขตนี้ได้",
    summaryMatchedSampled: "ตรงเงื่อนไข {matched} · สุ่มได้ {sampled}",
    summaryLiveHint: "อัปเดตทุกครั้งที่เปลี่ยนเงื่อนไข",
    overlapWarning: "{count} รายการอยู่ในรอบอื่นที่เปิดอยู่แล้ว",
    dailyLoad: "ต้องตรวจเฉลี่ยวันละ {count} รายการ ตามช่วงวันที่ตั้งไว้",
    showSample: "ดูตัวอย่างรายการ",
    willCreate: "จะสร้างรอบ {count} รายการ",
  }
  for (const [key, value] of Object.entries(words)) {
    assert.equal(th[key], value, key)
    assert.equal(typeof en[key], "string", key)
  }
  for (const key of ["preview", "previewTitle", "previewHelp", "previewMatched", "previewSampled", "previewSampleRate", "previewRisk", "previewAssets", "previewComponentItems", "riskSampling", "statusDraft"]) {
    assert.equal(key in th || key in en, false, `${key} is gone`)
  }
})
