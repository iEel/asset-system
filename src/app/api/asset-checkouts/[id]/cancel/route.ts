import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { cancelAssetTransaction } from "@/lib/asset-transaction-cancellation-service"
import { createPrismaAssetTransactionCancellationRepository } from "@/lib/asset-transaction-cancellation-prisma"
import { assetTransactionCancellationErrorResponse } from "@/lib/asset-transaction-cancellation-route"
import { assetTransactionCancellationSchema } from "@/lib/validations/asset-transaction-cancellation"

type Context = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: Context) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")
    const { id } = await context.params
    const input = assetTransactionCancellationSchema.parse(await request.json())
    const result = await cancelAssetTransaction({
      type: "checkout",
      transactionId: id,
      userId: user.id,
      reason: input.reason,
      expectedUpdatedAt: input.expectedUpdatedAt.toISOString(),
    }, createPrismaAssetTransactionCancellationRepository(prisma))
    return NextResponse.json(result, { status: result.status === "blocked" ? 409 : 200 })
  } catch (error) {
    return assetTransactionCancellationErrorResponse(error)
  }
}
