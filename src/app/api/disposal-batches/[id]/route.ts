import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { isDisposalBatchSchemaReady } from "@/lib/disposal-schema-readiness"

type DisposalBatchContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: DisposalBatchContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "disposal", "view")
    if (!(await isDisposalBatchSchemaReady())) {
      return NextResponse.json({ code: "DISPOSAL_BATCH_SCHEMA_REQUIRED", error: "Disposal batch database migration is required" }, { status: 503 })
    }
    const { id } = await context.params
    const batch = await prisma.disposalBatch.findFirst({
      where: { id, isActive: true },
      include: {
        requestedBy: { select: { code: true, fullNameTh: true } },
        approver: { select: { code: true, fullNameTh: true } },
        disposalRequests: {
          where: { isActive: true },
          include: { asset: { select: { assetTag: true, name: true } } },
          orderBy: { disposalNo: "asc" },
        },
      },
    })
    if (!batch) return NextResponse.json({ code: "DISPOSAL_BATCH_NOT_FOUND", error: "Disposal batch not found" }, { status: 404 })
    return NextResponse.json(batch)
  } catch (error) {
    return errorResponse(error)
  }
}
