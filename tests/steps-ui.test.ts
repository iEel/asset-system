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

test("the component install flow shows its three steps on the shared rail (K17)", () => {
  const manager = readFileSync("src/components/assets/asset-component-manager.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(manager, /import \{ Steps \} from "@\/components\/ui\/steps"/)
  assert.match(manager, /<Steps className="mb-4" label=\{labels\.steps\.label\} steps=\{installSteps\} \/>/)
  assert.ok(manager.indexOf("<Steps ") < manager.indexOf('{installStep === "identify" ? ('), "the rail sits above the step content")
  assert.match(manager, /type InstallStep = "identify" \| "details" \| "review"/)
  for (const locale of ["th", "en"]) {
    const asset = (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { asset: Record<string, unknown> }).asset
    for (const key of ["componentInstallSteps", "componentStepIdentify", "componentStepDetails", "componentStepReview"]) {
      assert.equal(typeof asset[key], "string", `${locale}: asset.${key}`)
    }
  }
})

test("the LDAP settings steps are quiet numbered sections, not a third layer of cards (K18, 1f)", () => {
  const source = read("src/components/admin/system-settings-form.tsx")
  // Since group 12 plan 5 Task 3 a section with settings wraps its title in sectionTitle(…), which adds "แก้ n ค่า".
  const sections = [...source.matchAll(/<FormSection as="h3" number=\{(\d)\} title=\{(?:sectionTitle\()?labels\.(\w+)(?:, \[[^\]]*\]\))?\}>/g)].map((match) => `${match[1]} ${match[2]}`)
  assert.deepEqual(sections, ["1 ldapStepConnection", "2 ldapStepLoginMapping", "3 ldapStepProvisioning", "1 ldapStepSyncStrategy", "2 ldapStepOrgMapping", "3 ldapStepSchedule", "4 ldapStepPreviewApply"])
  assert.equal(source.match(/<\/FormSection>/g)?.length, 7)
  assert.doesNotMatch(source, /WizardStep/)
  // Without the step cards, 24px separates the sections on both LDAP tabs (spec 2C section 7.3), inside their
  // ContentPanel, which brings the padding since plan 2D-2.
  assert.equal(source.match(/<ContentPanel divided title=\{labels\.(?:ldapSettings|ldapSyncStrategy)\} description=\{labels\.\w+\}>\n\s+<div className="space-y-6">/g)?.length, 2)
})

test("the import panel shows its five steps on the shared rail, and the current-step label is gone (S5, batch 4)", () => {
  const panel = read("src/components/assets/asset-import-preview-panel.tsx")
  assert.match(panel, /import \{ Steps \} from "@\/components\/ui\/steps"/)
  assert.match(panel, /import \{ getLinearStepStates \} from "@\/lib\/step-states"/)
  assert.match(panel, /const importStates = getLinearStepStates\(\n\s+assetImportWizardSteps\.length,\n\s+assetImportWizardSteps\.indexOf\(wizardStep\),\n\s+wizardStep === "complete" \? "complete" : "in_progress",\n\s+\)/)
  assert.match(panel, /const importSteps = assetImportWizardSteps\.map\(\(step, index\) => \(\{ id: step, label: t\(importStepKeys\[step\]\), state: importStates\[index\] \}\)\)/)
  assert.match(panel, /<Steps label=\{t\("importPage\.steps"\)\} steps=\{importSteps\} \/>/)
  assert.match(panel, /complete: "importPage\.stepDone",/)
  assert.doesNotMatch(panel, /function WizardStep|currentStep|md:grid-cols-5/)
  // Group 4 plan 1 Task 4 (spec §6.3): the panel left the register; the import-export page is its one caller.
  for (const page of ["src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx"]) {
    const source = read(page)
    assert.doesNotMatch(source, /importWizardCurrentStep|currentStep:|wizardStep/, page)
  }
  for (const locale of ["th", "en"]) {
    const asset = (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { asset: Record<string, Record<string, unknown>> }).asset
    assert.equal(asset.importWizardCurrentStep, undefined, `${locale}: the word comes from common.stepCurrent now`)
    // Group 4 plan 5 Task 4: the step words moved to asset.importPage; the old keys are gone.
    assert.equal(asset.importWizardStepComplete, undefined, locale)
    assert.equal(typeof asset.importPage.stepDone, "string", locale)
  }
})

// Group 6 plan 3 Task 3 (spec §9.2): the next-step card replaced the stepper; its rail ends at บันทึกในรอบตัดจำหน่าย.
test("the disposal request shows its three steps on the shared rail: filed, decision, the round (S1, batch 5; group 6 spec §9.2)", () => {
  const card = read("src/components/disposal/disposal-next-step-card.tsx")
  assert.match(card, /import \{ Steps \} from "@\/components\/ui\/steps"/)
  assert.match(card, /import \{ getLinearStepStates, type StepOutcome \} from "@\/lib\/step-states"/)
  // A request someone can open has been filed: pending waits at the decision, approved at the round (spec 2C §7.2.4).
  assert.match(card, /decide: \{ current: 1, outcome: "in_progress" \},\n  own: \{ current: 1, outcome: "in_progress" \},\n  waiting: \{ current: 1, outcome: "in_progress" \},\n  approved: \{ current: 2, outcome: "in_progress" \},\n  disposed: \{ current: 2, outcome: "complete" \},\n  rejected: \{ current: 1, outcome: "rejected" \},/)
  assert.match(card, /const states = getLinearStepStates\(stepKeys\.length, plan\.current, plan\.outcome\)/)
  assert.match(card, /<Steps label=\{t\("workflowStepsLabel"\)\} steps=\{steps\} \/>/)
  assert.doesNotMatch(card, /grid grid-cols-3|text-white|aria-current|<ol\b|\bCircle\b|XCircle/, "the rail, its states and its words come from Steps")
  const words = {
    th: { label: "ขั้นตอนการตัดจำหน่าย", steps: { request: "ยื่นคำขอ", decision: "พิจารณา", round: "บันทึกในรอบตัดจำหน่าย" } },
    en: { label: "Disposal steps", steps: { request: "Request", decision: "Decision", round: "Record in a disposal round" } },
  }
  for (const locale of ["th", "en"] as const) {
    const disposal = (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { disposalPage: Record<string, { steps?: unknown }> }).disposalPage
    assert.equal(disposal.workflowStepsLabel, words[locale].label, locale)
    assert.deepEqual(disposal.requestPage.steps, words[locale].steps, locale)
    assert.equal((disposal as Record<string, unknown>).workflowSteps, undefined, `${locale}: the stepper's words went with it`)
  }
})
