import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { OperationDocumentPrint } from "@/components/asset-operations/operation-document-print"

type DisposalPrintPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function DisposalPrintPage({ params }: DisposalPrintPageProps) {
  const { locale, id } = await params
  await requirePagePermission(locale, "disposal", "view")
  const t = await getTranslations("disposalPage")
  const tAsset = await getTranslations("asset")
  const tCommon = await getTranslations("common")

  const [disposalRequest, evidenceCount] = await Promise.all([
    prisma.disposalRequest.findFirst({
      where: { id, isActive: true },
      omit: { batchId: true },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            serialNumber: true,
            fixedAssetCode: true,
            purchasePrice: true,
            company: { select: { code: true, nameTh: true } },
            branch: { select: { code: true, name: true } },
            category: { select: { code: true, name: true } },
            brand: { select: { name: true } },
            model: { select: { name: true } },
            status: { select: { nameTh: true } },
            condition: { select: { nameTh: true } },
            currentLocation: { select: { code: true, name: true } },
            custodian: { select: { code: true, fullNameTh: true } },
          },
        },
        requestedBy: { select: { code: true, fullNameTh: true } },
        approver: { select: { code: true, fullNameTh: true } },
        executedBy: { select: { code: true, fullNameTh: true } },
      },
    }),
    prisma.attachment.count({ where: { module: "disposal", referenceId: id, isActive: true } }),
  ])
  if (!disposalRequest) notFound()

  const statusLabel =
    disposalRequest.requestStatus === "pending"
      ? t("statuses.pending")
      : disposalRequest.requestStatus === "approved"
        ? t("statuses.approved")
        : disposalRequest.requestStatus === "disposed"
          ? t("statuses.disposed")
          : disposalRequest.requestStatus === "rejected"
            ? t("statuses.rejected")
            : disposalRequest.requestStatus
  const sourceLabel = formatSource(disposalRequest.sourceType, disposalRequest.sourceId)

  return (
    <OperationDocumentPrint
      title={t("disposalDocumentTitle")}
      subtitle={`${disposalRequest.disposalNo} · ${disposalRequest.asset.assetTag} - ${disposalRequest.asset.name}`}
      backHref={`/${locale}/disposal/${disposalRequest.id}`}
      backLabel={tCommon("back")}
      printLabel={t("printDisposal")}
      sections={[
        {
          title: t("requestDetail"),
          fields: [
            { label: t("disposalNo"), value: disposalRequest.disposalNo },
            { label: tCommon("status"), value: statusLabel },
            { label: t("source"), value: sourceLabel },
            { label: t("disposalType"), value: t(`types.${disposalRequest.disposalType}`) },
            { label: t("requestedBy"), value: `${disposalRequest.requestedBy.code} - ${disposalRequest.requestedBy.fullNameTh}` },
            { label: t("requestDate"), value: formatDateTime(disposalRequest.requestDate) },
            { label: t("approver"), value: disposalRequest.approver ? `${disposalRequest.approver.code} - ${disposalRequest.approver.fullNameTh}` : null },
            { label: t("approvedAt"), value: formatDateTime(disposalRequest.approvedAt) },
            { label: t("saleValue"), value: disposalRequest.saleValue == null ? null : formatCurrency(Number(disposalRequest.saleValue)) },
            { label: t("salvageValue"), value: disposalRequest.salvageValue == null ? null : formatCurrency(Number(disposalRequest.salvageValue)) },
            { label: t("requestEvidence"), value: `${evidenceCount}` },
          ],
        },
        {
          title: t("asset"),
          fields: [
            { label: t("asset"), value: `${disposalRequest.asset.assetTag} - ${disposalRequest.asset.name}` },
            { label: tAsset("serialNumber"), value: disposalRequest.asset.serialNumber },
            { label: tAsset("fixedAssetCode"), value: disposalRequest.asset.fixedAssetCode },
            { label: tAsset("category"), value: `${disposalRequest.asset.category.code} - ${disposalRequest.asset.category.name}` },
            { label: tAsset("brand"), value: disposalRequest.asset.brand?.name },
            { label: tAsset("model"), value: disposalRequest.asset.model?.name },
            { label: tAsset("company"), value: `${disposalRequest.asset.company.code} - ${disposalRequest.asset.company.nameTh}` },
            { label: tAsset("branch"), value: `${disposalRequest.asset.branch.code} - ${disposalRequest.asset.branch.name}` },
            { label: t("currentLocation"), value: `${disposalRequest.asset.currentLocation.code} - ${disposalRequest.asset.currentLocation.name}` },
            { label: t("custodian"), value: disposalRequest.asset.custodian ? `${disposalRequest.asset.custodian.code} - ${disposalRequest.asset.custodian.fullNameTh}` : null },
            { label: t("currentStatus"), value: disposalRequest.asset.status.nameTh },
            { label: t("currentCondition"), value: disposalRequest.asset.condition.nameTh },
            { label: tAsset("purchasePrice"), value: disposalRequest.asset.purchasePrice == null ? null : formatCurrency(Number(disposalRequest.asset.purchasePrice)) },
          ],
        },
        {
          title: t("reason"),
          fields: [{ label: t("reason"), value: disposalRequest.reason }],
        },
        {
          title: t("decisionDetail"),
          fields: [{ label: t("approvalRemark"), value: disposalRequest.approvalRemark }],
        },
        {
          title: t("executionDetail"),
          fields: [
            { label: t("executionDate"), value: formatDateTime(disposalRequest.executionDate) },
            { label: t("executedBy"), value: disposalRequest.executedBy ? `${disposalRequest.executedBy.code} - ${disposalRequest.executedBy.fullNameTh}` : null },
            { label: t("recipientName"), value: disposalRequest.recipientName },
            { label: t("documentNo"), value: disposalRequest.documentNo },
            { label: t("actualSaleValue"), value: disposalRequest.actualSaleValue == null ? null : formatCurrency(Number(disposalRequest.actualSaleValue)) },
            { label: t("actualSalvageValue"), value: disposalRequest.actualSalvageValue == null ? null : formatCurrency(Number(disposalRequest.actualSalvageValue)) },
            { label: t("completedAt"), value: formatDateTime(disposalRequest.completedAt) },
            { label: t("executionRemark"), value: disposalRequest.executionRemark },
          ],
        },
      ]}
      signatures={[
        { title: t("requestedBy"), helper: t("signatureDate") },
        { title: t("approver"), helper: t("signatureDate") },
        { title: t("assetAccounting"), helper: t("signatureDate") },
      ]}
    />
  )
}

function formatSource(sourceType: string | null, sourceId: string | null) {
  if (!sourceType && !sourceId) return null
  return [sourceType, sourceId].filter(Boolean).join(" / ")
}
