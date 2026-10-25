import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ArrowRight, Check, Package } from "lucide-react"
import { LoginForm } from "@/components/auth/login-form"
import { Notice } from "@/components/ui/notice"
import { getSessionUser } from "@/lib/auth-utils"
import { getLoginCompanyName } from "@/lib/login-company-name"
import {
  LOGIN_LANGUAGES,
  buildLoginLocaleHref,
  formatLoginYear,
  getLoginDestinationKey,
  isTestSystem,
} from "@/lib/login-page"
import { isSessionExpiredLogin, normalizeLoginCallbackUrl } from "@/lib/login-redirect"

type LoginSearchParams = {
  callbackUrl?: string | string[]
  reason?: string | string[]
  error?: string | string[]
}

type LoginPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<LoginSearchParams>
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const [{ locale }, query, tAuth, tNav, t, company] = await Promise.all([
    params,
    searchParams,
    getTranslations("auth"),
    getTranslations("nav"),
    getTranslations(),
    getLoginCompanyName(),
  ])
  const allowedOrigins = [process.env.AUTH_URL, process.env.NEXTAUTH_URL].filter(
    (origin): origin is string => Boolean(origin)
  )
  const callbackUrl = normalizeLoginCallbackUrl(locale, query.callbackUrl, allowedOrigins)
  const sessionExpired = isSessionExpiredLogin(query.reason, query.error)

  // After a session expiry the login stays even when the server still accepts the cookie (no redirect loop).
  const user = await getSessionUser()
  if (user && !sessionExpired) redirect(callbackUrl)

  const testSystem = isTestSystem()
  const destinationKey = getLoginDestinationKey(locale, callbackUrl)
  const year = formatLoginYear(locale)
  const copyright = company ? tAuth("copyrightCompany", { year, company }) : tAuth("copyright", { year })

  return (
    <div className="login-backdrop relative flex min-h-dvh flex-col overflow-hidden text-sidebar-foreground">
      <div aria-hidden="true" className="login-glow pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="login-pattern pointer-events-none absolute inset-0" />

      <header className="relative z-10 flex min-h-16 items-center gap-3 px-4 pt-[env(safe-area-inset-top)] lg:min-h-[76px] lg:px-14">
        <Image
          src="/icon.png"
          alt=""
          aria-hidden="true"
          width={38}
          height={38}
          priority
          className="h-[34px] w-[34px] rounded-[10px] ring-1 ring-app-icon-frame lg:h-[38px] lg:w-[38px]"
        />
        <div className="min-w-0 leading-snug">
          <p className="truncate text-sm font-semibold lg:text-[15px]">{tNav("brandName")}</p>
          {company ? <p className="truncate text-xs text-sidebar-muted">{company}</p> : null}
        </div>
        {testSystem ? (
          <span className="ml-2 hidden shrink-0 items-center gap-1.5 rounded-full border border-sidebar-dot px-2.5 py-0.5 text-xs font-semibold lg:inline-flex">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-sidebar-dot" />
            {tAuth("testSystem")}
          </span>
        ) : null}
        <nav
          aria-label={tAuth("languageSwitch")}
          className="login-glass ml-auto flex shrink-0 rounded-[10px] p-0.5 text-meta md:p-[3px]"
        >
          {LOGIN_LANGUAGES.map((language) =>
            language.locale === locale ? (
              <span
                key={language.locale}
                aria-current="true"
                lang={language.locale}
                className="flex min-h-11 items-center rounded-[7px] bg-surface px-3 font-semibold text-foreground md:min-h-8 md:px-3.5"
              >
                {language.label}
              </span>
            ) : (
              <Link
                key={language.locale}
                href={buildLoginLocaleHref(locale, language.locale, callbackUrl, sessionExpired)}
                lang={language.locale}
                hrefLang={language.locale}
                className="flex min-h-11 items-center rounded-[7px] px-3 text-sidebar-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring md:min-h-8 md:px-3.5"
              >
                {language.label}
              </Link>
            )
          )}
        </nav>
      </header>

      <main className="relative z-10 flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:pb-8 lg:pl-24 lg:pr-14 lg:pt-6">
        <section aria-label={tAuth("heroLabel")} className="flex flex-col items-start gap-3.5 px-5 pb-6 pt-4 lg:max-w-[560px] lg:gap-0 lg:p-0">
          {testSystem ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sidebar-dot px-2.5 py-0.5 text-xs font-semibold lg:hidden">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-sidebar-dot" />
              {tAuth("testSystem")}
            </span>
          ) : null}
          <p className="text-[27px] font-semibold leading-[1.35] lg:text-[44px] lg:leading-[1.3]">
            {tAuth("heroTaglineLead")}
            <br />
            <span className="text-sidebar-active-icon">{tAuth("heroTaglineRest")}</span>
          </p>
          <p className="hidden max-w-[470px] text-[17px] leading-[1.7] lg:mt-[18px] lg:block">{tAuth("heroBody")}</p>
          <div aria-hidden="true" className="relative mt-10 hidden h-[196px] w-full lg:block">
            <div className="login-glass absolute left-0 top-0 flex w-[300px] items-center gap-3 rounded-[14px] px-4 py-3.5">
              <span className="login-glass flex size-9 shrink-0 items-center justify-center rounded-[10px]">
                <Check className="size-[18px] text-sidebar-active-icon" strokeWidth={2.2} />
              </span>
              <span className="text-meta leading-[1.45]">
                <span className="block text-sm font-semibold">{tAuth("heroHandoverTitle")}</span>
                <span>{tAuth("heroHandoverDetail")}</span>
              </span>
            </div>
            <div className="login-glass absolute left-[140px] top-[74px] w-[290px] rounded-[14px] px-4 py-3.5">
              <p className="text-meta font-semibold">{tAuth("heroAuditTitle")}</p>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-[3px] bg-sidebar-foreground/15">
                <div className="h-full w-2/3 rounded-[3px] bg-sidebar-active-icon" />
              </div>
              <p className="mt-2 text-xs">{tAuth("heroAuditDetail")}</p>
            </div>
            <div className="login-glass absolute left-10 top-[152px] flex w-max max-w-[340px] items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-meta">
              <Package className="size-4 shrink-0 text-sidebar-active-icon" />
              {tAuth("heroRegister")}
            </div>
          </div>
        </section>

        <div className="flex flex-1 flex-col lg:flex-none lg:items-center">
          <div className="flex flex-1 flex-col overflow-hidden rounded-t-[22px] border border-x-0 border-b-0 border-border bg-surface text-foreground lg:w-full lg:max-w-[448px] lg:flex-none lg:rounded-[18px] lg:border-x lg:border-b">
            <div aria-hidden="true" className="login-card-accent" />
            <div className="px-5 pb-5 pt-6 lg:px-10 lg:pb-8 lg:pt-9">
              <h1 className="text-2xl font-semibold text-foreground">{tAuth("login")}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{tAuth("directoryLoginHint")}</p>
              <div className="mt-5 space-y-4">
                {sessionExpired ? (
                  <Notice tone="info" role="status" aria-live="polite">
                    {tAuth("sessionExpired")}
                  </Notice>
                ) : null}
                {destinationKey ? (
                  <p className="flex items-center gap-2.5 rounded-lg bg-primary-soft px-3 py-2.5 text-meta text-foreground">
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-primary" />
                    <span>
                      {tAuth.rich("destination", {
                        page: t(destinationKey),
                        strong: (chunks) => <strong className="font-semibold">{chunks}</strong>,
                      })}
                    </span>
                  </p>
                ) : null}
                <LoginForm callbackUrl={callbackUrl} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 flex flex-col items-center gap-1 bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground lg:min-h-14 lg:flex-row lg:bg-transparent lg:px-14 lg:pb-0 lg:text-left lg:text-sidebar-muted">
        <span>{copyright}</span>
        {testSystem ? <span className="lg:ml-auto">{tAuth("testSystemNote")}</span> : null}
      </footer>
    </div>
  )
}
