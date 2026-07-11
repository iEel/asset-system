"use client"

import { useRef, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"

type LoginFormProps = {
  callbackUrl: string
  sessionExpired: boolean
}

export function LoginForm({ callbackUrl, sessionExpired }: LoginFormProps) {
  const t = useTranslations("auth")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const passwordRef = useRef<HTMLInputElement>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        setPassword("")
        setError(t("loginFailed"))
        passwordRef.current?.focus()
        return
      }

      router.replace(callbackUrl)
      router.refresh()
    } catch {
      setPassword("")
      setError(tCommon("error"))
      passwordRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {sessionExpired ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-md bg-info/10 px-3 py-2.5 text-sm text-info-foreground"
        >
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("sessionExpired")}</span>
        </div>
      ) : null}

      <div>
        <label htmlFor="login-username" className="mb-1.5 block text-sm font-medium text-foreground">
          {t("username")}
        </label>
        <input
          id="login-username"
          name="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value)
            setError("")
          }}
          className="h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 sm:h-10 sm:text-sm"
          required
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-foreground">
          {t("password")}
        </label>
        <div className="relative">
          <input
            ref={passwordRef}
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError("")
            }}
            className="h-11 w-full rounded-md border border-border bg-surface px-3 pr-12 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 sm:h-10 sm:text-sm"
            required
          />
          <button
            type="button"
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            aria-controls="login-password"
            aria-pressed={showPassword}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              setShowPassword((visible) => !visible)
              passwordRef.current?.focus()
            }}
            className="absolute inset-y-0 right-0 inline-flex min-h-11 min-w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-accent sm:min-h-10 sm:min-w-10"
          >
            {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" />
        <span>{t("directoryLoginHint")}</span>
      </div>

      {error ? (
        <div role="alert" aria-live="polite" className="rounded-md bg-danger/10 px-3 py-2.5 text-sm text-danger-foreground">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 sm:h-10"
      >
        {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
        <span>{loading ? t("loggingIn") : t("login")}</span>
      </button>
    </form>
  )
}
