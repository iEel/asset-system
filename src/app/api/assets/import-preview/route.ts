import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
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
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "กรุณาเลือกไฟล์ Excel" }, { status: 400 })
    }
    if (file.size > maxImportSize) {
      return NextResponse.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 10 MB" }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "รองรับเฉพาะไฟล์ .xlsx" }, { status: 400 })
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
