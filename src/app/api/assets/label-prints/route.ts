import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import {
  buildAssetLabelPrintQueueOrderBy,
  buildAssetLabelPrintQueueWhere,
  normalizeLabelPrintQueueFilters,
  normalizeLabelPrintQueueSort,
  normalizeLabelPrintAssetIds,
  normalizeLabelTapeSize,
} from "@/lib/asset-label-print-tracking"

const labelPrintSchema = z.object({
  assetIds: z.array(z.string()).min(1).max(100),
  tapeSize: z.string().optional().nullable(),
  reason: z.string().trim().max(500).optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")

    const pageSize = clampPageSize(request.nextUrl.searchParams.get("pageSize"))
    const mode = request.nextUrl.searchParams.get("mode")
    const filters = normalizeLabelPrintQueueFilters({
      companyId: request.nextUrl.searchParams.get("companyId"),
      branchId: request.nextUrl.searchParams.get("branchId"),
      categoryId: request.nextUrl.searchParams.get("categoryId"),
      locationId: request.nextUrl.searchParams.get("locationId"),
      createdFrom: request.nextUrl.searchParams.get("createdFrom"),
      createdTo: request.nextUrl.searchParams.get("createdTo"),
    })
    const sort = normalizeLabelPrintQueueSort(request.nextUrl.searchParams.get("sort"))
    const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "th"
    const assets = await prisma.asset.findMany({
      where: buildAssetLabelPrintQueueWhere(mode, filters),
      select: {
        id: true,
        assetTag: true,
        name: true,
        serialNumber: true,
        createdAt: true,
        company: { select: { code: true, nameTh: true, nameEn: true } },
        branch: { select: { code: true, name: true } },
        category: { select: { code: true, name: true } },
        brand: { select: { name: true } },
        model: { select: { name: true } },
        currentLocation: { select: { code: true, name: true } },
        custodian: { select: { code: true, fullNameTh: true } },
        status: { select: { name: true, nameTh: true, colorCode: true } },
        labelPrints: {
          orderBy: { printedAt: "desc" },
          take: 1,
          select: { batchId: true, tapeSize: true, printedAt: true, printedBy: true },
        },
        _count: { select: { labelPrints: true } },
      },
      orderBy: buildAssetLabelPrintQueueOrderBy(sort),
      take: pageSize,
    })

    return NextResponse.json({
      data: assets.map((asset) => {
        const latestPrint = asset.labelPrints[0] ?? null
        return {
          id: asset.id,
          assetTag: asset.assetTag,
          name: asset.name,
          serialNumber: asset.serialNumber,
          createdAt: asset.createdAt.toISOString(),
          company: asset.company,
          branch: asset.branch,
          category: asset.category,
          brand: asset.brand,
          model: asset.model,
          currentLocation: asset.currentLocation,
          custodian: asset.custodian,
          status: asset.status,
          labelPrint: latestPrint
            ? {
                ...latestPrint,
                printedAt: latestPrint.printedAt.toISOString(),
                count: asset._count.labelPrints,
              }
            : { count: 0, batchId: null, tapeSize: null, printedAt: null, printedBy: null },
        }
      }),
      locale,
      pageSize,
      filters,
      sort,
    })
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
      where: { id: { in: assetIds }, isActive: true },
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

function clampPageSize(value: string | null) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 20
  return Math.min(Math.max(Math.trunc(parsed), 1), 100)
}

function trimNullable(value: string | null, maxLength: number) {
  if (!value) return null
  return value.slice(0, maxLength)
}
