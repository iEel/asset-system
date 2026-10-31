// The photo that stands for an asset (group 3 spec §19.5, A1-R6), the register's rule: the newest active image of the
// asset's model (module "asset_model"), else the newest active image of the asset itself (module "asset"), else none.
// Server-safe and client-safe: no runtime import; the db is injected (the search passes its own, the tests fake it).

export type AssetPhotoPreview = { id: string; alt: string; fileType: string }

/** The one choice: the model's photo wins, the asset's own is the fallback. */
export function chooseAssetPhotoPreview(
  modelPhoto: AssetPhotoPreview | null | undefined,
  assetPhoto: AssetPhotoPreview | null | undefined,
): AssetPhotoPreview | null {
  return modelPhoto ?? assetPhoto ?? null
}

// Method syntax, so fakes may narrow args; a Prisma client is passed as `prisma as unknown as AssetPhotoPreviewDb`.
export type AssetPhotoPreviewDb = { attachment: { findMany(args: object): Promise<unknown[]> } }

type ImageRow = { id: string; originalName: string; fileType: string }
const imageWhere = { isActive: true, fileType: { startsWith: "image/" } } as const
const newestFirst = { uploadedAt: "desc" } as const

function firstPerKey<Row extends ImageRow>(rows: readonly Row[], key: (row: Row) => string | null) {
  const byKey = new Map<string, AssetPhotoPreview>()
  for (const row of rows) {
    const value = key(row)
    if (value && !byKey.has(value)) byKey.set(value, { id: row.id, alt: row.originalName, fileType: row.fileType })
  }
  return byKey
}

/**
 * Two sequential reads at most: the models' images, then the assets' own images only for the assets whose model has no
 * photo, so an asset whose model has one never reads its own (audit photos grow with every round, final review M3). An
 * asset with neither is absent from the map.
 */
export async function readAssetPhotoPreviews(
  db: AssetPhotoPreviewDb,
  assets: readonly { id: string; modelId: string | null }[],
): Promise<Map<string, AssetPhotoPreview>> {
  const photos = new Map<string, AssetPhotoPreview>()
  if (assets.length === 0) return photos
  const modelIds = [...new Set(assets.map((asset) => asset.modelId).filter((id): id is string => Boolean(id)))]
  const modelImages = modelIds.length
    ? (await db.attachment.findMany({
        where: { module: "asset_model", referenceId: { in: modelIds }, ...imageWhere },
        select: { id: true, referenceId: true, originalName: true, fileType: true },
        orderBy: newestFirst,
      })) as Array<ImageRow & { referenceId: string }>
    : []
  const byModel = firstPerKey(modelImages, (row) => row.referenceId)
  const modelPhoto = (asset: { modelId: string | null }) => (asset.modelId ? byModel.get(asset.modelId) : undefined)
  const assetIds = [...new Set(assets.filter((asset) => !modelPhoto(asset)).map((asset) => asset.id))]
  const assetImages = assetIds.length
    ? (await db.attachment.findMany({
        where: { module: "asset", assetId: { in: assetIds }, ...imageWhere },
        select: { id: true, assetId: true, originalName: true, fileType: true },
        orderBy: newestFirst,
      })) as Array<ImageRow & { assetId: string | null }>
    : []
  const byAsset = firstPerKey(assetImages, (row) => row.assetId)
  for (const asset of assets) {
    const photo = chooseAssetPhotoPreview(modelPhoto(asset), byAsset.get(asset.id))
    if (photo) photos.set(asset.id, photo)
  }
  return photos
}
