// The DELETE route's refusal (409), the PUT guard's when ใช้งาน is unticked, the list's ปิดใช้งาน reason and the form's
// status lock. It counts every model and asset of the category, inactive ones too, so the wording says so: the list
// and the form header count active ones only (group 8 plan 2 final review fix 2).
export function getCategoryDeleteBlockReason({
  assets,
  models,
}: {
  assets: number
  models: number
}) {
  const reasons: string[] = []
  if (models > 0) reasons.push(`รุ่น ${models.toLocaleString("th-TH")} รายการ`)
  if (assets > 0) reasons.push(`ทรัพย์สิน ${assets.toLocaleString("th-TH")} รายการ`)
  if (reasons.length === 0) return null
  return `ปิดใช้งานหมวดหมู่นี้ไม่ได้ เพราะยังผูกกับ${joinThaiReasons(reasons)} (นับรวมที่ปิดใช้งานแล้ว)`
}

function joinThaiReasons(reasons: string[]) {
  if (reasons.length === 1) return reasons[0]
  return `${reasons.slice(0, -1).join(", ")} และ${reasons[reasons.length - 1]}`
}
