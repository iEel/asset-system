import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { OperationDocumentPrint } from "@/components/asset-operations/operation-document-print"

type MaintenancePrintPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function MaintenancePrintPage({ params }: MaintenancePrintPageProps) {
  const { locale, id } = await params
  await requirePagePermission(locale, "maintenance", "view")
  const t = await getTranslations("maintenancePage")
  const tAsset = await getTranslations("asset")
  const tCommon = await getTranslations("common")

  const ticket = await prisma.maintenanceTicket.findFirst({
    where: { id, isActive: true },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          name: true,
          serialNumber: true,
          fixedAssetCode: true,
          status: { select: { nameTh: true } },
          condition: { select: { nameTh: true } },
          currentLocation: { select: { code: true, name: true } },
          custodian: { select: { code: true, fullNameTh: true } },
          company: { select: { code: true, nameTh: true } },
          branch: { select: { code: true, name: true } },
          category: { select: { code: true, name: true } },
        },
      },
      reportedBy: { select: { code: true, fullNameTh: true } },
      assignedTo: { select: { code: true, fullNameTh: true } },
      vendor: { select: { code: true, name: true } },
    },
  })
  if (!ticket) notFound()

  return (
    <OperationDocumentPrint
      title={t("repairDocumentTitle")}
      subtitle={`${ticket.repairNo} · ${ticket.asset.assetTag} - ${ticket.asset.name}`}
      backHref={`/${locale}/maintenance/${ticket.id}`}
      backLabel={tCommon("back")}
      printLabel={t("printRepair")}
      sections={[
        {
          title: t("ticketDetail"),
          fields: [
            { label: t("repairNo"), value: ticket.repairNo },
            { label: tCommon("status"), value: ticket.repairStatus === "open" ? t("statuses.open") : ticket.repairStatus === "closed" ? t("statuses.closed") : ticket.repairStatus },
            { label: t("reportedBy"), value: `${ticket.reportedBy.code} - ${ticket.reportedBy.fullNameTh}` },
            { label: t("reportedDate"), value: formatDateTime(ticket.reportedDate) },
            { label: t("assignedTo"), value: ticket.assignedTo ? `${ticket.assignedTo.code} - ${ticket.assignedTo.fullNameTh}` : null },
            { label: t("repairType"), value: ticket.repairType === "vendor" ? t("vendorRepair") : t("internalRepair") },
            { label: t("vendor"), value: ticket.vendor ? `${ticket.vendor.code} - ${ticket.vendor.name}` : null },
            { label: t("repairCost"), value: ticket.repairCost == null ? null : formatCurrency(Number(ticket.repairCost)) },
            { label: t("warrantyClaim"), value: ticket.warrantyClaim ? tCommon("yes") : tCommon("no") },
            { label: t("returnDate"), value: formatDateTime(ticket.returnDate) },
          ],
        },
        {
          title: t("asset"),
          fields: [
            { label: t("asset"), value: `${ticket.asset.assetTag} - ${ticket.asset.name}` },
            { label: tAsset("serialNumber"), value: ticket.asset.serialNumber },
            { label: tAsset("fixedAssetCode"), value: ticket.asset.fixedAssetCode },
            { label: tAsset("category"), value: `${ticket.asset.category.code} - ${ticket.asset.category.name}` },
            { label: tAsset("company"), value: `${ticket.asset.company.code} - ${ticket.asset.company.nameTh}` },
            { label: tAsset("branch"), value: `${ticket.asset.branch.code} - ${ticket.asset.branch.name}` },
            { label: t("currentLocation"), value: `${ticket.asset.currentLocation.code} - ${ticket.asset.currentLocation.name}` },
            { label: t("custodian"), value: ticket.asset.custodian ? `${ticket.asset.custodian.code} - ${ticket.asset.custodian.fullNameTh}` : null },
            { label: t("currentStatus"), value: ticket.asset.status.nameTh },
            { label: t("currentCondition"), value: ticket.asset.condition.nameTh },
          ],
        },
        {
          title: t("problem"),
          fields: [{ label: t("problem"), value: ticket.problem }],
        },
        {
          title: t("closeDetail"),
          fields: [
            { label: t("rootCause"), value: ticket.rootCause },
            { label: t("resolution"), value: ticket.resolution },
          ],
        },
      ]}
      signatures={[
        { title: t("reportedBy"), helper: t("signatureDate") },
        { title: t("assignedTo"), helper: t("signatureDate") },
        { title: t("approver"), helper: t("signatureDate") },
      ]}
    />
  )
}
