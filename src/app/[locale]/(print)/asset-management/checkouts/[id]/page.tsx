import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buildReferenceLabelMap, labelOrDash } from "@/lib/asset-operation-document"
import { formatDate, formatDateTime } from "@/lib/utils"
import { OperationDocumentPrint } from "@/components/asset-operations/operation-document-print"

type CheckoutPrintPageProps = {
  params: Promise<{ locale: string; id: string }>
}

export default async function CheckoutPrintPage({ params }: CheckoutPrintPageProps) {
  const { locale, id } = await params
  await requirePagePermission(locale, "asset", "view")

  const t = await getTranslations("checkout")
  const tAsset = await getTranslations("asset")
  const tCommon = await getTranslations("common")

  const checkout = await prisma.assetCheckout.findUnique({
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
          currentLocation: { select: { code: true, name: true } },
          custodian: { select: { code: true, fullNameTh: true } },
        },
      },
      custodian: { select: { code: true, fullNameTh: true } },
    },
  })
  if (!checkout) notFound()

  const labels = await buildReferenceLabelMap([
    checkout.departmentId,
    checkout.locationId,
    checkout.parentAssetId,
    checkout.conditionBefore,
  ])
  const destination = getCheckoutDestination(checkout.checkoutType, {
    custodian: checkout.custodian ? `${checkout.custodian.code} - ${checkout.custodian.fullNameTh}` : null,
    department: labelOrDash(labels, checkout.departmentId),
    location: labelOrDash(labels, checkout.locationId),
    parentAsset: labelOrDash(labels, checkout.parentAssetId),
  })

  return (
    <OperationDocumentPrint
      title={t("handoverDocumentTitle")}
      subtitle={`${checkout.asset.assetTag} - ${checkout.asset.name}`}
      backHref={`/${locale}/assets/${checkout.asset.id}`}
      backLabel={tCommon("back")}
      printLabel={t("printHandover")}
      sections={[
        {
          title: t("documentInfo"),
          fields: [
            { label: t("documentNo"), value: checkout.id },
            { label: t("checkoutDate"), value: formatDate(checkout.checkoutDate) },
            { label: t("expectedReturn"), value: formatDate(checkout.expectedReturnDate) },
            { label: t("createdAt"), value: formatDateTime(checkout.createdAt) },
          ],
        },
        {
          title: t("assetInfo"),
          fields: [
            { label: tAsset("assetTag"), value: checkout.asset.assetTag },
            { label: tAsset("assetName"), value: checkout.asset.name },
            { label: tAsset("serialNumber"), value: checkout.asset.serialNumber },
            { label: tAsset("fixedAssetCode"), value: checkout.asset.fixedAssetCode },
            { label: tAsset("category"), value: `${checkout.asset.category.code} - ${checkout.asset.category.name}` },
            { label: tAsset("company"), value: `${checkout.asset.company.code} - ${checkout.asset.company.nameTh}` },
            { label: tAsset("branch"), value: `${checkout.asset.branch.code} - ${checkout.asset.branch.name}` },
            { label: tAsset("currentLocation"), value: `${checkout.asset.currentLocation.code} - ${checkout.asset.currentLocation.name}` },
          ],
        },
        {
          title: t("handoverInfo"),
          fields: [
            { label: t("checkoutType"), value: t(`type_${checkout.checkoutType}`) },
            { label: t("checkoutTo"), value: destination },
            { label: t("conditionBefore"), value: labelOrDash(labels, checkout.conditionBefore) },
            { label: tAsset("custodian"), value: checkout.asset.custodian ? `${checkout.asset.custodian.code} - ${checkout.asset.custodian.fullNameTh}` : "-" },
            { label: t("remark"), value: checkout.remark },
          ],
        },
      ]}
      signatures={[
        { title: t("checkedOutBy"), helper: t("signatureDate") },
        { title: t("receiver"), helper: t("signatureDate") },
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
