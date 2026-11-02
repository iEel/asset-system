import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { hasPermission, requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { findPurchaseDocumentDuplicates } from "@/lib/purchase-documents"
import { purchaseDocumentTypes } from "@/lib/validations/purchase-document"

// The asset form's duplicate pre-check for the new purchase documents it is about to upload (group 4 plan 3, P3-R3,
// P3-R6): run before the asset is saved, so a duplicate is refused under its field with the file still on the page.
// asset:create or asset:edit, as the form it serves (P3-R2), checked before the body is read.
const checkDuplicatesSchema = z.object({
  documents: z
    .array(z.object({ documentType: z.enum(purchaseDocumentTypes), documentNo: z.string().trim().min(1).max(100) }))
    .max(20),
})

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (!hasPermission(user, "asset", "create")) requirePermission(user, "asset", "edit")

    const input = checkDuplicatesSchema.parse(await request.json())
    const duplicates = await findPurchaseDocumentDuplicates(prisma, input.documents)
    return NextResponse.json({ duplicates })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
