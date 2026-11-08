import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2C batch 4 (spec 2C §8.9, §4.8 row 1 K20, §4.12, §6.3 #5): the data-quality rule cards. Each severity select has
// a visible label and points at its rule's name, so a screen reader knows which rule it sets. Both files are CRLF in the
// working tree, so they are read with \r stripped before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

// Group 12 plan 3 Task 2 (board AD-DataQuality): the checkbox became a switch and the severity select a Segmented in a
// FieldGroup, both in data-quality/rule-card.tsx. The switch is named by its rule; the severity group by its legend,
// inside the card named by the rule; the save stays busy and keeps its label.
test("the data-quality rule form names each severity select after its rule and uses the shared field, checkbox and busy save (2C batch 4)", () => {
  const source = read("src/components/admin/data-quality-rule-form.tsx")
  const card = read("src/components/admin/data-quality/rule-card.tsx")
  assert.match(card, /\n  severity: string\n  warning: string\n  danger: string\n/)
  assert.match(card, /<h3 id=\{nameId\} className=\{cn\("font-semibold", rule\.enabled \? "text-foreground" : "text-muted-foreground"\)\}>\{name\}<\/h3>/)
  assert.match(card, /<article aria-labelledby=\{nameId\}/)
  assert.match(card, /<FieldGroup legend=\{labels\.severity\} id=\{severityId\} error=\{error\}>\n\s+<Segmented\n\s+labelledBy=\{`\$\{severityId\}-legend`\}\n\s+value=\{rule\.severity\}/)
  assert.match(card, /<input\n\s+type="checkbox"\n\s+role="switch"\n\s+checked=\{rule\.enabled\}\n\s+aria-labelledby=\{nameId\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{labels\.saveRules\}\n\s+<\/Button>/)
  assert.doesNotMatch(source + card, /<select|<button|rounded border-border|focus:border-ring|NativeSelect/)

  const page = read("src/app/[locale]/(dashboard)/admin/data-quality/page.tsx")
  assert.match(page, /<DataQualityRuleForm\n(?:[^\n]*\n)*?\s+severity: t\("assetStateReviews\.severity"\),\n\s+warning: t\("warning"\),\n\s+danger: t\("danger"\),/, "the page passes the existing severity label")
})
