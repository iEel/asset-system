import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { LoginForm } from "@/components/auth/login-form"
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
  const [{ locale }, query, tAuth, tCommon] = await Promise.all([
    params,
    searchParams,
    getTranslations("auth"),
    getTranslations("common"),
  ])
  const allowedOrigins = [process.env.AUTH_URL, process.env.NEXTAUTH_URL].filter(
    (origin): origin is string => Boolean(origin)
  )
  const callbackUrl = normalizeLoginCallbackUrl(locale, query.callbackUrl, allowedOrigins)
  const sessionExpired = isSessionExpiredLogin(query.reason, query.error)

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 sm:px-6">
      <div className="w-full max-w-sm">
        <header className="mb-6 text-center sm:mb-7">
          <Image
            src="/icon.png"
            alt=""
            aria-hidden="true"
            width={72}
            height={72}
            priority
            className="mx-auto mb-4 h-16 w-16 rounded-xl sm:h-[72px] sm:w-[72px]"
          />
          <h1 className="text-balance text-2xl font-bold text-brand-navy">{tCommon("appName")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Asset Management System</p>
        </header>

        <section aria-labelledby="login-heading" className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-7">
          <h2 id="login-heading" className="mb-6 text-center text-xl font-semibold text-brand-navy">
            {tAuth("login")}
          </h2>
          <LoginForm callbackUrl={callbackUrl} sessionExpired={sessionExpired} />
        </section>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Asset Management System
        </p>
      </div>
    </main>
  )
}
