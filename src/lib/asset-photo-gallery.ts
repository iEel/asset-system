export const assetPhotoGalleryPreviewLimit = 6

export function getAssetPhotoGalleryState<T>(items: readonly T[], expanded: boolean, previewLimit = assetPhotoGalleryPreviewLimit) {
  const safePreviewLimit = Math.max(0, previewLimit)
  const hasOverflow = items.length > safePreviewLimit
  const visibleItems = expanded || !hasOverflow ? [...items] : items.slice(0, safePreviewLimit)

  return {
    visibleItems,
    hiddenCount: expanded ? 0 : Math.max(0, items.length - visibleItems.length),
    hasOverflow,
  }
}
