import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import { getTranslations } from "next-intl/server"

type AccessDeniedPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    module?: string
    action?: string
  }>
}

export default async function AccessDeniedPage({ params, searchParams }: AccessDeniedPageProps) {
  const { locale } = await params
  const { module, action } = await searchParams
  const t = await getTranslations("accessDeniedPage")
  const permission = [module, action].filter(Boolean).join(":")

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
      <section className="w-full max-w-xl rounded-md border border-border bg-surface px-6 py-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("description")}</p>
        {permission ? (
          <p className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
            {t("requestedPermission", { permission })}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href={`/${locale}/dashboard`}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t("backDashboard")}
          </Link>
          <Link
            href={`/${locale}/work-center`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t("openWorkCenter")}
          </Link>
        </div>
      </section>
    </div>
  )
}
