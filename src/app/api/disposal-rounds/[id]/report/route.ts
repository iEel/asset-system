import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { workbookResponse } from "@/lib/asset-excel"
import { readDisposalRound } from "@/lib/disposal-round-page-data"
import { buildDisposalRoundReport, disposalRoundReportFileName, loadDisposalRoundReportPhotos } from "@/lib/disposal-round-report"

// sharp and the upload folder need Node.
export const runtime = "nodejs"

type DisposalRoundReportContext = { params: Promise<{ id: string }> }

// The round's accounting Excel (group 6 spec §11.5): disposal:view (decision 10), not one of the disposal:export exports.
export async function GET(_request: Request, context: DisposalRoundReportContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "disposal", "view")
    const { id } = await context.params
    const detail = await readDisposalRound(prisma, id)
    if (!detail) return NextResponse.json({ code: "DISPOSAL_ROUND_NOT_FOUND", error: "Disposal round not found" }, { status: 404 })

    const photos = await loadDisposalRoundReportPhotos(prisma, detail.machines)
    const buffer = await buildDisposalRoundReport({
      roundNo: detail.round.roundNo,
      executionDate: detail.round.executionDate,
      machines: detail.machines.map((machine, index) => ({
        assetTag: machine.assetTag,
        assetName: machine.assetName,
        serialNumber: machine.serialNumber,
        photo: photos[index],
      })),
    })
    return workbookResponse(buffer, disposalRoundReportFileName(detail.round.roundNo, detail.round.executionDate))
  } catch (error) {
    return errorResponse(error)
  }
}
