import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Page group 12 plan 3 task 2 (spec §7, board AD-DataQuality): the data-quality page. Source pins, read with \r stripped.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = () => read("src/app/[locale]/(dashboard)/admin/data-quality/page.tsx")
const form = () => read("src/components/admin/data-quality-rule-form.tsx")
const card = () => read("src/components/admin/data-quality/rule-card.tsx")
const messages = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)).dataQualityPage

test("two tabs with their numbers, the pending count for every viewer", () => {
  const source = page()
  assert.match(source, /const tab = parseDataQualityTab\(\(await searchParams\)\.tab\)/)
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("tabsLabel"\)\}\n\s+current=\{tab\}/)
  assert.match(source, /\{ key: "rules", label: t\("tabRules"\), count: formatCount\(issues\.total\), href: basePath \}/)
  assert.match(source, /\{ key: "review", label: t\("tabReview"\), count: formatCount\(reviewResult\.total\), href: `\$\{basePath\}\?tab=review` \}/)
  // The pending count is loaded for every viewer of the page, not behind setting:edit.
  assert.match(source, /listAssetStateReviews\(prisma, \{ page: 1, pageSize: 25, reviewStatus: "pending" \}\)/)
  assert.doesNotMatch(source, /canEdit \? formatCount\(reviewResult/)
  assert.match(source, /const issues = distribution\(rules, ruleCounts\)/)
  assert.match(source, /<DistributionBar\n?\s*segments=\{issues\.segments\.map/)
  assert.doesNotMatch(source, /<StatStrip|function RuleStatusCard/, "the StatStrip and the old status cards are gone")
  assert.equal(messages("th").tabRules, "ข้อมูลไม่ครบ")
  assert.equal(messages("th").tabReview, "สถานะไม่สอดคล้อง รอตรวจสอบ")
})

test("rule cards use a switch and a two-choice severity", () => {
  const source = card()
  assert.match(source, /<input\n\s+type="checkbox"\n\s+role="switch"/)
  assert.match(source, /checked=\{rule\.enabled\}/)
  assert.match(source, /<Segmented\n\s+labelledBy=\{`\$\{severityId\}-legend`\}/)
  assert.match(source, /options=\{\[\n\s+\{ value: "warning", label: labels\.warning \},\n\s+\{ value: "danger", label: labels\.danger \},\n\s+\]\}/)
  assert.match(form(), /<DataQualityRuleCard\n/)
})

test("off rules show no count; unsaved on rules say นับหลังบันทึก", () => {
  const source = card()
  assert.match(source, /countState === "off"/)
  assert.match(source, /countState === "afterSave"/)
  assert.match(source, /labels\.viewAssets\.replace\("\{count\}", formatCount\(count\)\)/)
  assert.match(source, /!rule\.enabled && "bg-background"/, "an off rule is dimmed: canvas fill and muted words")
  assert.match(source, /rule\.enabled \? "text-foreground" : "text-muted-foreground"/)
  assert.match(form(), /countsAfterSave\(rule, savedByKey\.get\(rule\.key\)\)/)
  assert.equal(messages("th").countAfterSave, "นับหลังบันทึก")
  assert.equal(messages("th").viewAssets, "ดูทรัพย์สิน {count} รายการ")
})

test("the save bar summarises the change and refreshes after save", () => {
  const source = form()
  assert.match(source, /const change = useMemo\(\(\) => rulesChange\(saved, items\), \[saved, items\]\)/)
  assert.match(source, /<StickyFormFooter status=\{/)
  assert.match(source, /onClick=\{\(\) => \{\n\s+setItems\(saved\)/, "ยกเลิก resets the draft")
  assert.match(source, /toast\.success\(labels\.saved\)\n\s+setSaved\(items\)\n\s+router\.refresh\(\)/)
  assert.match(source, /settings: \[\{ key: assetDataQualityRulesKey, value: JSON\.stringify\(items\) \}\]/, "the PUT payload is unchanged")
  assert.match(source, /fetch\("\/api\/admin\/settings", \{\n\s+method: "PUT"/)
  const th = messages("th")
  assert.equal(th.changeTurnedOn, "ปิด → เปิด {rules}")
  assert.equal(th.changeEnabled, "กฎที่เปิด {before} → {after}")
  assert.equal(th.noChanges, "ยังไม่มีการเปลี่ยนแปลง")
  assert.equal(th.saveRules, "บันทึกกฎ")
})

test("viewers without setting:edit see disabled controls and no save bar", () => {
  const source = form()
  assert.match(source, /\{canEdit \? \(\n\s+<StickyFormFooter/)
  assert.match(source, /\{canEdit \? null : <p className="text-meta text-muted-foreground">\{labels\.readOnly\}<\/p>\}/)
  assert.match(source, /disabled=\{!canEdit \|\| saving\}/)
  assert.match(card(), /disabled=\{disabled\}/)
  assert.match(page(), /canEdit=\{canEdit\}/)
  assert.equal(messages("th").readOnly, "ดูอย่างเดียว")
})

test("kept: report link, rule register links, review workspace untouched, field errors", () => {
  const source = page()
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/reports`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\n\s+\{t\("openReports"\)\}/)
  assert.match(source, /hrefs=\{Object\.fromEntries\(rules\.map\(\(rule\) => \[rule\.key, buildDataQualityRuleHref\(locale, rule\.key\)\]\)\)\}/)
  assert.match(source, /tab === "review" \? \(\n\s+<AssetStateReviewWorkspace\n\s+locale=\{locale\}\n\s+canEdit=\{canEdit\}/)
  assert.match(form(), /severityId=\{severityId\(rule\.key\)\}\n\s+error=\{fieldErrors\.message\(`\$\{rule\.key\}\.severity`\)\}/)
  assert.match(form(), /if \(fieldErrors\.applyServer\(result\) && focusFirstError\(\)\) return/)
  assert.match(card(), /<FieldGroup legend=\{labels\.severity\} id=\{severityId\} error=\{error\}>/)
})
