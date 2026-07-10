import Image from "next/image"
import Link from "next/link"
import type React from "react"
import type { Prisma } from "@prisma/client"
import { PackageCheck, ShieldAlert } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { ContentPanel } from "@/components/ui/content-panel"
import { getDesktopTableOnlyClasses, getEmptyStateClasses, getMobileCardListClasses, getResponsiveTableScrollClasses, getSafeActionLinkClasses } from "@/lib/design-system"
import { getSessionUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { buildMyAssetsWhere, summarizeMyAssets } from "@/lib/my-assets"
import { formatDateTime } from "@/lib/utils"

type MyAssetsPageProps = {
  params: Promise<{ locale: string }>
}

const myAssetSelect = {
  id: true,
  assetTag: true,
  name: true,
  serialNumber: true,
  updatedAt: true,
  custodianId: true,
  category: { select: { code: true, name: true } },
  company: { select: { code: true } },
  branch: { select: { code: true } },
  currentLocation: { select: { code: true, name: true } },
  status: { select: { name: true, nameTh: true, colorCode: true } },
  condition: { select: { nameTh: true, colorCode: true } },
  attachments: {
    where: { module: "asset", fileType: { startsWith: "image/" }, isActive: true },
    select: { id: true, originalName: true },
    orderBy: { uploadedAt: "desc" },
    take: 1,
  },
} satisfies Prisma.AssetSelect

type MyAssetRow = Prisma.AssetGetPayload<{ select: typeof myAssetSelect }>

export default async function MyAssetsPage({ params }: MyAssetsPageProps) {
  const { locale } = await params
  const user = await getSessionUser()
  const t = await getTranslations("myAssets")

  if (!user?.employeeId) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <ContentPanel>
          <div className={getEmptyStateClasses()}>
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-warning" />
            <div className="font-medium text-foreground">{t("noLinkedEmployeeTitle")}</div>
            <p className="mt-1">{t("noLinkedEmployeeHelp")}</p>
          </div>
        </ContentPanel>
      </div>
    )
  }

  const assets = await prisma.asset.findMany({
    // buildMyAssetsWhere scopes to custodianId server-side.
    where: buildMyAssetsWhere({ employeeId: user.employeeId }),
    select: myAssetSelect,
    orderBy: [{ status: { sortOrder: "asc" } }, { updatedAt: "desc" }],
  })
  const labels = {
    asset: t("asset"),
    serialNumber: t("serialNumber"),
    status: t("status"),
    condition: t("condition"),
    location: t("location"),
    companyBranch: t("companyBranch"),
    category: t("category"),
    updatedAt: t("updatedAt"),
    openDetail: t("openDetail"),
  }
  const summary = summarizeMyAssets(
    assets.map((asset) => ({
      statusName: asset.status.name,
      hasPhoto: asset.attachments.length > 0,
    })),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <Link href={`/${locale}/work-center?view=mine`} className={getSafeActionLinkClasses("secondary")}>
          {t("openWorkCenter")}
        </Link>
      </div>

      <section aria-label={t("summary")} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={t("total")} value={summary.total} tone="neutral" />
        <Metric label={t("ready")} value={summary.ready} tone="success" />
        <Metric label={t("needsAttention")} value={summary.needsAttention} tone="warning" />
        <Metric label={t("missingPhoto")} value={summary.missingPhoto} tone="muted" />
      </section>

      <ContentPanel title={t("list")}>
        {assets.length === 0 ? (
          <div className={getEmptyStateClasses()}>
            <PackageCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <div className="font-medium text-foreground">{t("emptyTitle")}</div>
            <p className="mt-1">{t("emptyHelp")}</p>
          </div>
        ) : (
          <>
            <div className={getMobileCardListClasses()}>
              {assets.map((asset) => (
                <MobileAssetCard key={asset.id} labels={labels} asset={asset} href={buildMyAssetDetailHref(locale, asset.id)} />
              ))}
            </div>
            <div className={getDesktopTableOnlyClasses()}>
              <div className={getResponsiveTableScrollClasses()}>
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <Head>{labels.asset}</Head>
                      <Head>{labels.serialNumber}</Head>
                      <Head>{labels.status}</Head>
                      <Head>{labels.condition}</Head>
                      <Head>{labels.location}</Head>
                      <Head>{labels.companyBranch}</Head>
                      <Head>{labels.updatedAt}</Head>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-accent/40">
                        <td className="px-4 py-3">
                          <AssetIdentity asset={asset} href={buildMyAssetDetailHref(locale, asset.id)} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.serialNumber || "-"}</td>
                        <td className="px-4 py-3">
                          <StatusPill label={asset.status.nameTh} color={asset.status.colorCode} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill label={asset.condition.nameTh} color={asset.condition.colorCode} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {asset.currentLocation.code} - {asset.currentLocation.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {asset.company.code} / {asset.branch.code}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(asset.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </ContentPanel>
    </div>
  )
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </header>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "neutral" | "success" | "warning" | "muted" }) {
  const toneClass = {
    neutral: "border-border bg-surface",
    success: "border-success/30 bg-success/5",
    warning: "border-warning/30 bg-warning/5",
    muted: "border-border bg-muted/40",
  }[tone]

  return (
    <div className={`rounded-lg border px-4 py-3 shadow-sm ${toneClass}`}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{value.toLocaleString("th-TH")}</div>
    </div>
  )
}

function Head({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</th>
}

function StatusPill({ label, color }: { label: string; color: string | null }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{
        borderColor: color ?? "var(--border)",
        color: color ?? "var(--foreground)",
        backgroundColor: color ? `${color}12` : "var(--muted)",
      }}
    >
      {label}
    </span>
  )
}

