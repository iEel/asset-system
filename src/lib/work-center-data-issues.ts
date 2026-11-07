// ข้อมูลไม่ครบ: the distinct active assets missing a custodian, a serial or a photo, each counted once (group 9 spec §3).
// The wheres are the register's own dataQuality rules, so the number equals the register's lists.
import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/db"
import { hasPermission, type SessionUser } from "@/lib/auth-utils"
import { buildAssetDataQualityWhere } from "@/lib/asset-list-query"
import { DEFAULT_WAITING_WORK_RULES, startOfBangkokDay } from "@/lib/waiting-work-rules"

export async function countDataIssueAssets(user: SessionUser): Promise<number | null> {
  if (!hasPermission(user, "asset", "view")) return null
  // These three rules read no day or window; the options only satisfy the builder's signature.
  const options = { today: startOfBangkokDay(new Date()), rules: DEFAULT_WAITING_WORK_RULES }
  const issues = [
    buildAssetDataQualityWhere("responsibility", options),
    buildAssetDataQualityWhere("serial", options),
    buildAssetDataQualityWhere("photo", options),
  ].filter((where): where is Prisma.AssetWhereInput => where !== null)
  return prisma.asset.count({ where: { isActive: true, OR: issues } })
}
