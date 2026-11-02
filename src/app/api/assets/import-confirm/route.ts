import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { fieldErrorResponse } from "@/lib/field-error-response"
import { FORM_ERROR_KEY } from "@/lib/field-errors"
import { generateAssetTags } from "@/lib/asset-tag"
import {
  getAssetImportReferences,
  nullableText,
  parseAssetImportWorkbookForConfirm,
  parseImportDate,
  parseImportMoney,
  parseOptionalInteger,
  toAssetImportPreviewResult,
  type AssetImportValidatedRow,
} from "@/lib/asset-import-preview"
import {
  buildAssetImportBatchAuditValue,
  buildAssetImportRollbackPlan,
  buildAssetImportSkippedRows,
  createAssetImportBatchSummary,
  isAssetImportBatchId,
} from "@/lib/asset-import-batch"
import { buildCustodianScopeAudit } from "@/lib/asset-custodian-scope"
import { getRegisterDepartment } from "@/lib/asset-department-rule"
import { defaultAssetOwnershipType, normalizeAssetOwnershipType } from "@/lib/asset-ownership"
import { isPrismaUniqueConstraintError } from "@/lib/prisma-unique-retry"
import { withDeadlockRetry } from "@/lib/transaction-retry"
import { validateUploadFileContent } from "@/lib/uploads"

export const runtime = "nodejs"

const maxImportSize = 10 * 1024 * 1024
// Up to 1,000 assets with their movements and logs in one transaction (P5-R3): more than the 5 s default.
const importTransactionOptions = { maxWait: 10_000, timeout: 120_000 }
// Rows per createMany: about 30 columns each keeps a call under SQL Server's 2,100 parameters.
const writeChunkSize = 50
// generateAssetTags makes at most 100 tags per call.
const tagChunkSize = 100

// The 409 refusals (P5-R2, P5-R3). The page shows its own words from `code`; `error` is the fallback text.
const refusals = {
  previewChanged: "ผลตรวจไฟล์เปลี่ยนจากที่แสดงไว้ ตรวจรายการใหม่แล้วยืนยันอีกครั้ง",
  batchUsed: "รอบนำเข้านี้ยืนยันไปแล้ว",
  changedDuringImport: "ข้อมูลทรัพย์สินเปลี่ยนระหว่างนำเข้า จึงไม่ได้นำเข้ารายการใด ตรวจไฟล์ใหม่แล้วลองอีกครั้ง",
} as const

