import { prisma } from "@/lib/db"

export async function generateAssetTag({
  companyId,
  branchId,
  categoryId,
}: {
  companyId: string
  branchId: string
  categoryId: string
}) {
  const [company, branch, category, digitsSetting] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { code: true } }),
    prisma.branch.findUnique({ where: { id: branchId }, select: { code: true } }),
    prisma.assetCategory.findUnique({ where: { id: categoryId }, select: { code: true } }),
    prisma.systemSetting.findUnique({ where: { key: "asset_tag_running_digits" }, select: { value: true } }),
  ])

  if (!company || !branch || !category) {
    throw new Error("Invalid asset tag master data")
  }

  const digits = Number(digitsSetting?.value ?? 5)
  const prefix = `${company.code}-${branch.code}-${category.code}`
  const count = await prisma.asset.count({
    where: {
      companyId,
      branchId,
      categoryId,
      assetTag: { startsWith: `${prefix}-` },
    },
  })

  for (let offset = 1; offset <= 100; offset += 1) {
    const running = String(count + offset).padStart(Number.isFinite(digits) ? digits : 5, "0")
    const assetTag = `${prefix}-${running}`
    const existing = await prisma.asset.findUnique({ where: { assetTag }, select: { id: true } })
    if (!existing) return assetTag
  }

  throw new Error("Unable to generate unique asset tag")
}
