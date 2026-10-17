"use client"

import { useRef, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"

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
        setError(result.code === "rate_limited" ? t("loginRateLimited") : t("loginFailed"))
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
        <Notice tone="info" role="status" aria-live="polite">
          {t("sessionExpired")}
        </Notice>
      ) : null}

      <div className="grid gap-1.5">
        <FieldLabel htmlFor="login-username">{t("username")}</FieldLabel>
        <Input
          id="login-username"
          name="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value)
            setError("")
          }}
          required
          autoFocus
        />
      </div>

      <div className="grid gap-1.5">
        <FieldLabel htmlFor="login-password">{t("password")}</FieldLabel>
        <div className="relative">
          <Input
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
            className="pr-12"
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
            className="absolute inset-y-0 right-0 inline-flex min-h-11 min-w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-10 md:min-w-10"
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
        <Notice tone="danger" role="alert" aria-live="polite">
          {error}
        </Notice>
      ) : null}

      <Button type="submit" busy={loading} className="w-full">
        {t("login")}
      </Button>
    </form>
  )
}
