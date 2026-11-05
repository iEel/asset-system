import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hasPermission, requireAuth } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { z } from "zod"
import { canReadSimilarNames, listSimilarBrands, listSimilarModels } from "@/lib/brand-model-duplicates"

const similarKind = z.enum(["brand", "model"])

// The similar names shown while adding a brand or model (spec §4.2, G7P1-R2): a warning list, never a refusal.
// ?kind=brand&q= or ?kind=model&brandId=&q= → { data: NameClash[] }. brand:view, asset:create or asset:edit reads it, because the
// asset form's users may not hold brand:view.
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!canReadSimilarNames((module, action) => hasPermission(user, module, action))) {
      throw new Error("Forbidden: insufficient permissions")
    }

    const params = request.nextUrl.searchParams
    // An unknown kind is a validation refusal (400 VALIDATION_FAILED through errorResponse).
    const kind = similarKind.parse(params.get("kind"))
    const q = params.get("q")?.trim() ?? ""
    const brandId = params.get("brandId")?.trim() ?? ""
    if (q.length < 2 || (kind === "model" && !brandId)) return NextResponse.json({ data: [] })

    const data = kind === "brand" ? await listSimilarBrands(prisma, q) : await listSimilarModels(prisma, brandId, q)
    return NextResponse.json({ data })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
