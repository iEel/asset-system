import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hasPermission, requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { searchPurchaseDocuments, type PurchaseDocumentSearchDb } from "@/lib/purchase-document-search"
import { parsePurchaseDocumentSearch } from "@/lib/purchase-document-search-rules"

// The asset form's purchase-document picker (group 4 plan 3, spec §9.2): asset:create or asset:edit, as the form it
// serves, checked before the query is read (P3-R2).
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!hasPermission(user, "asset", "create")) requirePermission(user, "asset", "edit")
    const input = parsePurchaseDocumentSearch(new URL(request.url).searchParams)
    if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 })
    const data = await withPerformanceTiming(
      "purchase-document-search",
      () => searchPurchaseDocuments(prisma as unknown as PurchaseDocumentSearchDb, input),
      { empty: input.q === "" },
    )
    return NextResponse.json({ data })
  } catch (error) {
    return errorResponse(error)
  }
}
