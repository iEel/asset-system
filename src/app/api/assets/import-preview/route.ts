import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { fieldErrorResponse } from "@/lib/field-error-response"
import { getAssetImportReferences, parseAssetImportWorkbook } from "@/lib/asset-import-preview"
import { createAssetImportBatchSummary } from "@/lib/asset-import-batch"
import { validateUploadFileContent } from "@/lib/uploads"

const maxImportSize = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "create")

    const formData = await request.formData()
    const file = formData.get("file")
    // The file rules belong to the upload as a whole, so they go under _form (V track spec §6.2).
    if (!(file instanceof File)) {
      return fieldErrorResponse({ status: 400, error: "กรุณาเลือกไฟล์ Excel", fieldErrors: { _form: "required" } })
    }
    if (file.size > maxImportSize) {
      return fieldErrorResponse({ status: 400, error: "ไฟล์ต้องมีขนาดไม่เกิน 10 MB", fieldErrors: { _form: "outOfRange" } })
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return fieldErrorResponse({ status: 400, error: "รองรับเฉพาะไฟล์ .xlsx", fieldErrors: { _form: "invalidFormat" } })
    }
    await validateUploadFileContent(file)

    const references = await getAssetImportReferences()
    const preview = await parseAssetImportWorkbook(await file.arrayBuffer(), references)
    return NextResponse.json({
      ...preview,
      batch: createAssetImportBatchSummary({
        fileName: file.name,
        fileSize: file.size,
        preview,
      }),
    })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
