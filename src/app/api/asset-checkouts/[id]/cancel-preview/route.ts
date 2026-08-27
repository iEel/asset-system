import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { previewAssetTransactionCancellation } from "@/lib/asset-transaction-cancellation-service"
import { createPrismaAssetTransactionCancellationRepository } from "@/lib/asset-transaction-cancellation-prisma"
import { assetTransactionCancellationErrorResponse } from "@/lib/asset-transaction-cancellation-route"

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")
    const { id } = await context.params
    const result = await previewAssetTransactionCancellation(
      { type: "checkout", transactionId: id },
      createPrismaAssetTransactionCancellationRepository(prisma)
    )
    return NextResponse.json(result)
  } catch (error) {
    return assetTransactionCancellationErrorResponse(error)
  }
}
