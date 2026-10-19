// What the field audit walk (spec §6.2) creates for one project, as plain data: its own department (the round's scope),
// two rooms, the assets of the walk and of the IT head's own round, and the words the walk types. Every code, tag and
// name carries the run id and the project's short code, so the four projects never share a record (spec §11 "Run
// order") and a person sees the marker in every list. tests/e2e-audit.test.ts pins it; e2e/audit/audit-data.ts creates
// it through the app. Imports nothing, so the unit test can load it.

// The project's short code in its records (desktop-light → DL).
export function projectCode(projectName: string): string {
  const code = { "desktop-light": "DL", "desktop-dark": "DD", "phone-light": "PL", "phone-dark": "PD" }[projectName]
  if (!code) throw new Error(`no short code for the project ${projectName}`)
  return code
}

export type AuditAssetKey = "matched" | "mismatch" | "parent" | "component1" | "component2" | "notFound" | "offline" | "outOfScope"

export type AuditAssetPlan = {
  key: AuditAssetKey
  tag: string
  name: string
  room: "roomA" | "roomB"
  // In the round's department, or the run's own (the out-of-scope asset).
  department: "round" | "run"
  category: "desktop" | "component"
}

// The walk (spec §6.2.2–3): in room A one matched, one mismatch (another department and the condition, with the photo),
// a parent with two installed components; in room B one not found and one saved offline; and one asset of the run's
// department in room A, outside the round's scope.
export function auditRecords(runId: string, projectName: string) {
  const code = projectCode(projectName)
  const prefix = `${runId}-${code}`
  const asset = (key: AuditAssetKey, suffix: string, name: string, room: AuditAssetPlan["room"], extra: Partial<AuditAssetPlan> = {}): AuditAssetPlan => ({
    key,
    tag: `${prefix}-${suffix}`,
    name: `${runId} ${code} ${name}`,
    room,
    department: "round",
    category: "desktop",
    ...extra,
  })
  const assets: AuditAssetPlan[] = [
    asset("matched", "A1", "จอภาพ", "roomA"),
    asset("mismatch", "A2", "เครื่องพิมพ์", "roomA"),
    asset("parent", "P1", "คอมพิวเตอร์ตั้งโต๊ะ", "roomA"),
    asset("component1", "C1", "หน่วยความจำ", "roomA", { category: "component" }),
    asset("component2", "C2", "ฮาร์ดดิสก์", "roomA", { category: "component" }),
    asset("notFound", "A4", "โปรเจกเตอร์", "roomB"),
    asset("offline", "A5", "สแกนเนอร์", "roomB"),
    asset("outOfScope", "X1", "โทรศัพท์", "roomA", { department: "run" }),
  ]
  return {
    code,
    department: { code: `${prefix}-D`, name: `${runId} ${code} แผนกตรวจนับ` },
    rooms: {
      roomA: { code: `${prefix}-RA`, name: `${runId} ${code} ห้อง A`, locationType: "Room" as const },
      roomB: { code: `${prefix}-RB`, name: `${runId} ${code} ห้อง B`, locationType: "Room" as const },
    },
    assets,
    components: [
      { key: "component1" as const, role: "หน่วยความจำ", slotNo: "1" },
      { key: "component2" as const, role: "ฮาร์ดดิสก์", slotNo: "2" },
    ],
    round: { name: `${runId} ${code} ตรวจนับประจำปี` },
    ownRound: { name: `${runId} ${code} รอบของหัวหน้า IT` },
    // A tag no asset has: the typed search finds nothing in the round and nothing in the register.
    unknownTag: `${prefix}-ZZ9`,
  }
}

export type AuditRecords = ReturnType<typeof auditRecords>
