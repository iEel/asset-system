import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { Notice } from "@/components/ui/notice"
import { getSessionUser, hasPermission } from "@/lib/auth-utils"
import { getDefaultHomeHref } from "@/lib/default-home"

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
  // C2: the main button goes to the person's own home page, and the work center is offered only to people who can open it.
  const user = await getSessionUser()
  const homeHref = user ? getDefaultHomeHref(locale, user) : `/${locale}/dashboard`
  const canOpenWorkCenter = user ? hasPermission(user, "dashboard", "view") : false

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
              <Link href={homeHref} className={buttonVariants({ size: "md" })}>
                {t("backHome")}
              </Link>
              {canOpenWorkCenter ? (
                <Link href={`/${locale}/work-center`} className={buttonVariants({ variant: "outline", size: "md" })}>
                  {t("openWorkCenter")}
                </Link>
              ) : null}
            </div>
          )}
        />
      </section>
    </div>
  )
}
