"use client"

import Link from "next/link"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { AssetRegisterRowActions, type AssetRegisterRowPermissions } from "@/components/assets/asset-register-row-actions"
import type { AssetRegisterRow } from "@/components/assets/asset-register-table"
import { checkboxVariants } from "@/components/ui/field-variants"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone, normalizeAssetStateValue } from "@/lib/design-system"
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
}

type RowProps = Pick<MobileListProps, "permissions" | "detailHref" | "editHref" | "cloneHref" | "onNavigate">

export function AssetRegisterMobileList({
  assets,
  selectMode,
  selectedIds,
  onToggleAsset,
  reserveBulkBarSpace,
  ...rowProps
}: MobileListProps) {
  return (
    <ul data-asset-mobile-list className={cn("divide-y divide-border-soft md:hidden", reserveBulkBarSpace && "pb-44")}>
      {assets.map((asset) =>
        selectMode ? (
          <MobileSelectableRow key={asset.id} asset={asset} checked={selectedIds.has(asset.id)} onToggle={() => onToggleAsset(asset.id)} />
        ) : (
          <MobileAssetRow key={asset.id} asset={asset} {...rowProps} />
        ),
      )}
    </ul>
  )
}

function MobileAssetRow({ asset, permissions, detailHref, editHref, cloneHref, onNavigate }: RowProps & { asset: AssetRegisterRow }) {
  return (
    <li data-asset-mobile-row className="relative flex min-h-20 items-center gap-3 px-3 py-2 transition-colors hover:bg-row-hover">
      <AssetThumbnail photo={asset.photo} assetTag={asset.assetTag} assetName={asset.name} size={44} className="relative z-10" />
      <div className="min-w-0 flex-1">
        <Link
          href={detailHref(asset.id)}
          onClick={onNavigate}
          className="block truncate text-sm font-semibold text-foreground before:absolute before:inset-0 before:content-[''] focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-inset focus-visible:before:ring-ring"
        >
          <span className="tag font-medium">{asset.assetTag}</span>
        </Link>
        <p className="truncate text-sm text-foreground">{asset.name}</p>
        <div className="mt-0.5 flex min-w-0 flex-nowrap items-center gap-2 text-xs leading-5">
          <span className="min-w-0 truncate text-muted-foreground">{asset.currentLocation}</span>
          <StatusBadge label={asset.status.label} tone={getAssetStateTone(asset.status.value)} className="shrink-0" />
          {needsFieldAttention(asset) ? (
            <>
              <StatusBadge label={asset.condition.label} tone={getAssetStateTone(asset.condition.value)} className="shrink-0" />
              {asset.ownershipType.value === "shared" ? (
                <StatusBadge label={asset.ownershipType.label} tone="success" className="shrink-0" />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      <AssetRegisterRowActions
        variant="mobile"
        className="relative z-10"
        assetId={asset.id}
        assetTag={asset.assetTag}
        assetName={asset.name}
        transactions={asset.transactions}
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
          <span className="block truncate text-sm text-foreground"><span className="tag font-medium">{asset.assetTag}</span></span>
          <span className="block truncate text-sm text-foreground">{asset.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{asset.currentLocation}</span>
        </span>
      </label>
    </li>
  )
}

function needsFieldAttention(asset: AssetRegisterRow) {
  return ["fair", "poor", "damaged", "non functional", "salvage"].includes(normalizeAssetStateValue(asset.condition.value)) || asset.ownershipType.value === "shared"
}
