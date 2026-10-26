// The repair / PM tab's reads (group 1 spec §7.7): every active repair record of the asset and every PM plan, in one
// round. Read only.
import { prisma } from "@/lib/db"
import { assetRepairRecordWhere } from "@/lib/asset-detail-data"
import { orderAssetPmPlans, type AssetPmPlanRow, type AssetRepairRow } from "@/lib/asset-repair-rules"

export async function getAssetMaintenanceTabData(assetId: string): Promise<{ repairs: AssetRepairRow[]; plans: AssetPmPlanRow[] }> {
  const [tickets, plans] = await Promise.all([
    // The repairs count's where (Task 7): the table lists exactly the rows the tab count says, and the strip sums every
    // record, so there is no take (R24).
    prisma.maintenanceTicket.findMany({
      where: assetRepairRecordWhere(assetId),
      orderBy: [{ reportedDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        repairNo: true,
        repairStatus: true,
        maintenancePlanId: true,
        reportedDate: true,
        returnDate: true,
        repairCost: true,
        problem: true,
        resolution: true,
        vendor: { select: { name: true } },
        assignedTo: { select: { fullNameTh: true } },
      },
    }),
    // Every state: an ended plan is the asset's history.
    prisma.maintenancePlan.findMany({
      where: { assetId },
      select: { id: true, planNo: true, title: true, frequency: true, nextDueDate: true, planState: true, vendor: { select: { code: true, name: true } } },
    }),
  ])

  const repairs: AssetRepairRow[] = tickets.map((ticket) => ({
    id: ticket.id,
    repairNo: ticket.repairNo,
    repairStatus: ticket.repairStatus,
    maintenancePlanId: ticket.maintenancePlanId,
    reportedDate: ticket.reportedDate,
    returnDate: ticket.returnDate,
    repairCost: ticket.repairCost == null ? null : Number(ticket.repairCost),
    problem: ticket.problem,
    resolution: ticket.resolution,
    repairer: ticket.vendor?.name ?? ticket.assignedTo?.fullNameTh ?? null,
  }))

  return { repairs, plans: orderAssetPmPlans(plans) }
}
