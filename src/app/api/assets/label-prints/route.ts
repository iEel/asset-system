import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import {
  LABEL_PRINT_BATCH_MAX,
  buildLabelPrintActiveAssetsWhere,
  normalizeLabelPrintAssetIds,
  normalizeLabelTapeSize,
} from "@/lib/asset-label-print-tracking"
import {
  listLabelPrintQueue,
  lookupLabelPrintRows,
  parseLabelQueueRequest,
  type LabelQueueDb,
} from "@/lib/asset-label-queue"

const labelPrintSchema = z.object({
  assetIds: z.array(z.string()).min(1).max(LABEL_PRINT_BATCH_MAX),
  tapeSize: z.string().optional().nullable(),
  reason: z.string().trim().max(500).optional().nullable(),
})

// The labels page's queue and lookup (group 4 plan 6, spec §11, call 19): asset:view, checked before the query is read.
// `?ids=` (≤ 100) answers { rows } for those ids in their order; otherwise { rows, total, ids, reprintCapped? }.
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")

    const input = parseLabelQueueRequest(new URL(request.url).searchParams)
    if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 })
    const db = prisma as unknown as LabelQueueDb
    if (input.kind === "lookup") return NextResponse.json(await lookupLabelPrintRows(db, input.ids, input.locale))
    return NextResponse.json(await listLabelPrintQueue(db, user, input.params))
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")

    const input = labelPrintSchema.parse(await request.json())
    const assetIds = normalizeLabelPrintAssetIds(input.assetIds)
    if (assetIds.length === 0) {
      return NextResponse.json({ error: "No assets selected" }, { status: 400 })
    }

    const tapeSize = normalizeLabelTapeSize(input.tapeSize)
    const reason = input.reason?.trim() || null
    const userAgent = trimNullable(request.headers.get("user-agent"), 500)
    const assets = await prisma.asset.findMany({
      where: buildLabelPrintActiveAssetsWhere(assetIds),
      select: { id: true, assetTag: true },
    })

    if (assets.length !== assetIds.length) {
      return NextResponse.json({ error: "Some assets were not found" }, { status: 404 })
    }

    const assetById = new Map(assets.map((asset) => [asset.id, asset]))
    const orderedAssets = assetIds.map((id) => assetById.get(id)).filter((asset) => asset != null)
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.assetLabelPrintBatch.create({
        data: {
          tapeSize,
          assetCount: orderedAssets.length,
          reason,
          printedBy: user.id,
          userAgent,
          items: {
            create: orderedAssets.map((asset) => ({
              assetId: asset.id,
              assetTag: asset.assetTag,
              tapeSize,
              reason,
              printedBy: user.id,
            })),
          },
        },
        select: { id: true, printedAt: true },
      })

      await tx.systemLog.create({
        data: {
          userId: user.id,
          action: "print_label",
          module: "asset_label",
          recordId: batch.id,
          newValue: JSON.stringify({
            assetIds,
            assetTags: orderedAssets.map((asset) => asset.assetTag),
            assetCount: orderedAssets.length,
            tapeSize,
          }),
          userAgent,
          remark: reason,
        },
      })

      return batch
    })

    return NextResponse.json({
      batchId: result.id,
      assetCount: orderedAssets.length,
      printedAt: result.printedAt.toISOString(),
    })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

function trimNullable(value: string | null, maxLength: number) {
  if (!value) return null
  return value.slice(0, maxLength)
}
