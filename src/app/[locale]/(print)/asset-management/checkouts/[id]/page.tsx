import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buildReferenceLabelMap, labelOrDash } from "@/lib/asset-operation-document"
import { formatDate, formatDateTime } from "@/lib/utils"
import { OperationDocumentPrint } from "@/components/asset-operations/operation-document-print"
import { normalizeAssetReturnTo } from "@/lib/asset-return-navigation"
import { hasPermission } from "@/lib/auth-utils"
import { parseAssetTransactionSnapshot } from "@/lib/asset-transaction-snapshot"
import { TransactionCancelDialog } from "@/components/asset-operations/transaction-cancel-dialog"

type CheckoutPrintPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function CheckoutPrintPage({ params, searchParams }: CheckoutPrintPageProps) {
  const { locale, id } = await params
  const filters = await searchParams
  const user = await requirePagePermission(locale, "asset", "view")

  const t = await getTranslations("checkout")
  const tAsset = await getTranslations("asset")
  const tCommon = await getTranslations("common")
  const tCancellation = await getTranslations("transactionCancellation")

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

  const beforeSnapshot = parseAssetTransactionSnapshot(checkout.beforeSnapshotJson)
  const afterSnapshot = parseAssetTransactionSnapshot(checkout.afterSnapshotJson)

  const labels = await buildReferenceLabelMap([
    checkout.departmentId,
    checkout.locationId,
    checkout.parentAssetId,
    checkout.conditionBefore,
    beforeSnapshot?.statusId,
    beforeSnapshot?.currentLocationId,
    afterSnapshot?.statusId,
    afterSnapshot?.currentLocationId,
  ])
  const receiverSignatureAttachment = await prisma.attachment.findFirst({
    where: {
      module: "checkout_receiver_signature",
      referenceId: checkout.id,
      isActive: true,
    },
    select: { id: true },
    orderBy: { uploadedAt: "desc" },
  })
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
      backHref={filters.returnTo
        ? normalizeAssetReturnTo(locale, filters.returnTo)
        : `/${locale}/assets/${checkout.asset.id}`}
      backLabel={tCommon("back")}
      printLabel={t("printHandover")}
      toolbarActions={hasPermission(user, "asset", "edit") && checkout.transactionStatus === "active" ? (
        <TransactionCancelDialog
          type="checkout"
          transactionId={checkout.id}
          expectedUpdatedAt={checkout.updatedAt.toISOString()}
          originalOperator={checkout.checkedOutBy}
          currentState={formatSnapshotState(afterSnapshot, labels)}
          restoreState={formatSnapshotState(beforeSnapshot, labels)}
          componentCount={beforeSnapshot?.components.length ?? 0}
          labels={buildCancellationLabels(tCancellation)}
        />
      ) : null}
      voidInfo={checkout.transactionStatus === "void" ? {
        label: tCancellation("voidLabel"),
        voidReasonLabel: tCancellation("voidReason"),
        voidedByLabel: tCancellation("voidedBy"),
        voidedAtLabel: tCancellation("voidedAt"),
        voidReason: checkout.voidReason,
        voidedBy: checkout.voidedBy,
        voidedAt: formatDateTime(checkout.voidedAt),
      } : null}
      sections={[
        {
          title: t("documentInfo"),
          fields: [
            { label: t("documentNo"), value: checkout.documentNo ?? checkout.id },
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
            { label: t("photoBefore"), value: checkout.photoBefore ? t("evidenceAttached") : "-" },
            { label: t("receiverSignature"), value: checkout.receiverSignature ? t("evidenceAttached") : "-" },
            { label: tAsset("custodian"), value: checkout.asset.custodian ? `${checkout.asset.custodian.code} - ${checkout.asset.custodian.fullNameTh}` : "-" },
            { label: t("remark"), value: checkout.remark },
          ],
        },
      ]}
      signatures={[
        { title: t("checkedOutBy"), helper: t("signatureDate") },
        { title: t("receiver"), helper: t("signatureDate"), imageSrc: receiverSignatureAttachment ? `/api/attachments/${receiverSignatureAttachment.id}?inline=1` : null },
        { title: t("approver"), helper: t("signatureDate") },
      ]}
    />
  )
}

function formatSnapshotState(snapshot: ReturnType<typeof parseAssetTransactionSnapshot>, labels: Map<string, string>) {
  if (!snapshot) return "-"
  return `${labelOrDash(labels, snapshot.statusId)} · ${labelOrDash(labels, snapshot.currentLocationId)}`
}

function buildCancellationLabels(t: Awaited<ReturnType<typeof getTranslations>>) {
  return {
    action: t("action"), title: t("title"), description: t("description"), reasonLabel: t("reasonLabel"),
    reasonPlaceholder: t("reasonPlaceholder"), confirm: t("confirm"), cancel: t("cancel"), loading: t("loading"),
    blockedTitle: t("blockedTitle"), blockedDescription: t("blockedDescription"), success: t("success"), error: t("error"),
    reasonTooShort: t("reasonTooShort"), operator: t("operator"), currentState: t("currentState"), restoreState: t("restoreState"),
    components: t("components"), blockers: {
      unsupported_snapshot: t("blockers.unsupported_snapshot"), not_active: t("blockers.not_active"), not_latest: t("blockers.not_latest"),
      asset_changed: t("blockers.asset_changed"), components_changed: t("blockers.components_changed"), downstream_work: t("blockers.downstream_work"),
    },
  }
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
