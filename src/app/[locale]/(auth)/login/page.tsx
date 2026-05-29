"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import { Package, Loader2, ShieldCheck } from "lucide-react"

export default function LoginPage() {
  const t = useTranslations("auth")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(t("loginFailed"))
      } else {
        router.replace(`/${locale}`)
        router.refresh()
      }
    } catch {
      setError(tCommon("error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 sm:px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-6 text-center sm:mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary sm:h-16 sm:w-16">
            <Package className="h-7 w-7 text-white sm:h-8 sm:w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {tCommon("appName")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Asset Management System
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-8">
          <h2 className="mb-6 text-center text-xl font-semibold">
            {t("login")}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t("username")}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:text-sm"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t("password")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:h-10 sm:text-sm"
                required
              />
            </div>

            <div className="flex items-start gap-2 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{t("directoryLoginHint")}</span>
            </div>

            {error && (
              <div className="rounded-md bg-danger/10 p-3 text-sm text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:h-10"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("login")}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          © 2026 Asset Management System
        </p>
      </div>
    </div>
  )
}
