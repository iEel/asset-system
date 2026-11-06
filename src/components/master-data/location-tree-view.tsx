"use client"

import { useId, useState, type ReactNode } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Building2, ChevronRight, Pencil, Plus, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { EmptyNote } from "@/components/ui/empty-note"
import { LocationDeactivateButton } from "@/components/master-data/location-deactivate-button"
import { formatCount } from "@/lib/display-format"
import { getPanelClasses } from "@/lib/design-system"
import type { LocationDeactivateCounts } from "@/lib/location-tree-view"
import { cn } from "@/lib/utils"

// One location of the tree, ready to show: the page computes the hrefs, labels and counts on the server.
export type LocationTreeViewNode = {
  id: string
  code: string
  name: string
  typeLabel: string
  // G7P3-R2/R3: own count opens the register exactly; the subtree total is for reading.
  ownAssetCount: number
  subtreeAssetCount: number
  parentOtherBranch: boolean
  path: string
  editHref: string
  addChildHref: string
  assetsHref: string
  counts: LocationDeactivateCounts
  children: LocationTreeViewNode[]
}

export type LocationTreeViewBranch = {
  id: string
  name: string
  meta: string
  count: number
  addHref: string
  roots: LocationTreeViewNode[]
}

// Each depth one step further in; deeper than six levels stays at the last step. Literal strings, so Tailwind sees them.
const indentClasses = ["ps-2 md:ps-4", "ps-6 md:ps-11", "ps-10 md:ps-18", "ps-14 md:ps-25", "ps-18 md:ps-32", "ps-22 md:ps-39", "ps-26 md:ps-46"]

// Spec §6.1, board MD-Locations: the locations of each branch under their parents. A nested list of disclosure buttons
// (aria-expanded, aria-controls), so Tab reaches every control and screen readers hear each level as a list. The same
// list is the phone's view: the columns fold into a line under the name (an indented list).
export function LocationTreeView({
  branches,
  initialExpanded,
  matches,
  search,
  footer,
}: {
  branches: readonly LocationTreeViewBranch[]
  // G7P3-R1: closed below each branch's roots, or the ancestors of the search's matches.
  initialExpanded: readonly string[]
  matches: readonly string[]
  search: string
  footer: string
}) {
  const t = useTranslations("location")
  const [openBranches, setOpenBranches] = useState<ReadonlySet<string>>(() => new Set(branches.map((branch) => branch.id)))
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(initialExpanded))
  const matchSet = new Set(matches)

  const toggle = (set: ReadonlySet<string>, id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  }

  function expandAll() {
    const ids: string[] = []
    const walk = (node: LocationTreeViewNode) => {
      if (node.children.length > 0) ids.push(node.id)
      node.children.forEach(walk)
    }
    branches.forEach((branch) => branch.roots.forEach(walk))
    setOpenBranches(new Set(branches.map((branch) => branch.id)))
    setExpanded(new Set(ids))
  }

  function collapseAll() {
    setOpenBranches(new Set())
    setExpanded(new Set())
  }

  function renderNode(node: LocationTreeViewNode, depth: number): ReactNode {
    return (
      <TreeItem
        key={node.id}
        node={node}
        depth={depth}
        match={matchSet.has(node.id)}
        open={expanded.has(node.id)}
        onToggle={() => setExpanded((current) => toggle(current, node.id))}
        renderChild={(child) => renderNode(child, depth + 1)}
      />
    )
  }

  return (
    <section aria-label={t("tree.label")} className={cn(getPanelClasses(), "overflow-hidden")}>
      <div aria-hidden="true" className="hidden items-center gap-3 bg-background py-2 ps-4 pe-4 text-meta font-medium text-muted-foreground md:flex">
        <span className="flex-1">{t("name")}</span>
        <span className="w-32">{t("locationType")}</span>
        <span className="w-36 text-right">{t("currentAssets")}</span>
        <span className="w-30" />
        <span className="w-11" />
      </div>
      {branches.length === 0 ? (
        <EmptyNote padded className="border-t border-border">
          {search ? t("tree.noMatch", { search }) : t("tree.empty")}
        </EmptyNote>
      ) : (
        <ul>
          {branches.map((branch) => (
            <BranchItem
              key={branch.id}
              branch={branch}
              open={openBranches.has(branch.id)}
              onToggle={() => setOpenBranches((current) => toggle(current, branch.id))}
            >
              {branch.roots.map((root) => renderNode(root, 0))}
            </BranchItem>
          ))}
        </ul>
      )}
      {search && branches.length > 0 && matches.length === 0 ? (
        <EmptyNote padded className="border-t border-border">
          {t("tree.noMatch", { search })}
        </EmptyNote>
      ) : null}
      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-meta text-muted-foreground md:flex-row md:items-center md:gap-3">
        <span className="num">{footer}</span>
        <span>{t("tree.countNote")}</span>
        <span className="flex gap-2 md:ms-auto">
          <Button type="button" variant="ghost" size="sm" onClick={expandAll}>
            {t("tree.expandAll")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={collapseAll}>
            {t("tree.collapseAll")}
          </Button>
        </span>
      </div>
    </section>
  )
}

