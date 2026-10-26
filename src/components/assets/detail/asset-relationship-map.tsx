import type React from "react"
import Link from "next/link"
import { ArrowDown, ArrowLeft, ArrowRight, Building2, CheckCircle2, Cpu, Info as InfoIcon, PackageCheck, Puzzle } from "lucide-react"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Nil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { splitRelationshipPreview } from "@/lib/asset-relationship-preview"

// The asset's relationship map (group 1 asset detail task 10): parent lane, this asset, components lane, the summary
// line and the note, moved out of the page as they were. Server-safe, no directive: the labels come from the tab.
export type RelationshipLink = { id: string; href: string; label: string; role: string }

export function AssetRelationshipMap({
  title,
  subtitle,
  parentLaneTitle,
  currentTitle,
  componentsTitle,
  componentsCountLabel,
  moreItemsLabel,
  licenseAssignedTitle,
  assignedLicensesTitle,
  assetTag,
  assetName,
  currentMetaLabel,
  currentMetaValue,
  parentLinks,
  childLinks,
  licenseAssignedLinks,
  assignedLicenseLinks,
  emptyLabel,
  summaryParent,
  summaryComponent,
  summaryParentAndComponent,
  summaryStandalone,
  roleParentLabel,
  roleComponentLabel,
  roleParentAndComponentLabel,
  roleStandaloneLabel,
  parentEmptyTitle,
  parentEmptyHelp,
  componentsEmptyTitle,
  componentsEmptyHelp,
  noteLabel,
  actions,
}: {
  title: string
  subtitle: string
  parentLaneTitle: string
  currentTitle: string
  componentsTitle: string
  componentsCountLabel: string
  moreItemsLabel: string
  licenseAssignedTitle: string
  assignedLicensesTitle: string
  assetTag: string
  assetName: string
  currentMetaLabel: string
  currentMetaValue: string
  parentLinks: RelationshipLink[]
  childLinks: RelationshipLink[]
  licenseAssignedLinks: RelationshipLink[]
  assignedLicenseLinks: RelationshipLink[]
  emptyLabel: string
  summaryParent: string
  summaryComponent: string
  summaryParentAndComponent: string
  summaryStandalone: string
  roleParentLabel: string
  roleComponentLabel: string
  roleParentAndComponentLabel: string
  roleStandaloneLabel: string
  parentEmptyTitle: string
  parentEmptyHelp: string
  componentsEmptyTitle: string
  componentsEmptyHelp: string
  noteLabel: string
  actions?: React.ReactNode
}) {
  const relationshipState = getRelationshipState(parentLinks.length, childLinks.length)
  const summaryLabel = getRelationshipSummaryLabel(relationshipState, {
    parent: summaryParent,
    component: summaryComponent,
    parentAndComponent: summaryParentAndComponent,
    standalone: summaryStandalone,
  })
  const currentRoleLabel = getRelationshipRoleLabel(relationshipState, {
    parent: roleParentLabel,
    component: roleComponentLabel,
    parentAndComponent: roleParentAndComponentLabel,
    standalone: roleStandaloneLabel,
  })
  const childPreview = splitRelationshipPreview(childLinks)

  return (
    <ContentPanel title={title} description={subtitle} actions={actions}>
      <div className="mb-5 flex flex-col gap-3 rounded-md border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-meta text-muted-foreground">{currentTitle}</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{currentRoleLabel}</div>
        </div>
        <RelationshipSummaryBadge label={summaryLabel} state={relationshipState} />
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.1fr)_auto_minmax(0,1fr)] md:items-center">
        <RelationshipLane title={parentLaneTitle} icon={<Building2 className="h-4 w-4" />}>
          {parentLinks.length === 0 ? (
            <RelationshipEmptyState title={parentEmptyTitle} help={parentEmptyHelp} icon={<Building2 />} />
          ) : (
            <div className="space-y-2">
              {parentLinks.map((link) => (
                <RelationshipAssetCard key={link.id} link={link} variant="parent" />
              ))}
            </div>
          )}
        </RelationshipLane>

        <RelationshipConnector direction="left" />

        <div>
          <div className="mb-2 text-meta font-medium text-muted-foreground">{currentTitle}</div>
          <RelationshipAssetCard
            assetTag={assetTag}
            assetName={assetName}
            role={currentRoleLabel}
            metaLabel={currentMetaLabel}
            metaValue={currentMetaValue}
            variant={relationshipState === "component" || relationshipState === "parentAndComponent" ? "component" : relationshipState}
            current
          />
        </div>

        <RelationshipConnector direction="right" />

        <RelationshipLane title={componentsTitle} icon={<Puzzle className="h-4 w-4" />} countLabel={componentsCountLabel}>
          {childLinks.length === 0 ? (
            <RelationshipEmptyState title={componentsEmptyTitle} help={componentsEmptyHelp} icon={<Puzzle />} />
          ) : (
            <div className="space-y-2">
              {childPreview.visible.map((link) => (
                <RelationshipAssetCard key={link.id} link={link} variant="child" />
              ))}
              {childPreview.remaining.length > 0 ? (
                <details className="rounded-md border border-border bg-surface">
                  <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {moreItemsLabel}
                  </summary>
                  <div className="space-y-2 border-t border-border p-2">
                    {childPreview.remaining.map((link) => (
                      <RelationshipAssetCard key={link.id} link={link} variant="child" />
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          )}
        </RelationshipLane>
      </div>

      {(licenseAssignedLinks.length > 0 || assignedLicenseLinks.length > 0) ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <RelationshipLinkList title={licenseAssignedTitle} links={licenseAssignedLinks} emptyLabel={emptyLabel} />
          <RelationshipLinkList title={assignedLicensesTitle} links={assignedLicenseLinks} emptyLabel={emptyLabel} />
        </div>
      ) : null}

      <Notice tone="neutral" className="mt-4">{noteLabel}</Notice>
    </ContentPanel>
  )
}

function RelationshipLane({
  title,
  icon,
  countLabel,
  children,
}: {
  title: string
  icon: React.ReactNode
  countLabel?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-full rounded-md border border-border bg-background p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-meta font-medium text-muted-foreground">
          {icon}
          <span className="truncate">{title}</span>
        </div>
        {/* A count is plain text (2D-2 R2). */}
        {countLabel ? <span className="shrink-0 text-meta text-muted-foreground">{countLabel}</span> : null}
      </div>
      {children}
    </div>
  )
}

// The lines between the lanes are solid border lines: a dashed border is kept for drop zones and the signature pad
// (spec 2D §5.4 guard 2), and the arrows are decoration, so they take no color.
function RelationshipConnector({ direction }: { direction: "left" | "right" }) {
  const Icon = direction === "left" ? ArrowLeft : ArrowRight

  return (
    <div className="flex items-center justify-center md:block">
      <div aria-hidden="true" className="flex flex-col items-center text-muted-foreground md:hidden">
        <span className="h-3 border-l border-border" />
        <span className="flex size-8 items-center justify-center rounded-full border border-border bg-surface">
          <ArrowDown className="h-4 w-4" />
        </span>
        <span className="h-3 border-l border-border" />
      </div>
      <div aria-hidden="true" className="hidden items-center gap-1 text-muted-foreground md:flex">
        <span className="h-px w-5 border-t border-border" />
        <span className="flex size-8 items-center justify-center rounded-full border border-border bg-surface">
          <Icon className="h-4 w-4" />
        </span>
        <span className="h-px w-5 border-t border-border" />
      </div>
    </div>
  )
}

// The summary is a sentence that may be long, so it is plain text with its icon, not a badge (StatusBadge is nowrap).
function RelationshipSummaryBadge({
  label,
  state,
}: {
  label: string
  state: RelationshipState
}) {
  const Icon = state === "standalone" ? InfoIcon : CheckCircle2

  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{label}</span>
    </p>
  )
}

// Kept as a wrapper so the lanes read the same; the empty state itself is the shared one (spec 2D M21).
function RelationshipEmptyState({
  title,
  help,
  icon,
}: {
  title: string
  help: string
  icon: React.ReactNode
}) {
  return <ActionEmptyState icon={icon} title={title} description={help} />
}

function RelationshipAssetCard({
  link,
  assetTag,
  assetName,
  role,
  metaLabel,
  metaValue,
  variant,
  current,
}: {
  link?: RelationshipLink
  assetTag?: string
  assetName?: string
  role?: string
  metaLabel?: string
  metaValue?: string
  variant: RelationshipCardVariant
  current?: boolean
}) {
  const relationshipLabel = link ? splitRelationshipLabel(link.label) : { assetTag: assetTag ?? null, name: assetName ?? null }
  const relationshipAsset = { assetTag: relationshipLabel.assetTag ?? <Nil />, name: relationshipLabel.name ?? <Nil /> }
  const roleLabel = role ?? link?.role
  const iconBoxClassName = current ? "h-10 w-10" : "h-9 w-9"
  const iconClassName = current ? "h-5 w-5" : "h-4 w-4"
  // Spec 2D: no raw palette colors. The role is a name (the shared Chip, 2D-2 R2); the card in view has the primary
  // border, the others the row hover. The tag keeps font-mono because it must wrap in a narrow lane (2D-2 R3), at 500.
  const content = (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ${iconBoxClassName}`}>
          {variant === "child" || variant === "component" ? <Cpu className={iconClassName} /> : <PackageCheck className={iconClassName} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm font-medium leading-5 text-foreground [overflow-wrap:anywhere]">{relationshipAsset.assetTag}</div>
          <div className="mt-1 line-clamp-3 text-sm leading-5 text-foreground [overflow-wrap:anywhere]">{relationshipAsset.name}</div>
        </div>
      </div>

      {roleLabel || (metaLabel && metaValue) ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
          {roleLabel ? <Chip>{roleLabel}</Chip> : null}
          {metaLabel && metaValue ? (
            <span className="text-meta text-muted-foreground">
              <span className="font-medium text-foreground">{metaLabel}</span>
              <span className="mx-1">:</span>
              <span>{metaValue}</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
  const className = `block rounded-md border px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${current ? "min-h-36" : ""} ${getRelationshipCardClass(Boolean(current))}`

  if (link) {
    return (
      <Link href={link.href} className={className}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}

function RelationshipLinkList({
  title,
  links,
  emptyLabel,
}: {
  title: string
  links: RelationshipLink[]
  emptyLabel: string
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <h3 className="mb-2 text-meta font-medium text-muted-foreground">{title}</h3>
      {links.length === 0 ? (
        <EmptyNote>{emptyLabel}</EmptyNote>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <Link key={link.id} href={link.href} className="block rounded-md border border-border bg-surface px-3 py-2 transition-colors hover:bg-row-hover">
              <div className="text-sm font-medium text-primary">{link.label}</div>
              <div className="mt-1 text-meta text-muted-foreground">{link.role}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

type RelationshipState = "parent" | "component" | "parentAndComponent" | "standalone"
type RelationshipCardVariant = RelationshipState | "child"

function getRelationshipState(parentCount: number, childCount: number): RelationshipState {
  if (parentCount > 0 && childCount > 0) return "parentAndComponent"
  if (parentCount > 0) return "component"
  if (childCount > 0) return "parent"
  return "standalone"
}

function getRelationshipSummaryLabel(
  state: RelationshipState,
  labels: { parent: string; component: string; parentAndComponent: string; standalone: string }
) {
  if (state === "parentAndComponent") return labels.parentAndComponent
  if (state === "component") return labels.component
  if (state === "parent") return labels.parent
  return labels.standalone
}

function getRelationshipRoleLabel(
  state: RelationshipState,
  labels: { parent: string; component: string; parentAndComponent: string; standalone: string }
) {
  if (state === "parentAndComponent") return labels.parentAndComponent
  if (state === "component") return labels.component
  if (state === "parent") return labels.parent
  return labels.standalone
}

function splitRelationshipLabel(label: string) {
  const separator = " - "
  const separatorIndex = label.indexOf(separator)
  if (separatorIndex === -1) return { assetTag: label, name: null }

  return {
    assetTag: label.slice(0, separatorIndex),
    name: label.slice(separatorIndex + separator.length),
  }
}

function getRelationshipCardClass(current: boolean) {
  return current ? "border-primary-border bg-surface" : "border-border bg-surface hover:bg-row-hover"
}
