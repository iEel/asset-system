import { Fragment } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { AssetPhotoFrame } from "@/components/assets/asset-photo-frame"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList, type KeyValueItem } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { StatusBadge } from "@/components/ui/status-badge"
import type { AssetOwnershipKind } from "@/lib/asset-actions"
import { formatAssetDetailDate } from "@/lib/asset-detail-frame-rules"
import { maskLicenseKey } from "@/lib/asset-detail-format"
import type { AssetHistoryEvent } from "@/lib/asset-history-rules"
import type { AssetMovementDocumentKind } from "@/lib/asset-movement-labels"
import { getAssetStateTone } from "@/lib/design-system"
import { formatCount, formatMoney } from "@/lib/display-format"
import { cn } from "@/lib/utils"

export type AssetOverviewDetails = {
  category: { code: string; name: string }
  company: { code: string; nameTh: string }
  branch: { code: string; name: string }
  brandModel: string | null
  serial: { isLicenseKey: boolean; value: string | null }
  condition: { name: string; nameTh: string }
  ownershipType: AssetOwnershipKind
  department: { code: string; name: string } | null
  homeLocation: { code: string; name: string } | null
  licenseDevice: { assetTag: string; name: string; href: string } | null
  registeredAt: Date
  latestHandover: { code: string; href: string } | null
  remark: string | null
  specs: { items: { id: string; label: string; value: string }[]; notes: string | null }
  purchase: {
    price: number | null
    date: Date | null
    supplier: { code: string; name: string } | null
    warrantyStart: Date | null
    warrantyEnd: Date | null
    poNumber: string | null
    invoiceNumber: string | null
    fixedAssetCode: string | null
    documents: { id: string; documentNo: string }[]
    documentsHref: string
  }
}

const COMPONENT_PREVIEW_LIMIT = 5
const groupTitleClasses = "mb-3 text-sm font-semibold text-foreground"
const standaloneLink = cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")

