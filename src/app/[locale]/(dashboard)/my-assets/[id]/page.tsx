import Image from "next/image"
import Link from "next/link"
import type { Prisma } from "@prisma/client"
import { notFound } from "next/navigation"
import { ArrowLeft, Building2, CalendarClock, MapPin, PackageCheck, Tags } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { ContentPanel } from "@/components/ui/content-panel"
import { StatusPill } from "@/components/ui/status-pill"
import { getSafeActionLinkClasses } from "@/lib/design-system"
import { getSessionUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { buildMyAssetDetailWhere } from "@/lib/my-assets"
import { formatDateTime } from "@/lib/utils"

type MyAssetDetailPageProps = {
  params: Promise<{ id: string; locale: string }>
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
  status: { select: { nameTh: true, colorCode: true } },
  condition: { select: { nameTh: true, colorCode: true } },
  attachments: {
    where: { module: "asset", fileType: { startsWith: "image/" }, isActive: true },
    select: { id: true, originalName: true },
    orderBy: { uploadedAt: "desc" },
    take: 1,
  },
} satisfies Prisma.AssetSelect

export default async function MyAssetDetailPage({ params }: MyAssetDetailPageProps) {
  const { id, locale } = await params
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
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("detailTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("detailHelp")}</p>
        </div>
        <Link href={`/${locale}/my-assets`} className={getSafeActionLinkClasses("secondary")}>
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>
      </div>

      <ContentPanel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
            {photo ? (
              <Image
                src={`/api/attachments/${photo.id}?inline=1`}
                alt={photo.originalName}
                width={96}
                height={96}
                className="h-full w-full object-contain"
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
              <StatusPill label={asset.status.nameTh} color={asset.status.colorCode} />
              <StatusPill label={asset.condition.nameTh} color={asset.condition.colorCode} />
            </div>
          </div>
        </div>
      </ContentPanel>

      <ContentPanel title={t("detailTitle")}>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem icon={<Tags className="h-4 w-4" />} label={t("category")} value={`${asset.category.code} - ${asset.category.name}`} />
          <DetailItem icon={<PackageCheck className="h-4 w-4" />} label={t("serialNumber")} value={asset.serialNumber || "-"} />
          <DetailItem icon={<MapPin className="h-4 w-4" />} label={t("location")} value={location} />
          <DetailItem icon={<Building2 className="h-4 w-4" />} label={t("companyBranch")} value={companyBranch} />
          <DetailItem icon={<CalendarClock className="h-4 w-4" />} label={t("updatedAt")} value={formatDateTime(asset.updatedAt)} />
        </dl>
      </ContentPanel>
    </div>
  )
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="text-primary" aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-semibold text-foreground">{value}</dd>
    </div>
  )
}
