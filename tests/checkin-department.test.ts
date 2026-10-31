import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { AssetOperationConflictError } from "../src/lib/asset-operation-claim.ts"
import {
  CHECKIN_DEPARTMENT_SETTING_KEY,
  CheckinDepartmentUnavailableError,
  DEFAULT_CHECKIN_DEPARTMENT_CODE,
  normalizeCheckinDepartmentCode,
  readCheckinDepartment,
} from "../src/lib/checkin-department.ts"

type Department = { id: string; code: string; name: string; isActive: boolean }
const it: Department = { id: "dept-it", code: "IT", name: "Information Technology", isActive: true }
const fin: Department = { id: "dept-fin", code: "FIN", name: "Finance", isActive: true }
// A stand-in for prisma or tx: the setting row (null: no row) and the department master, with every read it answers.
function fakeDb(setting: string | null, departments: Department[]) {
  const reads: unknown[] = []
  const db = {
    systemSetting: {
      findUnique: async (args: { where: { key: string } }) => {
        reads.push(["systemSetting.findUnique", args])
        return setting === null ? null : { value: setting }
      },
    },
    department: {
      findFirst: async (args: { where: { code: string; isActive: boolean } }) => {
        reads.push(["department.findFirst", args])
        const found = departments.find((department) => department.code === args.where.code && department.isActive === args.where.isActive)
        return found ? { id: found.id, code: found.code, name: found.name } : null
      },
    },
  }
  return { db: db as unknown as Parameters<typeof readCheckinDepartment>[0], reads }
}
const unavailable = (error: unknown) =>
  error instanceof CheckinDepartmentUnavailableError && error instanceof AssetOperationConflictError
  && error.code === "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE" && error.message === "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE"

test("the return department setting's key and default, and its code upper-cased (group 3 spec §12, P2-R8)", () => {
  assert.equal(CHECKIN_DEPARTMENT_SETTING_KEY, "checkin_department_code")
  assert.equal(DEFAULT_CHECKIN_DEPARTMENT_CODE, "IT")
  assert.deepEqual([" it ", "Fin", "", null, undefined].map((value) => normalizeCheckinDepartmentCode(value)), ["IT", "FIN", "", "", ""])
})

test("no saved row or an empty one reads IT, and a lower-case or padded code is upper-cased before the department is read (P2-R8)", async () => {
  for (const [setting, code] of [[null, "IT"], ["", "IT"], ["  it ", "IT"], ["fin", "FIN"]] as const) {
    const { db, reads } = fakeDb(setting, [it, fin])
    assert.equal((await readCheckinDepartment(db)).code, code, String(setting))
    assert.deepEqual(reads, [
      ["systemSetting.findUnique", { where: { key: "checkin_department_code" }, select: { value: true } }],
      ["department.findFirst", { where: { code, isActive: true }, select: { id: true, code: true, name: true } }],
    ], String(setting))
  }
  assert.deepEqual(await readCheckinDepartment(fakeDb(null, [it]).db), { id: "dept-it", code: "IT", name: "Information Technology" })
})

test("a missing or inactive return department throws the 409 refusal, and a saved code never falls back to IT (P2-R8)", async () => {
  for (const departments of [[], [{ ...it, isActive: false }]]) await assert.rejects(readCheckinDepartment(fakeDb(null, departments).db), unavailable)
  await assert.rejects(readCheckinDepartment(fakeDb("GONE", [it]).db), unavailable)
})

test("the module loads under node --test and in client code: import type from @prisma/client, relative .ts imports, no database", () => {
  const source = readFileSync("src/lib/checkin-department.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|\bprisma\./)
  for (const line of source.split(/\r?\n/).filter((line) => line.startsWith("import "))) {
    assert.match(line, /^import type \{[^}]+\} from "@prisma\/client"$|^import \{[^}]+\} from "\.\/[\w-]+\.ts"$/, line)
  }
})

test("the Organization tab edits the return department upper-cased, under the spec's name, and the page passes its words (spec §12)", () => {
  const form = readFileSync("src/components/admin/system-settings-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.ok(form.includes('import { CHECKIN_DEPARTMENT_SETTING_KEY } from "@/lib/checkin-department"\n'))
  assert.ok(form.includes('  "default_currency",\n  CHECKIN_DEPARTMENT_SETTING_KEY,\n'), "kept out of the advanced list")
  assert.match(form, /<Field label=\{labels\.checkinDepartmentCode\} hint=\{labels\.checkinDepartmentCodeHint\} error=\{settingError\(CHECKIN_DEPARTMENT_SETTING_KEY\)\}>\n\s+<Input\n\s+id="checkin-department-code"\n\s+value=\{getValue\(CHECKIN_DEPARTMENT_SETTING_KEY\)\}\n\s+onChange=\{\(event\) => setValue\(CHECKIN_DEPARTMENT_SETTING_KEY, event\.target\.value\.toUpperCase\(\)\)\}\n\s+className="uppercase"\n\s+\/>\n\s+<\/Field>/)
  const page = readFileSync("src/app/[locale]/(dashboard)/admin/settings/page.tsx", "utf8")
  assert.match(page, /checkinDepartmentCode: t\("checkinDepartmentCode"\),\s+checkinDepartmentCodeHint: t\("checkinDepartmentCodeHint"\),/)
  const words = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).systemSettingsPage
  assert.deepEqual([words("th").checkinDepartmentCode, words("en").checkinDepartmentCode], ["แผนกที่รับคืนเข้าคลัง", "Return department"])
  assert.deepEqual([words("th").checkinDepartmentCodeHint, words("en").checkinDepartmentCodeHint], [
    "รหัสแผนก เช่น IT ทรัพย์สินบุคคลและ Stock/สำรองที่รับคืนจะกลับเข้าแผนกนี้ ส่วนทรัพย์สินส่วนกลางคงแผนกเดิม",
    "A department code, such as IT. Returned Personal and Stock/Spare assets go back to this department; Shared assets keep theirs.",
  ])
})
