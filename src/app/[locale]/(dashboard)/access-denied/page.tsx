import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"

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
      <section className="w-full max-w-xl">
        <ActionEmptyState
          tone="permission"
          title={t("title")}
          description={t("description")}
          details={permission ? (
            <p className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
              {t("requestedPermission", { permission })}
            </p>
          ) : null}
          action={(
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <Link href={`/${locale}/dashboard`} className={buttonVariants({ size: "lg" })}>
                {t("backDashboard")}
              </Link>
              <Link href={`/${locale}/work-center`} className={buttonVariants({ variant: "outline", size: "lg" })}>
                {t("openWorkCenter")}
              </Link>
            </div>
          )}
        />
      </section>
    </div>
  )
}
