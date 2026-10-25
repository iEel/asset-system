"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { WifiOff } from "lucide-react"
import { pickShellBanner } from "@/lib/shell-banner"
import { useOnlineStatus } from "@/lib/use-online-status"
import { cn } from "@/lib/utils"

const noop = () => {}

// Two contexts: the setters never change, so a page that only sets its line never re-renders on banner changes.
const SettersContext = createContext<{ setPageLine: (line: string | null) => void; setSession: (content: React.ReactNode | null) => void }>({ setPageLine: noop, setSession: noop })
const StateContext = createContext<{ pageLine: string | null; session: React.ReactNode | null }>({ pageLine: null, session: null })

export function ShellBannerProvider({ children }: { children: React.ReactNode }) {
  const [pageLine, setPageLine] = useState<string | null>(null)
  const [session, setSession] = useState<React.ReactNode | null>(null)
  const setters = useMemo(() => ({ setPageLine, setSession }), [])
  const state = useMemo(() => ({ pageLine, session }), [pageLine, session])

  return (
    <SettersContext.Provider value={setters}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </SettersContext.Provider>
  )
}

/** The page's own line; it shows only offline, as the offline message's second clause. Cleared on unmount. */
export function useShellBannerSlot(line: string | null): void {
  const { setPageLine } = useContext(SettersContext)
  useEffect(() => {
    setPageLine(line)
    return () => setPageLine(null)
  }, [line, setPageLine])
}

/** The session message (Task 12a); pass a memoized element. Hidden while offline. Cleared on unmount. */
export function useShellBannerSession(content: React.ReactNode | null): void {
  const { setSession } = useContext(SettersContext)
  useEffect(() => {
    setSession(content)
    return () => setSession(null)
  }, [content, setSession])
}

/** The one banner region under the top bar (The One Banner Rule): always mounted, empty when nothing shows. */
export function ShellBanner() {
  const tCommon = useTranslations("common")
  const { pageLine, session } = useContext(StateContext)
  const online = useOnlineStatus()
  const view = pickShellBanner({ online, session, pageLine })
  const regionRef = useRef<HTMLDivElement>(null)

  // Its height goes into --shell-banner, so --shell-top places the toasts and 100dvh heights under it.
  useEffect(() => {
    const region = regionRef.current
    if (!region || typeof ResizeObserver === "undefined") return
    const root = document.documentElement
    const observer = new ResizeObserver(() => {
      root.style.setProperty("--shell-banner", `${region.offsetHeight}px`)
    })
    observer.observe(region)
    return () => {
      observer.disconnect()
      root.style.removeProperty("--shell-banner")
    }
  }, [])

  return (
    <div
      ref={regionRef}
      role="status"
      data-shell-banner
      className={cn("shrink-0", view && "flex items-start gap-2 border-b border-warning-border bg-warning-soft px-4 py-2 text-sm text-warning sm:px-6")}
    >
      {view?.kind === "offline" ? (
        <>
          <WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p className="min-w-0">{view.pageLine ? tCommon("offlineBannerWith", { detail: view.pageLine }) : tCommon("offlineBanner")}</p>
        </>
      ) : view?.kind === "session" ? (
        view.session
      ) : null}
    </div>
  )
}