// asset:create. The client sends the file it previewed, the preview's batch id and the ready count the button promised.
// The file is parsed again; a different ready count answers 409 with the fresh preview, and a batch id that already has
// a batch log answers 409. Blank tags are generated before the transaction; then every asset, its import movement and
// log, and the batch log are written in one transaction (all or nothing), so a unique clash (a concurrent create or a
// double confirm) imports nothing and answers 409. A บุคคล or Stock row with a holder takes the holder's department, as
// the create does (P5-R6).
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

    // The batch id and the promised count come from the preview; anything else is refused before the file is read.
    const batchId = formText(formData.get("batchId"))
    const expectedReadyRows = parseExpectedReadyRows(formData.get("expectedReadyRows"))
    if (!batchId || !isAssetImportBatchId(batchId) || expectedReadyRows === null) {
      return fieldErrorResponse({ status: 400, error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { [FORM_ERROR_KEY]: "invalid" } })
    }
    if (await isBatchUsed(prisma, batchId)) return batchUsedResponse()

    await validateUploadFileContent(file)
    const references = await getAssetImportReferences()
    const parsed = await parseAssetImportWorkbookForConfirm(await file.arrayBuffer(), references)
    if (parsed.summary.readyRows !== expectedReadyRows) {
      const preview = toAssetImportPreviewResult(parsed)
      return NextResponse.json({
        error: refusals.previewChanged,
        code: "previewChanged",
        preview: { ...preview, batch: createAssetImportBatchSummary({ fileName: file.name, fileSize: file.size, preview }) },
      }, { status: 409 })
    }

    const readyRows = parsed.rows.filter((row) => row.status === "ready")
    if (readyRows.length === 0) {
      return NextResponse.json({ error: "ไม่พบแถวที่พร้อมนำเข้า" }, { status: 400 })
    }

    const batch = { ...createAssetImportBatchSummary({ fileName: file.name, fileSize: file.size, preview: parsed }), batchId }
    const inputs = readyRows.map((row) => ({ row, input: buildAssetInput(row) }))
    const generatedTags = await generateBlankTags(
      inputs.map(({ input }) => input),
      parsed.rows.flatMap((row) => {
        const tag = nullableText(row.values.assetTag)
        return tag ? [tag] : []
      })
    )

    // The holders' company and branch, for the cross-scope note each log carries (as the create writes it).
    const custodianIds = [...new Set(inputs.flatMap(({ input }) => (input.custodianId ? [input.custodianId] : [])))]
    const custodians = custodianIds.length
      ? await prisma.employee.findMany({
          where: { id: { in: custodianIds } },
          select: {
            id: true,
            companyId: true,
            branchId: true,
            company: { select: { code: true, nameTh: true } },
            branch: { select: { code: true, name: true } },
          },
        })
      : []
    const custodianById = new Map(custodians.map((custodian) => [custodian.id, custodian]))

    const records = inputs.map(({ row, input }, index) => {
      const id = randomUUID()
      const assetTag = input.assetTag ?? generatedTags[index]
      if (!assetTag) throw new Error(`Missing generated asset tag for row ${row.rowNumber}`)
      const { departmentId } = getRegisterDepartment({
        ownership: input.ownershipType,
        currentCustodianId: null,
        nextCustodianId: input.custodianId,
        currentDepartmentId: null,
        chosenDepartmentId: input.departmentId,
        nextHolderDepartmentId: nullableText(row.resolved.custodianDepartmentId),
        openHandover: false,
      })
      const custodianScope = buildCustodianScopeAudit(input, input.custodianId ? custodianById.get(input.custodianId) : null)
      const asset = { ...input, id, assetTag, departmentId, isActive: true, createdBy: user.id, updatedBy: user.id }
      return {
        asset,
        movement: {
          assetId: id,
          movementType: "import",
          toValue: input.currentLocationId,
          reason: `Imported from batch ${batchId} (${file.name} row ${row.rowNumber})`,
          referenceType: "asset_import",
          referenceId: id,
          performedBy: user.id,
          remark: input.remark,
        },
        log: {
          userId: user.id,
          action: "import",
          module: "asset",
          recordId: id,
          newValue: JSON.stringify({
            ...input,
            departmentId,
            isActive: true,
            assetTag,
            custodianScope,
            sourceRow: row.rowNumber,
            sourceFile: file.name,
            batchId,
          }),
          remark: "Asset imported from Excel",
        },
      }
    })

    const imported = records.length
    const skipped = parsed.summary.totalRows - imported
    const batchLog = {
      userId: user.id,
      action: "import_batch",
      module: "asset",
      recordId: batchId,
      newValue: JSON.stringify(
        buildAssetImportBatchAuditValue({
          batch,
          imported,
          skipped,
          approvedBy: user.id,
          // Kept for the later undo (spec §16.2); history never shows it (call 21).
          rollbackPlan: buildAssetImportRollbackPlan({
            batchId,
            assets: records.map(({ asset }) => ({ id: asset.id, assetTag: asset.assetTag, name: asset.name })),
          }),
          skippedRows: buildAssetImportSkippedRows(parsed.rows),
        })
      ),
      remark: "Asset import batch approved",
    }

    try {
      await withDeadlockRetry(() => prisma.$transaction(async (tx) => {
        // A second confirm of the same batch that passed the first check while this one was in flight.
        if (await isBatchUsed(tx, batchId)) throw new ImportBatchUsedError()
        for (const chunk of chunks(records, writeChunkSize)) await tx.asset.createMany({ data: chunk.map(({ asset }) => asset) })
        for (const chunk of chunks(records, writeChunkSize)) await tx.assetMovement.createMany({ data: chunk.map(({ movement }) => movement) })
        for (const chunk of chunks(records, writeChunkSize)) await tx.systemLog.createMany({ data: chunk.map(({ log }) => log) })
        await tx.systemLog.create({ data: batchLog })
      }, importTransactionOptions))
    } catch (error) {
      if (error instanceof ImportBatchUsedError) return batchUsedResponse()
      if (isPrismaUniqueConstraintError(error)) {
        return NextResponse.json({ error: refusals.changedDuringImport, code: "changedDuringImport" }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({
      batchId,
      imported,
      skipped,
      assets: records.map(({ asset }) => ({ id: asset.id, assetTag: asset.assetTag })),
    })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

class ImportBatchUsedError extends Error {
  constructor() {
    super("IMPORT_BATCH_USED")
    this.name = "ImportBatchUsedError"
  }
}

function batchUsedResponse() {
  return NextResponse.json({ error: refusals.batchUsed, code: "batchUsed" }, { status: 409 })
}

async function isBatchUsed(db: Pick<typeof prisma, "systemLog">, batchId: string) {
  const existing = await db.systemLog.findFirst({
    where: { module: "asset", action: "import_batch", recordId: batchId },
    select: { id: true },
  })
  return Boolean(existing)
}

type AssetImportInput = ReturnType<typeof buildAssetInput>

function buildAssetInput(row: AssetImportValidatedRow) {
  return {
    assetTag: nullableText(row.values.assetTag),
    name: String(row.values.name ?? "").trim(),
    categoryId: requiredResolved(row.resolved.categoryId, "categoryId"),
    brandId: nullableText(row.resolved.brandId),
    modelId: nullableText(row.resolved.modelId),
    serialNumber: nullableText(row.values.serialNumber),
    // The validator's checked lower-case value: the raw cell ("Shared") would fall back to personal (final review).
    ownershipType: normalizeAssetOwnershipType(nullableText(row.resolved.ownershipType) ?? defaultAssetOwnershipType),
    licenseTotalSeats: parseOptionalInteger(row.values.licenseTotalSeats),
    licenseUsedSeats: parseOptionalInteger(row.values.licenseUsedSeats),
    licenseAssignedAssetId: nullableText(row.resolved.licenseAssignedAssetId),
    companyId: requiredResolved(row.resolved.companyId, "companyId"),
    branchId: requiredResolved(row.resolved.branchId, "branchId"),
    departmentId: nullableText(row.resolved.departmentId),
    custodianId: nullableText(row.resolved.custodianId),
    homeLocationId: nullableText(row.resolved.homeLocationId),
    currentLocationId: requiredResolved(row.resolved.currentLocationId, "currentLocationId"),
    statusId: requiredResolved(row.resolved.statusId, "statusId"),
    conditionId: requiredResolved(row.resolved.conditionId, "conditionId"),
    purchaseDate: parseImportDate(row.values.purchaseDate),
    purchasePrice: parseImportMoney(row.values.purchasePrice),
    supplierId: nullableText(row.resolved.supplierId),
    warrantyStartDate: parseImportDate(row.values.warrantyStartDate),
    warrantyEndDate: parseImportDate(row.values.warrantyEndDate),
    fixedAssetCode: nullableText(row.values.fixedAssetCode),
    poNumber: nullableText(row.values.poNumber),
    invoiceNumber: nullableText(row.values.invoiceNumber),
    remark: nullableText(row.values.remark),
  }
}

// A tag for each blank-tag row, by the row's place in `inputs` (P5-R3): grouped by company, branch and category, at most
// 100 per call, with the file's tags and the ones generated before passed as reserved.
async function generateBlankTags(inputs: AssetImportInput[], fileTags: string[]) {
  const groups = new Map<string, number[]>()
  inputs.forEach((input, index) => {
    if (input.assetTag) return
    const key = `${input.companyId}|${input.branchId}|${input.categoryId}`
    groups.set(key, [...(groups.get(key) ?? []), index])
  })

  const tags: Array<string | undefined> = new Array(inputs.length)
  const reserved = [...fileTags]
  for (const indexes of groups.values()) {
    for (const chunk of chunks(indexes, tagChunkSize)) {
      const { companyId, branchId, categoryId } = inputs[chunk[0]]
      const generated = await generateAssetTags({ companyId, branchId, categoryId, count: chunk.length, reservedAssetTags: reserved })
      chunk.forEach((inputIndex, position) => {
        tags[inputIndex] = generated[position]
      })
      reserved.push(...generated)
    }
  }
  return tags
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
  return result
}

function requiredResolved(value: string | null | undefined, field: string) {
  if (!value) throw new Error(`Missing resolved ${field}`)
  return value
}

function formText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

// The ready count the confirm button showed: a whole number 0 or more, or null.
function parseExpectedReadyRows(value: FormDataEntryValue | null) {
  const text = formText(value)
  if (!text || !/^\d{1,7}$/.test(text)) return null
  return Number(text)
}
