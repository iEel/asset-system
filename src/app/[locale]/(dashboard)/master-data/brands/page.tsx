import Link from "next/link"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { Edit, ImageIcon, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { BrandDeleteButton } from "@/components/master-data/brand-delete-button"
import { AssetModelDeleteButton } from "@/components/master-data/asset-model-delete-button"
import { summarizeModelSpecs } from "@/lib/model-specs"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
  MasterDataSearch,
} from "@/components/master-data/master-data-layout"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"

type BrandsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string }>
}

const previewableModelPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"])

export default async function BrandsPage({ params, searchParams }: BrandsPageProps) {
  const { locale } = await params
  const { search = "" } = await searchParams
  await requirePagePermission(locale, "brand", "view")

  const t = await getTranslations("brandModel")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()

  const [brands, models] = await Promise.all([
    prisma.assetBrand.findMany({
      where: {
        isActive: true,
        ...(searchText ? { name: { contains: searchText } } : {}),
      },
      include: { _count: { select: { models: true, assets: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.assetModel.findMany({
      where: {
        isActive: true,
        ...(searchText
          ? {
              OR: [
                { name: { contains: searchText } },
                { specs: { contains: searchText } },
                { brand: { name: { contains: searchText } } },
                { category: { code: { contains: searchText } } },
                { category: { name: { contains: searchText } } },
              ],
            }
          : {}),
      },
      include: {
        brand: { select: { name: true } },
        category: { select: { code: true, name: true } },
        _count: { select: { assets: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])
  const modelPhotos = models.length
    ? await prisma.attachment.findMany({
        where: {
          module: "asset_model",
          referenceId: { in: models.map((model) => model.id) },
          isActive: true,
          fileType: { startsWith: "image/" },
        },
        select: { id: true, referenceId: true, originalName: true, fileType: true },
        orderBy: { uploadedAt: "desc" },
      })
    : []
  const primaryPhotoByModelId = new Map<string, (typeof modelPhotos)[number]>()
  for (const photo of modelPhotos) {
    if (!primaryPhotoByModelId.has(photo.referenceId)) {
      primaryPhotoByModelId.set(photo.referenceId, photo)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <MasterDataHeader
          title={t("title")}
          subtitle={t("subtitle")}
          createHref={`/${locale}/master-data/brands/new`}
          createLabel={t("createBrand")}
        />

        <MasterDataSearch
          action={`/${locale}/master-data/brands`}
          defaultValue={searchText}
          placeholder={tCommon("search")}
          submitLabel={tCommon("search")}
        />

        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <ColumnHeader>{t("brandName")}</ColumnHeader>
                  <ColumnHeader>{t("models")}</ColumnHeader>
                  <ColumnHeader>{t("assets")}</ColumnHeader>
                  <ColumnHeader>{tCommon("status")}</ColumnHeader>
                  <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {brands.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-32 px-4 text-center text-muted-foreground">
                      {tCommon("noData")}
                    </td>
                  </tr>
                ) : (
                  brands.map((brand) => (
                    <ClickableTableRow
                      key={brand.id}
                      href={`/${locale}/master-data/brands/${brand.id}/edit`}
                      label={`${tCommon("edit")}: ${brand.name}`}
                    >
                      <td className="min-w-56 px-4 py-3 font-medium text-foreground">{brand.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{brand._count.models}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{brand._count.assets}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ActiveBadge label={tCommon("active")} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/${locale}/master-data/brands/${brand.id}/edit`}
                            title={tCommon("edit")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <BrandDeleteButton id={brand.id} />
                        </div>
                      </td>
                    </ClickableTableRow>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{t("modelsTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("modelsSubtitle")}</p>
          </div>
          <Link
            href={`/${locale}/master-data/brands/models/new`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t("createModel")}
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <ColumnHeader>{t("modelName")}</ColumnHeader>
                  <ColumnHeader>{t("brand")}</ColumnHeader>
                  <ColumnHeader>{t("category")}</ColumnHeader>
                  <ColumnHeader>{t("specs")}</ColumnHeader>
                  <ColumnHeader>{t("assets")}</ColumnHeader>
                  <ColumnHeader>{tCommon("status")}</ColumnHeader>
                  <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {models.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="h-32 px-4 text-center text-muted-foreground">
                      {tCommon("noData")}
                    </td>
                  </tr>
                ) : (
                  models.map((model) => {
                    const photo = primaryPhotoByModelId.get(model.id)
                    const canPreviewPhoto = photo ? previewableModelPhotoTypes.has(photo.fileType) : false

                    return (
                      <ClickableTableRow
                        key={model.id}
                        href={`/${locale}/master-data/brands/models/${model.id}/edit`}
                        label={`${tCommon("edit")}: ${model.name}`}
                      >
                        <td className="min-w-64 px-4 py-3 font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground">
                              {photo && canPreviewPhoto ? (
                                <Image
                                  src={`/api/attachments/${photo.id}?inline=1`}
                                  alt=""
                                  fill
                                  unoptimized
                                  className="object-contain p-1"
                                  sizes="48px"
                                />
                              ) : (
                                <ImageIcon className="h-5 w-5" aria-hidden="true" />
                              )}
                            </div>
                            <span className="min-w-0 truncate">{model.name}</span>
                          </div>
                        </td>
                        <td className="min-w-40 px-4 py-3 text-muted-foreground">{model.brand.name}</td>
                        <td className="min-w-48 px-4 py-3 text-muted-foreground">
                          {model.category.code} - {model.category.name}
                        </td>
                        <td className="min-w-64 max-w-xl px-4 py-3 text-muted-foreground">
                          <span className="line-clamp-2">{summarizeModelSpecs(model.specs) || "-"}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{model._count.assets}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <ActiveBadge label={tCommon("active")} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Link
                              href={`/${locale}/master-data/brands/models/${model.id}/edit`}
                              title={tCommon("edit")}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                            <AssetModelDeleteButton id={model.id} />
                          </div>
                        </td>
                      </ClickableTableRow>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
