import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getDisposalApiErrorMessage } from "../src/lib/disposal-error-message.ts"

// Every code getDisposalApiErrorMessage translates must have its text, or the page shows the raw key
// "disposalPage.errors.<code>" (group 6 plan 4 final review: the round form's DISPOSAL_CONCURRENT_UPDATE).
const source = readFileSync("src/lib/disposal-error-message.ts", "utf8")
const localizedCodes = [...source.slice(0, source.indexOf("])")).matchAll(/"(DISPOSAL_[A-Z_]+)"/g)].map((match) => match[1])

for (const locale of ["th", "en"]) {
  test(`every localized disposal error code has a disposalPage.errors text in ${locale}`, () => {
    const errors = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage.errors as Record<string, string>
    assert.ok(localizedCodes.length > 30)
    assert.deepEqual(localizedCodes.filter((code) => typeof errors[code] !== "string" || errors[code].trim() === ""), [])
  })
}

test("a round save that lost a race reads the concurrent-update text, not the raw key", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).disposalPage as { errors: Record<string, string> }
  const translate = (key: string) => key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], th) as string
  assert.equal(
    getDisposalApiErrorMessage({ code: "DISPOSAL_CONCURRENT_UPDATE" }, translate, "fallback"),
    "คำขอตัดจำหน่ายนี้ถูกเปลี่ยนแปลงโดยผู้ใช้อื่น กรุณาตรวจสอบใหม่",
  )
})
