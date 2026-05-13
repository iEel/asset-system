import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buildReferenceLabelMap, labelOrDash } from "@/lib/asset-operation-document"
import { formatDate, formatDateTime } from "@/lib/utils"
import { OperationDocumentPrint } from "@/components/asset-operations/operation-document-print"

type CheckinPrintPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function CheckinPrintPage({ params }: CheckinPrintPageProps) {
  const { locale, id } = await params
  await requirePagePermission(locale, "asset", "view")

  const t = await getTranslations("checkin")
  const tCheckout = await getTranslations("checkout")
  const tAsset = await getTranslations("asset")
  const tCommon = await getTranslations("common")

  const checkin = await prisma.assetCheckin.findUnique({
    where: { id },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          name: true,
          serialNumber: true,
          fixedAssetCode: true,
          company: { select: { code: true, nameTh: true } },
          branch: { select: { code: true, name: true } },
          category: { select: { code: true, name: true } },
        },
      },
      checkout: {
        select: {
          id: true,
          documentNo: true,
          checkoutType: true,
          checkoutDate: true,
          expectedReturnDate: true,
          custodianId: true,
          departmentId: true,
          locationId: true,
          parentAssetId: true,
          custodian: { select: { code: true, fullNameTh: true } },
        },
      },
    },
  })
  if (!checkin) notFound()

  const [photoAttachments, returnSignatureAttachment, receiveSignatureAttachment] = await Promise.all([
    prisma.attachment.findMany({
      where: { module: "checkin_photo_after", referenceId: checkin.id },
      select: { id: true },
      orderBy: { uploadedAt: "asc" },
    }),
    prisma.attachment.findFirst({
      where: { module: "checkin_return_signature", referenceId: checkin.id },
      select: { id: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.attachment.findFirst({
      where: { module: "checkin_receive_signature", referenceId: checkin.id },
      select: { id: true },
      orderBy: { uploadedAt: "desc" },
    }),
  ])

  const labels = await buildReferenceLabelMap([
    checkin.checkout.departmentId,
    checkin.checkout.locationId,
    checkin.checkout.parentAssetId,
    checkin.conditionAfter,
    checkin.nextStatus,
    checkin.nextLocationId,
  ])
  const checkoutDestination = getCheckoutDestination(checkin.checkout.checkoutType, {
    custodian: checkin.checkout.custodian ? `${checkin.checkout.custodian.code} - ${checkin.checkout.custodian.fullNameTh}` : null,
    department: labelOrDash(labels, checkin.checkout.departmentId),
    location: labelOrDash(labels, checkin.checkout.locationId),
    parentAsset: labelOrDash(labels, checkin.checkout.parentAssetId),
  })

  return (
    <OperationDocumentPrint
      title={t("returnDocumentTitle")}
      subtitle={`${checkin.asset.assetTag} - ${checkin.asset.name}`}
      backHref={`/${locale}/assets/${checkin.asset.id}`}
      backLabel={tCommon("back")}
      printLabel={t("printReturn")}
      sections={[
        {
          title: t("documentInfo"),
          fields: [
            { label: t("documentNo"), value: checkin.documentNo ?? checkin.id },
            { label: t("returnDate"), value: formatDate(checkin.returnDate) },
            { label: tCheckout("documentNo"), value: checkin.checkout.documentNo ?? checkin.checkout.id },
            { label: t("createdAt"), value: formatDateTime(checkin.createdAt) },
          ],
        },
        {
          title: t("assetInfo"),
          fields: [
            { label: tAsset("assetTag"), value: checkin.asset.assetTag },
            { label: tAsset("assetName"), value: checkin.asset.name },
            { label: tAsset("serialNumber"), value: checkin.asset.serialNumber },
            { label: tAsset("fixedAssetCode"), value: checkin.asset.fixedAssetCode },
            { label: tAsset("category"), value: `${checkin.asset.category.code} - ${checkin.asset.category.name}` },
            { label: tAsset("company"), value: `${checkin.asset.company.code} - ${checkin.asset.company.nameTh}` },
            { label: tAsset("branch"), value: `${checkin.asset.branch.code} - ${checkin.asset.branch.name}` },
            { label: tCheckout("checkoutTo"), value: checkoutDestination },
          ],
        },
        {
          title: t("returnInfo"),
          fields: [
            { label: t("returnBy"), value: checkin.returnBy },
            { label: t("receiveBy"), value: checkin.receiveBy },
            { label: t("conditionAfter"), value: labelOrDash(labels, checkin.conditionAfter) },
            { label: t("photoAfter"), value: photoAttachments.length > 0 || checkin.photoAfter ? t("evidenceAttached") : "-" },
            { label: t("nextStatus"), value: labelOrDash(labels, checkin.nextStatus) },
            { label: t("nextLocation"), value: labelOrDash(labels, checkin.nextLocationId) },
            { label: t("missingAccessories"), value: checkin.missingAccessories },
            { label: t("damageNote"), value: checkin.damageNote },
            { label: t("remark"), value: checkin.remark },
          ],
        },
      ]}
      signatures={[
        { title: t("returnBy"), helper: t("signatureDate"), imageSrc: returnSignatureAttachment ? `/api/attachments/${returnSignatureAttachment.id}?inline=1` : null },
        { title: t("receiveBy"), helper: t("signatureDate"), imageSrc: receiveSignatureAttachment ? `/api/attachments/${receiveSignatureAttachment.id}?inline=1` : null },
        { title: t("approver"), helper: t("signatureDate") },
      ]}
    />
  )
}

function getCheckoutDestination(
  checkoutType: string,
  labels: { custodian: string | null; department: string; location: string; parentAsset: string }
) {
  if (checkoutType === "user") return labels.custodian || "-"
  if (checkoutType === "department") return labels.department
  if (checkoutType === "location") return labels.location
  return labels.parentAsset
}
