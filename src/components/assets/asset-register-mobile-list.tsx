"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { AssetRegisterRowActions, type AssetRegisterRowPermissions } from "@/components/assets/asset-register-row-actions"
import type { AssetRegisterRow } from "@/components/assets/asset-register-table"
import { checkboxVariants } from "@/components/ui/field-variants"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone } from "@/lib/design-system"
import { needsConditionAttention } from "@/lib/asset-register-row-rules"
import { cn } from "@/lib/utils"

type MobileListProps = {
  assets: AssetRegisterRow[]
  selectMode: boolean
  selectedIds: ReadonlySet<string>
  onToggleAsset: (id: string) => void
  permissions: AssetRegisterRowPermissions
  detailHref: (id: string) => string
  editHref: (id: string) => string
  cloneHref: (id: string) => string
  onNavigate: () => void
  reserveBulkBarSpace: boolean
  // The range line above the table already says the count, so the list says none above the cards (final review C1).
  // On the last page the list has reached its end, so the end line says every row is shown.
  isLastPage: boolean
  total: number
}

type RowProps = Pick<MobileListProps, "permissions" | "detailHref" | "editHref" | "cloneHref" | "onNavigate">

export function AssetRegisterMobileList({
  assets,
  selectMode,
  selectedIds,
  onToggleAsset,
  reserveBulkBarSpace,
  isLastPage,
  total,
  ...rowProps
}: MobileListProps) {
  const t = useTranslations("asset")
  return (
    <div className={cn("md:hidden", reserveBulkBarSpace && "pb-44")}>
      <ul data-asset-mobile-list className="divide-y divide-border-soft">
        {assets.map((asset) =>
          selectMode ? (
            <MobileSelectableRow key={asset.id} asset={asset} checked={selectedIds.has(asset.id)} onToggle={() => onToggleAsset(asset.id)} />
          ) : (
            <MobileAssetRow key={asset.id} asset={asset} {...rowProps} />
          ),
        )}
      </ul>
      {isLastPage ? <p data-asset-mobile-end className="num px-3 py-3 text-center text-meta text-muted-foreground">{t("registerMobileEnd", { total })}</p> : null}
    </div>
  )
}

function MobileAssetRow({ asset, permissions, detailHref, editHref, cloneHref, onNavigate }: RowProps & { asset: AssetRegisterRow }) {
  const t = useTranslations("asset")
  return (
    <li data-asset-mobile-row className="relative flex min-h-20 items-center gap-3 px-3 py-2 transition-colors hover:bg-row-hover">
      <AssetThumbnail photo={asset.photo} assetTag={asset.assetTag} assetName={asset.name} size={44} className="relative z-10" />
      <div className="min-w-0 flex-1">
        <Link
          href={detailHref(asset.id)}
          onClick={onNavigate}
          title={asset.name}
          className="line-clamp-2 text-sm font-semibold text-foreground before:absolute before:inset-0 before:content-[''] focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-inset focus-visible:before:ring-ring"
        >
          {asset.name}
        </Link>
        <div className="mt-0.5 flex min-w-0 flex-nowrap items-center gap-2 text-xs leading-5">
          <span className="tag min-w-0 truncate">{asset.assetTag}</span>
          <StatusBadge label={asset.status.label} tone={getAssetStateTone(asset.status.value)} className="shrink-0" />
          {needsConditionAttention(asset.condition.value) ? (
            <StatusBadge label={asset.condition.label} tone={getAssetStateTone(asset.condition.value)} className="shrink-0" />
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[
            asset.holder.kind === "holder" ? asset.holder.name : asset.holder.kind === "shared" ? t("holderSharedShort") : t("noCustodian"),
            asset.location.name,
          ].join(" · ")}
        </p>
      </div>
      <AssetRegisterRowActions
        variant="mobile"
        className="relative z-10"
        assetId={asset.id}
        assetTag={asset.assetTag}
        assetName={asset.name}
        actions={asset.actions}
        editHref={editHref(asset.id)}
        cloneHref={cloneHref(asset.id)}
        permissions={permissions}
        onNavigate={onNavigate}
      />
    </li>
  )
}

function MobileSelectableRow({ asset, checked, onToggle }: { asset: AssetRegisterRow; checked: boolean; onToggle: () => void }) {
  return (
    <li data-asset-mobile-row>
      <label className="flex min-h-20 cursor-pointer items-center gap-3 px-3 py-2.5 has-checked:bg-primary-soft">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={asset.assetTag}
          className={checkboxVariants({ size: "lg" })}
        />
        <AssetThumbnail photo={asset.photo} assetTag={asset.assetTag} assetName={asset.name} size={44} preview={false} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{asset.name}</span>
          <span className="block truncate text-xs text-muted-foreground"><span className="tag">{asset.assetTag}</span></span>
          <span className="block truncate text-xs text-muted-foreground">{asset.location.name}</span>
        </span>
      </label>
    </li>
  )
}
