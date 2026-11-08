import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { HistoryBackButton } from "@/components/ui/history-back-button"
import { Notice } from "@/components/ui/notice"
import { APPROVAL_PERMISSION, formatDeniedRoleNames, permissionWordKeys, sanitizeDeniedFrom } from "@/lib/access-denied"
import { getSessionUser, hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { getDefaultHomeHref } from "@/lib/default-home"
import { getLoginDestinationKey } from "@/lib/login-page"

type AccessDeniedPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    module?: string
    action?: string
    from?: string
  }>
}

// Page group 12 §9 (board AD-Denied): the blocked page by its menu name, the permission in Thai words, the viewer's
// active roles, a reassurance, and the buttons home, back and (with dashboard:view) the work center.
export default async function AccessDeniedPage({ params, searchParams }: AccessDeniedPageProps) {
  const { locale } = await params
  const { module, action, from } = await searchParams
  const [t, tAll, tNav, tRoles] = await Promise.all([
    getTranslations("accessDeniedPage"),
    getTranslations(),
    getTranslations("nav"),
    getTranslations("adminRolesPage"),
  ])
  const permission = [module, action].filter(Boolean).join(":")
  // C2: the main button goes to the person's own home page, and the work center is offered only to people who can open it.
  const user = await getSessionUser()
  const homeHref = user ? getDefaultHomeHref(locale, user) : `/${locale}/dashboard`
  const canOpenWorkCenter = user ? hasPermission(user, "dashboard", "view") : false
  const homeName = homeHref.endsWith("/my-assets") ? tNav("myAssets") : tNav("dashboard")

  // `from` only names the page, from the login page's fixed route table; it is never a link.
  const safeFrom = sanitizeDeniedFrom(locale, from)
  const pageKey = safeFrom ? getLoginDestinationKey(locale, safeFrom) : null
  const pageName = pageKey && pageKey !== "auth.destinationFallback" && tAll.has(pageKey) ? tAll(pageKey) : null

  const words = module && action ? permissionWordKeys(module, action) : null
  const permissionLabel = module === APPROVAL_PERMISSION
    ? t("approvalWords")
    : words?.action && words.module
      ? t("permissionWords", { action: tRoles(words.action), module: tRoles(words.module) })
      : permission

  const roleRecord = user
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: { userRoles: { select: { role: { select: { displayName: true, displayNameTh: true, isActive: true } } } } },
      })
    : null
  const roleNames = formatDeniedRoleNames(roleRecord?.userRoles.map((userRole) => userRole.role) ?? [], locale)

  return (
    <div className="flex min-h-[calc(100dvh_-_var(--shell-top)_-_4rem)] items-center justify-center">
      <section className="w-full max-w-xl">
        <ActionEmptyState
          tone="permission"
          title={pageName ? t("titleNamed", { page: pageName }) : t("titleUnnamed")}
          description={t("reassure")}
          details={(
            <div className="flex flex-col items-center gap-1.5">
              {permission ? (
                // D7: what the user needs before acting is a neutral Notice, centred under the description.
                <Notice tone="neutral" className="justify-center">
                  {t("needs", { permission: permissionLabel })}
                </Notice>
              ) : null}
              {user ? (
                <p className="text-sm text-muted-foreground text-pretty">
                  {roleNames ? t("yourRoles", { roles: roleNames }) : t("noRoles")}
                </p>
              ) : null}
            </div>
          )}
          action={(
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-col justify-center gap-2 sm:flex-row">
                <Link href={homeHref} className={buttonVariants({ size: "md" })}>
                  {t("backHome")}
                </Link>
                <HistoryBackButton fallbackHref={homeHref}>{t("goBack")}</HistoryBackButton>
                {canOpenWorkCenter ? (
                  <Link href={`/${locale}/work-center`} className={buttonVariants({ variant: "outline", size: "md" })}>
                    {t("openWorkCenter")}
                  </Link>
                ) : null}
              </div>
              <p className="text-meta text-muted-foreground">{t("yourHome", { home: homeName })}</p>
            </div>
          )}
        />
      </section>
    </div>
  )
}
