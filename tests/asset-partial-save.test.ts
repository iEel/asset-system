import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Fix 2026-10-19 (V track plan 2, open issue 15): once the asset is saved, a failed follow-up step (install as a
// component, purchase documents, photos) no longer leaves the filled form open, where a second save would post the
// asset again. The form moves to the saved asset and names what did not finish.
// The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
const FORM = "src/components/assets/asset-form.tsx"

// The body of handleSubmit, up to its closing line "  }".
function handleSubmitBody(source: string) {
  const start = source.indexOf("  async function handleSubmit(")
  assert.notEqual(start, -1, "async function handleSubmit(")
  return source.slice(start, source.indexOf("\n  }\n", start))
}

test("the asset form never throws a follow-up failure into the save's catch", () => {
  const source = read(FORM)
  assert.doesNotMatch(source, /throw new Error\(installResult\?\.error/)
})

test("each follow-up step is guarded and its failure label is collected", () => {
  const body = handleSubmitBody(read(FORM))
  for (const label of ["followUpInstall", "followUpDocuments", "followUpPhotos"]) {
    assert.ok(body.includes(`t("${label}")`), `t("${label}") in handleSubmit`)
  }
  // Install, then documents, then photos.
  const order = ["followUpInstall", "followUpDocuments", "followUpPhotos"].map((label) => body.indexOf(`t("${label}")`))
  assert.deepEqual([...order].sort((a, b) => a - b), order, "install, documents, photos in that order")
  // Each step sits in its own try/catch after the save.
  const afterSave = body.slice(body.indexOf("if (!response.ok)"))
  assert.ok((afterSave.match(/\btry \{/g) ?? []).length >= 3, "a try per follow-up step")
})

test("with a failure the form warns and opens the saved asset; without one it keeps the success path", () => {
  const body = handleSubmitBody(read(FORM))
  assert.ok(body.includes('toast.warning(t("savedWithFollowUpErrors", { items: '), "the warning names the failed steps")
  assert.match(body, /router\.push\(`\/\$\{locale\}\/assets\/\$\{savedId\}`\)/, "pushes to the saved asset")
  assert.match(body, /toast\.success\(tCommon\("savedSuccess"\)\)\n\s+router\.push\(backHref\)/, "success then back")
})

test("the four new messages hold the decided texts in th and en", () => {
  const th = messages("th").asset
  const en = messages("en").asset
  assert.equal(th.savedWithFollowUpErrors, "บันทึกทรัพย์สินแล้ว แต่ {items} ไม่สำเร็จ ตรวจสอบและทำต่อได้ที่หน้านี้")
  assert.equal(en.savedWithFollowUpErrors, "The asset is saved, but {items} did not finish. Check and finish them on this page.")
  assert.equal(th.followUpInstall, "การติดตั้งเป็นส่วนควบ")
  assert.equal(en.followUpInstall, "installing it as a component")
  assert.equal(th.followUpDocuments, "เอกสารจัดซื้อ")
  assert.equal(en.followUpDocuments, "the purchase documents")
  assert.equal(th.followUpPhotos, "รูปทรัพย์สิน")
  assert.equal(en.followUpPhotos, "the asset photos")
})

test("the warning has its NON_VALIDATION_TOASTS row with count 1", () => {
  const guards = read("tests/validation-guards.test.ts")
  const row = /\[`\$\{C\}assets\/asset-form\.tsx`\]: \{ count: 1, why: "[^"]+", ruling: "asset partial save fix 2026-10-19" \}/
  assert.ok(row.test(guards), "a NON_VALIDATION_TOASTS row for assets/asset-form.tsx with count 1")
})