// The chevron that opens and closes one level. A real button: Tab reaches it, Enter and Space press it.
function Disclosure({ open, groupId, label, onToggle }: { open: boolean; groupId: string; label: string; onToggle: () => void }) {
  return (
    <Button
      type="button"
      aria-expanded={open}
      aria-controls={groupId}
      aria-label={label}
      variant="ghost"
      size="icon-sm"
      onClick={onToggle}
    >
      <ChevronRight className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-90")} aria-hidden="true" />
    </Button>
  )
}

function BranchItem({ branch, open, onToggle, children }: { branch: LocationTreeViewBranch; open: boolean; onToggle: () => void; children: ReactNode }) {
  const t = useTranslations("location")
  const groupId = useId()
  const hasRoots = branch.roots.length > 0
  return (
    <li>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border bg-background py-1.5 ps-2 pe-4">
        {hasRoots ? (
          <Disclosure open={open} groupId={groupId} label={t(open ? "tree.collapse" : "tree.expand", { name: branch.name })} onToggle={onToggle} />
        ) : (
          <span className="size-11 shrink-0 md:size-8" aria-hidden="true" />
        )}
        <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="font-semibold text-foreground">{branch.name}</span>
        <span className="text-meta text-muted-foreground">{branch.meta}</span>
        <span className="num text-meta text-muted-foreground">{t("tree.branchCount", { n: formatCount(branch.count) })}</span>
        <Link href={branch.addHref} className={cn(linkVariants(), "inline-flex min-h-11 items-center gap-1 md:ms-auto md:min-h-0 [&_svg]:size-4")}>
          <Plus aria-hidden="true" />
          {t("tree.addInBranch")}
        </Link>
      </div>
      {hasRoots ? (
        <ul id={groupId} hidden={!open}>
          {children}
        </ul>
      ) : null}
    </li>
  )
}

function TreeItem({
  node,
  depth,
  match,
  open,
  onToggle,
  renderChild,
}: {
  node: LocationTreeViewNode
  depth: number
  match: boolean
  open: boolean
  onToggle: () => void
  renderChild: (child: LocationTreeViewNode) => ReactNode
}) {
  const t = useTranslations("location")
  const tCommon = useTranslations("common")
  const groupId = useId()
  const hasChildren = node.children.length > 0

  const ownCount =
    node.ownAssetCount > 0 ? (
      <Link
        href={node.assetsHref}
        aria-label={t("tree.assetsAt", { name: node.name, n: formatCount(node.ownAssetCount) })}
        className={cn(linkVariants({ size: "inherit" }), "num inline-flex min-h-11 items-center md:min-h-0")}
      >
        {formatCount(node.ownAssetCount)}
      </Link>
    ) : (
      <span className="num text-muted-foreground">{formatCount(0)}</span>
    )
  const subtree = hasChildren ? (
    <span className="num text-meta text-muted-foreground">{t("tree.subtree", { n: formatCount(node.subtreeAssetCount) })}</span>
  ) : null

  return (
    <li>
      <div
        data-match={match || undefined}
        className={cn("flex items-start gap-2 border-t border-border py-1.5 pe-4 md:items-center md:gap-3", indentClasses[Math.min(depth, indentClasses.length - 1)], match && "bg-primary-soft")}
      >
        {hasChildren ? (
          <Disclosure open={open} groupId={groupId} label={t(open ? "tree.collapse" : "tree.expand", { name: node.name })} onToggle={onToggle} />
        ) : (
          <span className="size-11 shrink-0 md:size-8" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1 py-2.5 md:py-0">
          <Link href={node.editHref} className="font-semibold text-foreground hover:underline focus-visible:underline">
            {node.name}
          </Link>
          <span className="ms-2 text-meta text-muted-foreground">
            <span className="tag">{node.code}</span>
          </span>
          {match ? <span className="sr-only"> ({t("tree.match")})</span> : null}
          {node.parentOtherBranch ? (
            <p className="mt-0.5 flex items-center gap-1 text-meta text-warning">
              <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
              {t("tree.parentOtherBranch")}
            </p>
          ) : null}
          {/* Phone: the columns fold into one line under the name. */}
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-meta text-muted-foreground md:hidden">
            <span>{node.typeLabel}</span>
            <span aria-hidden="true">·</span>
            <span>
              {t("currentAssets")} {ownCount}
            </span>
            {subtree ? (
              <>
                <span aria-hidden="true">·</span>
                {subtree}
              </>
            ) : null}
          </p>
        </div>
        <div className="hidden w-32 md:block">
          <Chip>{node.typeLabel}</Chip>
        </div>
        <div className="hidden w-36 flex-col items-end text-right md:flex">
          {ownCount}
          {subtree}
        </div>
        <LocationDeactivateButton
          endpoint={`/api/locations/${node.id}`}
          name={node.name}
          path={node.path}
          isActive
          counts={node.counts}
          addChildHref={node.addChildHref}
          menuLabel={tCommon("moreActionsFor", { code: node.code })}
          next={{ label: tCommon("edit"), href: node.editHref, icon: <Pencil aria-hidden="true" /> }}
        />
      </div>
      {hasChildren ? (
        <ul id={groupId} hidden={!open}>
          {node.children.map(renderChild)}
        </ul>
      ) : null}
    </li>
  )
}
