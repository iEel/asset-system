import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2C K17 and K18 (spec 2C sections 7.2.2-7.2.3 and 7.3, I18, I19). Call sites join this file in 1e, 1f, 1c, batch 4 and batch 5.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const common = (locale: "th" | "en") => (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { common: Record<string, unknown> }).common
const serverUnsafe = /"use client"|\buse(?:State|Effect|LayoutEffect|Context)\b|\bcreateContext\b/

test("Steps is a named ordered list with at most one current step, and renders on server pages", () => {
  const source = read("src/components/ui/steps.tsx")
  assert.doesNotMatch(source, serverUnsafe, "S1 is a server page: useTranslations is the only hook")
  assert.match(source, /const t = useTranslations\("common"\)/)
  assert.match(source, /import \{ getStepFocusIndex, type StepState \} from "@\/lib\/step-states"/)
  assert.match(source, /export type StepItem = \{ id: string; label: string; state: StepState \}/)
  assert.match(source, /<div data-slot="steps" className=\{className\}>/)
  assert.match(source, /<ol aria-label=\{label\} className="flex items-start gap-2">/)
  assert.match(source, /aria-current=\{step\.state === "current" \? "step" : undefined\}/)
  assert.match(source, /className="flex min-w-0 flex-1 items-start gap-2 last:flex-none"/)
  assert.doesNotMatch(source, /<(?:a|button|Link)\b|href=/, "a step is not a link or a button, so it must not look like TabNav")
})

test("Steps markers are 22px circles that show the state by shape, not by color alone", () => {
  const source = read("src/components/ui/steps.tsx")
  assert.match(source, /const markerBase = "inline-flex size-5\.5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold num"/)
  assert.match(source, /complete: "border-success-border bg-success-soft text-success",/)
  assert.match(source, /current: "border-primary bg-primary-soft text-primary-hover",/)
  assert.match(source, /upcoming: "border-control-border bg-surface text-faint-foreground",/)
  assert.match(source, /rejected: "border-danger-border bg-danger-soft text-danger",/)
  assert.match(source, /complete: "text-muted-foreground",/)
  assert.match(source, /current: "font-semibold text-foreground",/)
  assert.match(source, /upcoming: "text-faint-foreground",/)
  assert.match(source, /rejected: "font-medium text-danger",/)
  assert.match(source, /<Check className="size-3\.5" strokeWidth=\{2\.75\} \/>/)
  assert.match(source, /<X className="size-3\.5" strokeWidth=\{2\.75\} \/>/)
  assert.match(source, /: index \+ 1\}/, "complete shows a check, rejected an X, the rest their number")
  assert.match(source, /"mt-2\.75 h-px min-w-3 flex-1", step\.state === "complete" \? "bg-success-border" : "bg-border"/)
  assert.doesNotMatch(source, /text-white|\bbg-primary(?![\w-])|opacity-|shadow-|leading-tight|rounded-\[/)
})

test("below md the rail keeps only its markers, and one hidden-from-readers line says which step this is", () => {
  const source = read("src/components/ui/steps.tsx")
  assert.match(source, /<span className=\{cn\("min-w-0 pt-px text-meta max-md:sr-only", labelByState\[step\.state\]\)\}>/)
  assert.match(source, /<span className="sr-only">\{t\(stateWordKeys\[step\.state\]\)\}: <\/span>/)
  assert.match(source, /stateWordKeys: Record<StepState, string> = \{\n\s+complete: "stepComplete",\n\s+current: "stepCurrent",\n\s+upcoming: "stepUpcoming",\n\s+rejected: "stepRejected",\n\}/)
  assert.match(source, /<p aria-hidden="true" className="mt-2 text-meta text-faint-foreground md:hidden">/)
  assert.match(source, /<span className="num">\{t\("stepOf", \{ current: focus \+ 1, total: steps\.length \}\)\}<\/span> · /)
  assert.match(source, /const focus = getStepFocusIndex\(steps\.map\(\(step\) => step\.state\)\)/)
})

test("FormSection is a quiet numbered heading row, alone or above its body, with no current-step look", () => {
  const source = read("src/components/ui/form-section.tsx")
  assert.doesNotMatch(source, serverUnsafe)
  assert.doesNotMatch(source, /\buse[A-Z]\w*\(/, "no hook at all")
  assert.match(source, /"flex items-center gap-2\.5 border-b border-border-soft pb-2\.5"/)
  assert.match(source, /"inline-flex size-5\.5 shrink-0 items-center justify-center rounded-full border border-control-border text-xs font-semibold text-muted-foreground num"/)
  assert.match(source, /h2: "text-base font-semibold text-foreground",/)
  assert.match(source, /h3: "text-sm font-semibold text-foreground",/)
  assert.match(source, /as: Heading = "h2"/)
  assert.match(source, /data-slot="form-section-heading"/)
  assert.match(source, /<div data-slot="form-section" className=\{className\}>/)
  assert.match(source, /hasBody \? "mb-4" : className/)
  assert.doesNotMatch(source, /<section\b|aria-labelledby|bg-primary(?![\w-])|text-white/, "no landmark region per section, no filled circle")
})

test("step words exist in Thai and English", () => {
  const th = common("th")
  const en = common("en")
  assert.equal(th.stepOf, "ขั้นที่ {current} จาก {total}")
  assert.equal(en.stepOf, "Step {current} of {total}")
  assert.equal(th.stepComplete, "เสร็จแล้ว")
  assert.equal(en.stepComplete, "Done")
  assert.equal(th.stepCurrent, "ขั้นตอนปัจจุบัน")
  assert.equal(en.stepCurrent, "Current step")
  assert.equal(th.stepUpcoming, "ยังไม่ถึง")
  assert.equal(en.stepUpcoming, "Not started")
  // The same word as auditFinding.status_rejected (spec 2C I18).
  assert.equal(th.stepRejected, "ปฏิเสธแล้ว")
  assert.equal(en.stepRejected, "Rejected")
})
