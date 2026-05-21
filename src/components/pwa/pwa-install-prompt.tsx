"use client"

import { Download, Share2, Smartphone } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function PwaInstallPrompt() {
  const t = useTranslations("pwaInstall")
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosInstallHint, setIosInstallHint] = useState(false)
  const [open, setOpen] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const initialStateTimer = window.setTimeout(() => {
      const standalone = isStandaloneMode()
      setInstalled(standalone)
      setIosInstallHint(isIosBrowser() && !standalone)
    }, 0)

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    function handleInstalled() {
      setInstalled(true)
      setInstallPrompt(null)
      setOpen(false)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)
    return () => {
      window.clearTimeout(initialStateTimer)
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
    }
  }, [])

  if (installed || (!installPrompt && !iosInstallHint)) return null

  async function installApp() {
    if (!installPrompt) {
      setOpen((current) => !current)
      return
    }

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice.catch(() => null)
    if (choice?.outcome === "accepted") {
      setInstalled(true)
      setInstallPrompt(null)
    }
    setOpen(false)
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={installApp}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary sm:px-3"
        aria-label={t("title")}
        title={t("title")}
      >
        <Download className="h-4 w-4" />
        <span className="hidden xl:inline">{t("install")}</span>
      </button>

      {iosInstallHint && open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-border bg-surface p-4 text-sm shadow-lg">
          <div className="flex items-start gap-3">
            <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-primary">
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-foreground">{t("iosTitle")}</div>
              <p className="mt-1 text-muted-foreground">{t("iosHint")}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-info/30 bg-info/10 p-2 text-xs text-foreground">
            <Share2 className="h-4 w-4 shrink-0 text-info" />
            <span>{t("iosSteps")}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function isStandaloneMode() {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true
}

function isIosBrowser() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
