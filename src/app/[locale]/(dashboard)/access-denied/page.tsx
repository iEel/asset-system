import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { Notice } from "@/components/ui/notice"

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
            // D7: what the user needs before acting is a neutral Notice, centred under the description.
            <Notice tone="neutral" className="justify-center">
              {t("requestedPermission", { permission })}
            </Notice>
          ) : null}
          action={(
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <Link href={`/${locale}/dashboard`} className={buttonVariants({ size: "md" })}>
                {t("backDashboard")}
              </Link>
              <Link href={`/${locale}/work-center`} className={buttonVariants({ variant: "outline", size: "md" })}>
                {t("openWorkCenter")}
              </Link>
            </div>
          )}
        />
      </section>
    </div>
  )
}
