import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toRepairRecordStatus } from "@/lib/repair-record-policy"
import { OperationDocumentPrint } from "@/components/asset-operations/operation-document-print"

type RepairRecordPrintPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function RepairRecordPrintPage({ params }: RepairRecordPrintPageProps) {
  const { locale, id } = await params
  await requirePagePermission(locale, "maintenance", "view")
  const tRecord = await getTranslations("repairRecord")
  const tAsset = await getTranslations("asset")
  const tCommon = await getTranslations("common")

  const ticket = await prisma.maintenanceTicket.findFirst({
    where: { id, isActive: true },
    include: {
      asset: {
        select: {
          assetTag: true,
          name: true,
          serialNumber: true,
          fixedAssetCode: true,
          status: { select: { nameTh: true } },
          currentLocation: { select: { code: true, name: true } },
          custodian: { select: { code: true, fullNameTh: true } },
          company: { select: { code: true, nameTh: true } },
          branch: { select: { code: true, name: true } },
          category: { select: { code: true, name: true } },
        },
      },
      reportedBy: { select: { code: true, fullNameTh: true } },
      vendor: { select: { code: true, name: true } },
      maintenancePlan: { select: { planNo: true, title: true } },
    },
  })
  if (!ticket) notFound()

  const outcome = ticket.outcome === "usable" || ticket.outcome === "beyond_repair" ? tRecord(`outcome.${ticket.outcome}`) : null

  return (
    <OperationDocumentPrint
      title={tRecord("printTitle")}
      subtitle={`${ticket.repairNo} · ${ticket.asset.assetTag} - ${ticket.asset.name}`}
      backHref={`/${locale}/maintenance/${ticket.id}`}
      backLabel={tCommon("back")}
      printLabel={tRecord("print")}
      sections={[
        {
          title: tRecord("detailTitle"),
          fields: [
            { label: tRecord("repairNo"), value: ticket.repairNo },
            { label: tRecord("statusLabel"), value: tRecord(`status.${toRepairRecordStatus(ticket.repairStatus)}`) },
            { label: tRecord("outcomeQuestion"), value: outcome },
            { label: tRecord("date"), value: formatDate(ticket.reportedDate) },
            { label: tRecord("returnDate"), value: ticket.returnDate ? formatDate(ticket.returnDate) : null },
            { label: tRecord("vendor"), value: ticket.vendor ? `${ticket.vendor.code} - ${ticket.vendor.name}` : tRecord("internal") },
            { label: tRecord("cost"), value: ticket.repairCost == null ? null : formatCurrency(Number(ticket.repairCost)) },
            { label: tRecord("invoiceNo"), value: ticket.invoiceNo },
            { label: tRecord("reporter"), value: `${ticket.reportedBy.code} - ${ticket.reportedBy.fullNameTh}` },
            { label: tRecord("planLabel"), value: ticket.maintenancePlan ? `${ticket.maintenancePlan.planNo} - ${ticket.maintenancePlan.title}` : null },
          ],
        },
        {
          title: tRecord("assetSection"),
          fields: [
            { label: tRecord("asset"), value: `${ticket.asset.assetTag} - ${ticket.asset.name}` },
            { label: tAsset("serialNumber"), value: ticket.asset.serialNumber },
            { label: tAsset("fixedAssetCode"), value: ticket.asset.fixedAssetCode },
            { label: tAsset("category"), value: `${ticket.asset.category.code} - ${ticket.asset.category.name}` },
            { label: tAsset("company"), value: `${ticket.asset.company.code} - ${ticket.asset.company.nameTh}` },
            { label: tAsset("branch"), value: `${ticket.asset.branch.code} - ${ticket.asset.branch.name}` },
            { label: tRecord("location"), value: `${ticket.asset.currentLocation.code} - ${ticket.asset.currentLocation.name}` },
            { label: tRecord("custodian"), value: ticket.asset.custodian ? `${ticket.asset.custodian.code} - ${ticket.asset.custodian.fullNameTh}` : null },
            { label: tRecord("currentStatus"), value: ticket.asset.status.nameTh },
          ],
        },
        { title: tRecord("problem"), fields: [{ label: tRecord("problem"), value: ticket.problem }] },
        { title: tRecord("remarkTitle"), fields: [{ label: tRecord("remark"), value: ticket.resolution }] },
      ]}
      signatures={[
        { title: tRecord("signatureRecorder"), helper: tRecord("signatureDate") },
        { title: tRecord("signatureReceiver"), helper: tRecord("signatureDate") },
      ]}
    />
  )
}
