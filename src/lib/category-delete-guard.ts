export function getCategoryDeleteBlockReason({
  assets,
  models,
}: {
  assets: number
  models: number
}) {
  const reasons: string[] = []
  if (assets > 0) reasons.push(`ทรัพย์สิน ${assets.toLocaleString("th-TH")} รายการ`)
  if (models > 0) reasons.push(`รุ่น ${models.toLocaleString("th-TH")} รายการ`)
  if (reasons.length === 0) return null
  return `ไม่สามารถลบหมวดหมู่นี้ได้ เพราะยังมี${joinThaiReasons(reasons)}ใช้งานอยู่`
}

function joinThaiReasons(reasons: string[]) {
  if (reasons.length === 1) return reasons[0]
  return `${reasons.slice(0, -1).join(", ")} และ${reasons[reasons.length - 1]}`
}
