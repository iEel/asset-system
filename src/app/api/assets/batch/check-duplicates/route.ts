import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { buildAssetBatchDuplicateCheckSummary, findDuplicateBatchValues } from "@/lib/asset-batch-create"
import { assetBatchCreateSchema } from "@/lib/validations/asset-batch"

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "create")

    const input = assetBatchCreateSchema.parse(await request.json())
    const duplicateBatchValues = findDuplicateBatchValues(input.rows)
    const manualAssetTags = input.rows.map((row) => row.assetTag?.trim()).filter(Boolean) as string[]
    const serialNumbers = input.rows.map((row) => row.serialNumber?.trim()).filter(Boolean) as string[]

    const [existingSerials, existingAssetTags] = await Promise.all([
      serialNumbers.length
        ? prisma.asset.findMany({
            where: { isActive: true, serialNumber: { in: serialNumbers } },
            select: { serialNumber: true },
          })
        : Promise.resolve([]),
      manualAssetTags.length
        ? prisma.asset.findMany({
            where: { assetTag: { in: manualAssetTags } },
            select: { assetTag: true },
          })
        : Promise.resolve([]),
    ])

    return NextResponse.json(
      buildAssetBatchDuplicateCheckSummary({
        duplicateBatchSerials: duplicateBatchValues.serialNumbers,
        duplicateBatchAssetTags: duplicateBatchValues.assetTags,
        existingSerials: existingSerials.flatMap((asset) => (asset.serialNumber ? [asset.serialNumber] : [])),
        existingAssetTags: existingAssetTags.map((asset) => asset.assetTag),
      })
    )
  } catch (error) {
    return errorResponse(error, 400)
  }
}