function AssetIdentity({ asset, href }: { asset: MyAssetRow; href?: string }) {
  const photo = asset.attachments[0]
  const content = (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
        {photo ? (
          <Image
            src={`/api/attachments/${photo.id}?inline=1`}
            alt={photo.originalName}
            width={48}
            height={48}
            className="h-full w-full object-contain"
            unoptimized
          />
        ) : (
          <PackageCheck className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-foreground">{asset.assetTag}</div>
        <div className="truncate text-sm text-foreground">{asset.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {asset.category.code} - {asset.category.name}
        </div>
      </div>
    </div>
  )

  if (!href) return content
  return (
    <Link href={href} className="block rounded-md outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary">
      {content}
    </Link>
  )
}

function MobileAssetCard({ labels, asset, href }: { labels: Record<string, string>; asset: MyAssetRow; href: string }) {
  return (
    <article className="rounded-md border border-border bg-surface p-4 shadow-sm">
      <AssetIdentity asset={asset} href={href} />
      <div className="mt-3 grid gap-2 text-sm">
        <MobileField label={labels.serialNumber} value={asset.serialNumber || "-"} />
        <MobileField label={labels.category} value={`${asset.category.code} - ${asset.category.name}`} />
        <MobileField label={labels.location} value={`${asset.currentLocation.code} - ${asset.currentLocation.name}`} />
        <MobileField label={labels.companyBranch} value={`${asset.company.code} / ${asset.branch.code}`} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{labels.status}</span>
          <StatusPill label={asset.status.nameTh} color={asset.status.colorCode} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{labels.condition}</span>
          <StatusPill label={asset.condition.nameTh} color={asset.condition.colorCode} />
        </div>
        <MobileField label={labels.updatedAt} value={formatDateTime(asset.updatedAt)} />
      </div>
      <Link href={href} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent">
        {labels.openDetail}
      </Link>
    </article>
  )
}

function buildMyAssetDetailHref(locale: string, assetId: string) {
  return `/${locale}/my-assets/${encodeURIComponent(assetId)}`
}

function MobileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-foreground">{value}</span>
    </div>
  )
}
