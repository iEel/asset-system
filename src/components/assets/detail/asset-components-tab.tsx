import Link from "next/link"
import { PackagePlus } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { AssetRelationshipMap, type RelationshipLink } from "@/components/assets/detail/asset-relationship-map"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { Nil } from "@/components/ui/nil"
import { assetComponentHistoryColumn, type AssetComponentHistoryEvent } from "@/lib/asset-component-history-rules"
import { formatAssetDetailDate } from "@/lib/asset-detail-frame-rules"
import { assetMovementLabelKey, buildAssetMovementDocumentHref, type AssetMovementDocumentKind } from "@/lib/asset-movement-labels"

export type AssetRelationshipAsset = { id: string; href: string; assetTag: string; name: string; role: string; slotNo: string | null }

type Translate = (key: string, values?: Record<string, string | number>) => string

// The components tab (group 1 asset detail task 10, spec §7.7): the relationship map, always shown, with the custodian on
// the current card and "จัดการส่วนควบ" for editors, then the install/remove history. A document links only for a person
// whose permission opens it (R12); an inactive asset's page answers 404, so it shows without a link. Links carry no
// returnTo (R38).
export async function AssetComponentsTab({
  locale,
  asset,
  parents,
  components,
  licenseDevice,
  assignedLicenses,
  manageHref,
  history,
  documentAccess,
}: {
  locale: string
  asset: { id: string; assetTag: string; name: string; custodianName: string | null }
  parents: AssetRelationshipAsset[]
  components: AssetRelationshipAsset[]
  licenseDevice: { id: string; assetTag: string; name: string } | null
  assignedLicenses: { id: string; assetTag: string; name: string; licenseUsedSeats: number | null; licenseTotalSeats: number | null }[]
  manageHref: string | null
  history: AssetComponentHistoryEvent[]
  documentAccess: Record<AssetMovementDocumentKind, boolean>
}) {
  const t = await getTranslations("asset")
  const tCommon = await getTranslations("common")
  // The movement labels are full message keys.
  const tAll = await getTranslations()

  // The deleted summary's slot moves into the role chip.
  const toLink = (item: AssetRelationshipAsset): RelationshipLink => ({
    id: item.id,
    href: item.href,
    label: `${item.assetTag} - ${item.name}`,
    role: item.slotNo ? t("componentsTab.roleWithSlot", { role: item.role, slot: item.slotNo }) : item.role,
  })
  const column = assetComponentHistoryColumn(history)
  const columnLabel = column === "parent" ? t("componentsTab.columnParent") : column === "related" ? t("componentsTab.columnRelated") : t("componentsTab.columnComponent")

  const renderOther = (event: AssetComponentHistoryEvent) => {
    const text = (
      <>
        <span className="tag">{event.other.assetTag}</span> {event.other.name}
      </>
    )
    return event.other.isActive ? (
      <Link href={`/${locale}/assets/${event.other.id}`} className={linkVariants({ size: "inherit" })}>
        {text}
      </Link>
    ) : (
      <span className="text-foreground">{text}</span>
    )
  }
  const renderNote = (event: AssetComponentHistoryEvent) => {
    // Without the permission there is neither link nor code (R12).
    const document = event.document && documentAccess[event.document.kind] ? (
      <Link href={buildAssetMovementDocumentHref(locale, event.document)} className={linkVariants({ size: "inherit" })}>
        <span className="tag">{event.document.code}</span>
      </Link>
    ) : null
    if (!event.reason && !document) return <Nil />
    return (
      <>
        {event.reason ? <span className="break-words">{event.reason}</span> : null}
        {event.reason && document ? " " : null}
        {document}
      </>
    )
  }

  return (
    <div id="components" className="scroll-mt-24 space-y-6">
      <AssetRelationshipMap
        title={t("relationshipMap")}
        subtitle={t("relationshipMapHelp")}
        parentLaneTitle={t("relationshipParentLane")}
        currentTitle={t("relationshipCurrentViewing")}
        componentsTitle={t("relationshipComponentsLane")}
        componentsCountLabel={t("relationshipComponentsCount", { count: components.length })}
        moreItemsLabel={t("relationshipMoreItems", { count: Math.max(components.length - 5, 0) })}
        licenseAssignedTitle={t("relationshipLicenseAssignedAsset")}
        assignedLicensesTitle={t("relationshipAssignedLicenses")}
        assetTag={asset.assetTag}
        assetName={asset.name}
        currentMetaLabel={t("custodian")}
        currentMetaValue={asset.custodianName ?? t("noCustodian")}
        parentLinks={parents.map(toLink)}
        childLinks={components.map(toLink)}
        licenseAssignedLinks={licenseDevice ? [{
          id: licenseDevice.id,
          href: `/${locale}/assets/${licenseDevice.id}`,
          label: `${licenseDevice.assetTag} - ${licenseDevice.name}`,
          role: t("relationshipLicenseDeviceRole"),
        }] : []}
        assignedLicenseLinks={assignedLicenses.map((license) => ({
          id: license.id,
          href: `/${locale}/assets/${license.id}`,
          label: `${license.assetTag} - ${license.name}`,
          role: formatLicenseRelationshipRole(license.licenseUsedSeats, license.licenseTotalSeats, t),
        }))}
        emptyLabel={t("relationshipMapEmpty")}
        summaryParent={t("relationshipSummaryParent", { count: components.length })}
        summaryComponent={t("relationshipSummaryComponent", { parent: parents[0]?.assetTag ?? "-" })}
        summaryParentAndComponent={t("relationshipSummaryParentAndComponent", {
          parent: parents[0]?.assetTag ?? "-",
          count: components.length,
        })}
        summaryStandalone={t("relationshipSummaryStandalone")}
        roleParentLabel={t("relationshipRoleParent")}
        roleComponentLabel={t("relationshipRoleComponent")}
        roleParentAndComponentLabel={t("relationshipRoleParentAndComponent")}
        roleStandaloneLabel={t("relationshipRoleStandalone")}
        parentEmptyTitle={t("relationshipNoParent")}
        parentEmptyHelp={t("relationshipNoParentHelp")}
        componentsEmptyTitle={t("relationshipNoComponents")}
        componentsEmptyHelp={t("relationshipNoComponentsHelp")}
        noteLabel={t("relationshipNote")}
        actions={manageHref ? (
          <Link href={manageHref} className={buttonVariants({ variant: "outline", size: "md" })}>
            <PackagePlus aria-hidden="true" />
            {t("manageComponents")}
          </Link>
        ) : undefined}
      />

      <ContentPanel divided flush title={t("componentsTab.historyTitle")}>
        {history.length === 0 ? (
          <EmptyNote padded>{t("componentsTab.historyEmpty")}</EmptyNote>
        ) : (
          <>
            <DataTable framed={false} className="hidden md:block" caption={t("componentsTab.historyTitle")} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("componentsTab.columnDate")}</DataTableHead>
                  <DataTableHead>{t("componentsTab.columnEvent")}</DataTableHead>
                  <DataTableHead>{columnLabel}</DataTableHead>
                  <DataTableHead>{t("componentsTab.columnNote")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {history.map((event) => (
                  <DataTableRow key={event.id}>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      <span className="num">{formatAssetDetailDate(event.at, locale)}</span>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap font-medium text-foreground">{tAll(assetMovementLabelKey(event.kind))}</DataTableCell>
                    <DataTableCell className="min-w-56 text-sm">{renderOther(event)}</DataTableCell>
                    <DataTableCell className="min-w-56 text-sm text-muted-foreground">{renderNote(event)}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
            <ContentPanelRows className="md:hidden">
              {history.map((event) => (
                <li key={event.id} className="space-y-1">
                  <div className="text-meta text-faint-foreground">
                    <span className="num">{formatAssetDetailDate(event.at, locale)}</span> · {tAll(assetMovementLabelKey(event.kind))}
                  </div>
                  <div className="break-words text-sm">{renderOther(event)}</div>
                  <div className="break-words text-sm text-muted-foreground">{renderNote(event)}</div>
                </li>
              ))}
            </ContentPanelRows>
          </>
        )}
      </ContentPanel>
    </div>
  )
}

function formatLicenseRelationshipRole(usedSeats: number | null, totalSeats: number | null, t: Translate) {
  if (totalSeats == null) return t("relationshipLicenseRole")
  return t("relationshipLicenseSeatRole", {
    used: usedSeats ?? 0,
    total: totalSeats,
  })
}