// The overview tab (group 1 spec §7.5, canvas B): the R59 line of missing details, then the 12-column grid from lg in
// the phone's DOM order: รูป (4, right), ข้อมูลทรัพย์สิน (8, left; the #overview and #purchase anchors, R23), the latest
// three events (8) and the components (4). Every write control needs asset:edit (canEdit). Server-rendered.
export function AssetOverview({
  locale,
  canEdit,
  editHref,
  purchaseEditHref,
  details,
  conditionHelp,
  photo,
  recent,
  documentAccess,
  components,
  dataGaps,
}: {
  locale: string
  canEdit: boolean
  editHref: string
  purchaseEditHref: string
  details: AssetOverviewDetails
  conditionHelp: { title: string; description: string; items: string[] }
  photo: { attachmentId: string | null; isModelPhoto: boolean; alt: string; uploadHref: string }
  recent: { events: AssetHistoryEvent[]; total: number; historyHref: string } | null
  documentAccess: Record<AssetMovementDocumentKind, boolean>
  components: {
    children: { id: string; assetTag: string; name: string; href: string }[]
    parent: { assetTag: string; name: string; href: string } | null
    manageHref: string | null
    allHref: string
  }
  dataGaps: { key: string; label: string; href: string }[]
}) {
  const t = useTranslations("assetDetail")
  const tAsset = useTranslations("asset")
  const tBrandModel = useTranslations("brandModel")
  const tCommon = useTranslations("common")
  const tAll = useTranslations()

  const coded = (value: { code: string; name: string } | null) =>
    value ? (
      <>
        <span className="tag">{value.code}</span> - {value.name}
      </>
    ) : null

  const factRows: KeyValueItem[] = [
    { key: "category", label: tAsset("category"), value: coded(details.category) },
    { key: "company", label: t("ownerCompany"), value: coded({ code: details.company.code, name: details.company.nameTh }) },
    { key: "branch", label: tAsset("assetOwnerBranch"), value: coded(details.branch) },
    { key: "brandModel", label: t("brandModel"), value: details.brandModel },
    {
      key: "serial",
      label: details.serial.isLicenseKey ? tAsset("licenseKey") : tAsset("serialNumber"),
      value: details.serial.value ? <span className="tag">{details.serial.isLicenseKey ? maskLicenseKey(details.serial.value) : details.serial.value}</span> : null,
    },
    {
      key: "condition",
      label: tAsset("condition"),
      value: (
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge label={details.condition.nameTh} tone={getAssetStateTone(details.condition.name)} />
          <AssetStateHelpPopover {...conditionHelp} />
        </span>
      ),
    },
    { key: "ownershipType", label: tAsset("ownershipType"), value: tAsset(`ownershipType_${details.ownershipType}`) },
    ...(details.department ? [{ key: "department", label: tAsset("department"), value: coded(details.department) }] : []),
    ...(details.homeLocation ? [{ key: "homeLocation", label: tAsset("homeLocation"), value: coded(details.homeLocation) }] : []),
    ...(details.licenseDevice
      ? [
          {
            key: "licenseDevice",
            label: tAsset("licenseAssignedAsset"),
            value: (
              <Link href={details.licenseDevice.href} className={linkVariants({ size: "inherit" })}>
                <span className="tag">{details.licenseDevice.assetTag}</span> {details.licenseDevice.name}
              </Link>
            ),
          },
        ]
      : []),
    { key: "registeredAt", label: t("registeredAt"), value: formatAssetDetailDate(details.registeredAt, locale) },
    {
      key: "latestHandover",
      label: t("latestHandover"),
      value: details.latestHandover ? (
        <Link href={details.latestHandover.href} className={linkVariants({ size: "inherit" })}>
          <span className="tag">{details.latestHandover.code}</span>
        </Link>
      ) : null,
    },
    { key: "remark", label: tAsset("remark"), value: details.remark },
  ]

  const specRows: KeyValueItem[] = [
    ...details.specs.items.map((item) => ({ key: item.id, label: item.label, value: item.value })),
    ...(details.specs.notes ? [{ key: "specNotes", label: tBrandModel("specNotes"), value: <span className="whitespace-pre-wrap">{details.specs.notes}</span> }] : []),
  ]

  const purchase = details.purchase
  const purchaseRows: KeyValueItem[] = [
    ...(purchase.price !== null
      ? [{ key: "purchasePrice", label: tAsset("purchasePrice"), value: <span className="num">{formatMoney(purchase.price, { unit: tCommon("baht") })}</span> }]
      : []),
    ...(purchase.date ? [{ key: "purchaseDate", label: tAsset("purchaseDate"), value: formatAssetDetailDate(purchase.date, locale) }] : []),
    ...(purchase.supplier ? [{ key: "supplier", label: tAsset("supplier"), value: coded(purchase.supplier) }] : []),
    ...(purchase.warrantyStart ? [{ key: "warrantyStart", label: tAsset("warrantyStart"), value: formatAssetDetailDate(purchase.warrantyStart, locale) }] : []),
    ...(purchase.warrantyEnd ? [{ key: "warrantyEnd", label: tAsset("warrantyEnd"), value: formatAssetDetailDate(purchase.warrantyEnd, locale) }] : []),
    ...(purchase.poNumber ? [{ key: "poNumber", label: tAsset("poNumber"), value: purchase.poNumber }] : []),
    ...(purchase.invoiceNumber ? [{ key: "invoiceNumber", label: tAsset("invoiceNumber"), value: purchase.invoiceNumber }] : []),
    ...(purchase.fixedAssetCode ? [{ key: "fixedAssetCode", label: tAsset("fixedAssetCode"), value: purchase.fixedAssetCode }] : []),
    ...(purchase.documents.length > 0
      ? [
          {
            key: "purchaseDocuments",
            label: tAsset("purchaseDocuments"),
            value: (
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                {purchase.documents.map((document) => (
                  <Link key={document.id} href={details.purchase.documentsHref} className={linkVariants({ size: "inherit" })}>
                    <span className="tag">{document.documentNo}</span>
                  </Link>
                ))}
              </span>
            ),
          },
        ]
      : []),
  ]
  // R55: a person who may not edit reads the empty purchase facts, not the prompt.
  const emptyPurchaseRows: KeyValueItem[] = [
    { key: "purchasePrice", label: tAsset("purchasePrice"), value: <Nil /> },
    { key: "purchaseDate", label: tAsset("purchaseDate"), value: <Nil /> },
    { key: "supplier", label: tAsset("supplier"), value: <Nil /> },
    { key: "warrantyEnd", label: tAsset("warrantyEnd"), value: <Nil /> },
  ]

  const renderDocument = (event: AssetHistoryEvent) =>
    event.document && documentAccess[event.document.kind] ? (
      <Link href={event.document.href} className={linkVariants({ size: "inherit" })}>
        <span className="tag">{event.document.code}</span>
      </Link>
    ) : (
      <Nil />
    )

  const shownChildren = components.children.slice(0, COMPONENT_PREVIEW_LIMIT)

  return (
    <div className="space-y-4">
      {dataGaps.length > 0 ? (
        <Notice tone="neutral" data-slot="asset-data-gaps">
          {tAsset("dataGapsTitle", { count: formatCount(dataGaps.length) })}{" "}
          {dataGaps.map((gap, index) => (
            <Fragment key={gap.key}>
              {index > 0 ? " · " : null}
              <Link href={gap.href} className={linkVariants({ size: "inherit" })}>{gap.label}</Link>
            </Fragment>
          ))}
        </Notice>
      ) : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-4 lg:col-start-9 lg:row-start-1">
          <ContentPanel divided title={t("photoTitle")}>
            <AssetPhotoFrame
              attachmentId={photo.attachmentId}
              alt={photo.alt}
              label={photo.isModelPhoto ? tAsset("modelPhoto") : undefined}
              canUpload={canEdit}
              uploadHref={photo.uploadHref}
              className="aspect-[4/3] w-full"
            />
          </ContentPanel>
        </div>
        <div id="overview" className="min-w-0 scroll-mt-24 lg:col-span-8 lg:col-start-1 lg:row-start-1">
          <ContentPanel divided title={t("detailsTitle")} actions={canEdit ? (
              <Link href={editHref} className={standaloneLink}>
                {tCommon("edit")}
              </Link>
            ) : undefined}
          >
            <div className="space-y-6">
              <KeyValueList items={factRows} />
              {specRows.length > 0 ? (
                <div>
                  <h3 className={groupTitleClasses}>{tBrandModel("structuredSpecs")}</h3>
                  <KeyValueList items={specRows} />
                </div>
              ) : null}
              <div id="purchase" className="scroll-mt-24">
                <h3 className={groupTitleClasses}>{tAsset("purchaseWarranty")}</h3>
                {purchaseRows.length > 0 || !canEdit ? (
                  <KeyValueList items={purchaseRows.length > 0 ? purchaseRows : emptyPurchaseRows} />
                ) : (
                  <>
                    <EmptyNote>{t("purchaseEmpty")}</EmptyNote>
                    <Link href={purchaseEditHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}>
                      {t("purchaseAdd")}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </ContentPanel>
        </div>
        {recent ? (
          <div className="min-w-0 lg:col-span-8">
            <ContentPanel divided flush title={t("recentTitle")} actions={
                <Link href={recent.historyHref} className={standaloneLink}>
                  {t("recentAll", { count: formatCount(recent.total) })}
                </Link>
              }
            >
              {recent.events.length === 0 ? (
                <EmptyNote padded>{t("recentEmpty")}</EmptyNote>
              ) : (
                <>
                  <DataTable framed={false} className="hidden md:block" caption={t("recentTitle")}>
                    <DataTableHeader>
                      <tr>
                        <DataTableHead>{tAsset("history.columns.date")}</DataTableHead>
                        <DataTableHead>{tAsset("history.columns.event")}</DataTableHead>
                        <DataTableHead>{tAsset("history.columns.detail")}</DataTableHead>
                        <DataTableHead>{tAsset("history.columns.document")}</DataTableHead>
                      </tr>
                    </DataTableHeader>
                    <DataTableBody>
                      {recent.events.map((event) => (
                        <DataTableRow key={event.id}>
                          <DataTableCell className="whitespace-nowrap text-muted-foreground">
                            <span className="num">{formatAssetDetailDate(event.at, locale)}</span>
                          </DataTableCell>
                          <DataTableCell className="whitespace-nowrap font-medium text-foreground">{tAll(event.labelKey)}</DataTableCell>
                          <DataTableCell className="min-w-56 text-muted-foreground">{event.detail ?? <Nil />}</DataTableCell>
                          <DataTableCell className="whitespace-nowrap">{renderDocument(event)}</DataTableCell>
                        </DataTableRow>
                      ))}
                    </DataTableBody>
                  </DataTable>
                  <ContentPanelRows className="md:hidden">
                    {recent.events.map((event) => (
                      <li key={event.id} className="space-y-1">
                        <div className="text-meta text-faint-foreground">
                          <span className="num">{formatAssetDetailDate(event.at, locale)}</span> · {tAll(event.labelKey)}
                        </div>
                        <div className="break-words text-sm text-foreground">{event.detail ?? <Nil />}</div>
                        {event.document && documentAccess[event.document.kind] ? (
                          <div className="text-sm">{renderDocument(event)}</div>
                        ) : null}
                      </li>
                    ))}
                  </ContentPanelRows>
                </>
              )}
            </ContentPanel>
          </div>
        ) : null}
        <div className="min-w-0 lg:col-span-4">
          <ContentPanel divided flush title={t("componentsTitle")} actions={components.manageHref ? (
              <Link href={components.manageHref} className={standaloneLink}>
                {t("componentsManage")}
              </Link>
            ) : undefined}
          >
            {components.parent || shownChildren.length > 0 ? (
              <ContentPanelRows>
                {components.parent ? (
                  <li className="text-sm text-muted-foreground">
                    {t("componentOf")}{" "}
                    <Link href={components.parent.href} className={linkVariants({ size: "inherit" })}>
                      <span className="tag">{components.parent.assetTag}</span> {components.parent.name}
                    </Link>
                  </li>
                ) : null}
                {shownChildren.map((child) => (
                  <li key={child.id} className="min-w-0">
                    <Link href={child.href} className={linkVariants({ size: "inherit" })}>
                      <span className="block break-words text-sm">{child.name}</span>
                      <span className="block text-meta">
                        <span className="tag">{child.assetTag}</span>
                      </span>
                    </Link>
                  </li>
                ))}
                {components.children.length > COMPONENT_PREVIEW_LIMIT ? (
                  <li>
                    <Link href={components.allHref} className={standaloneLink}>
                      {t("componentsMore", { count: formatCount(components.children.length) })}
                    </Link>
                  </li>
                ) : null}
              </ContentPanelRows>
            ) : (
              <EmptyNote padded>{t("componentsEmpty")}</EmptyNote>
            )}
          </ContentPanel>
        </div>
      </div>
    </div>
  )
}
