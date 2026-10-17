import Image from "next/image"
import type { Prisma } from "@prisma/client"
import { notFound } from "next/navigation"
import { PackageCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { ContentPanel } from "@/components/ui/content-panel"
import { KeyValueList } from "@/components/ui/key-value-list"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone } from "@/lib/design-system"
import { getSessionUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { buildMyAssetDetailWhere } from "@/lib/my-assets"
import { normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { formatDateTime } from "@/lib/utils"

type MyAssetDetailPageProps = {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

const myAssetDetailSelect = {
  id: true,
  assetTag: true,
  name: true,
  serialNumber: true,
  updatedAt: true,
  category: { select: { code: true, name: true } },
  company: { select: { code: true } },
  branch: { select: { code: true } },
  currentLocation: { select: { code: true, name: true } },
  status: { select: { name: true, nameTh: true, colorCode: true } },
  condition: { select: { name: true, nameTh: true, colorCode: true } },
  attachments: {
    where: { module: "asset", fileType: { startsWith: "image/" }, isActive: true },
    select: { id: true, originalName: true },
    orderBy: { uploadedAt: "desc" },
    take: 1,
  },
} satisfies Prisma.AssetSelect

export default async function MyAssetDetailPage({ params, searchParams }: MyAssetDetailPageProps) {
  const { id, locale } = await params
  const rawSearchParams = await searchParams
  // Back to the page of My Assets the person came from (spec 2B §5.9.2 row 9, 2D M32 c).
  const returnToHref = normalizeOperationalReturnTo(locale, "my-assets", rawSearchParams.returnTo)
  const user = await getSessionUser()
  if (!user?.employeeId) notFound()

  const t = await getTranslations("myAssets")
  const asset = await prisma.asset.findFirst({
    where: buildMyAssetDetailWhere({ employeeId: user.employeeId, assetId: id }),
    select: myAssetDetailSelect,
  })
  if (!asset) notFound()

  const photo = asset.attachments[0]
  const location = `${asset.currentLocation.code} - ${asset.currentLocation.name}`
  const companyBranch = `${asset.company.code} / ${asset.branch.code}`

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("detailTitle")}
        meta={t("detailHelp")}
        back={<PageBackLink href={returnToHref} label={t("backToList")} />}
      />

      <ContentPanel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
            {photo ? (
              <Image
                src={`/api/attachments/${photo.id}?inline=1`}
                alt={photo.originalName}
                width={96}
                height={96}
                className="h-full w-full object-contain bg-image-stage"
                unoptimized
              />
            ) : (
              <PackageCheck className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-muted-foreground">{t("assetTag")}</div>
            <h2 className="mt-1 break-words text-xl font-semibold text-foreground">{asset.assetTag}</h2>
            <p className="mt-1 break-words text-sm text-foreground">{asset.name}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge label={asset.status.nameTh} tone={getAssetStateTone(asset.status.name)} />
              <StatusBadge label={asset.condition.nameTh} tone={getAssetStateTone(asset.condition.name)} />
            </div>
          </div>
        </div>
      </ContentPanel>

      <ContentPanel title={t("detailTitle")}>
        <KeyValueList
          items={[
            { key: "category", label: t("category"), value: <><span className="tag">{asset.category.code}</span> - {asset.category.name}</> },
            { key: "serialNumber", label: t("serialNumber"), value: asset.serialNumber ? <span className="tag">{asset.serialNumber}</span> : null },
            { key: "location", label: t("location"), value: location },
            { key: "companyBranch", label: t("companyBranch"), value: companyBranch },
            { key: "updatedAt", label: t("updatedAt"), value: formatDateTime(asset.updatedAt) },
          ]}
        />
      </ContentPanel>
    </div>
  )
}
