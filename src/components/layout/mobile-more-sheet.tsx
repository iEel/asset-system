"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { signOut } from "next-auth/react"
import { ChevronDown, ChevronRight, Globe, LogOut, SunMoon } from "lucide-react"
import { useRef, useState, type RefObject } from "react"
import { useNavigationMenu, type MenuItem } from "@/components/layout/sidebar"
import { switchTheme } from "@/components/layout/theme-toggle"
import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useMediaQuery } from "@/components/ui/use-media-query"
import type { SessionUser } from "@/lib/auth-utils"
import { switchLocalePath } from "@/lib/locale-path"
import { containsNavigationHref, isExactNavigationMatch } from "@/lib/navigation-active"
import { isSheetSwipeClose } from "@/lib/sheet-swipe"
import { getAccountDetailLine, getUserDisplayLabel, getUserInitial, type ShellAccount } from "@/lib/user-display"
import { cn } from "@/lib/utils"

const linkClasses =
  "flex min-h-12 items-center gap-3 px-4 text-sm text-foreground transition-colors motion-reduce:transition-none hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"

const activeLinkClasses =
  "bg-primary-soft font-medium text-primary-hover hover:bg-primary-soft forced-colors:outline forced-colors:outline-2 forced-colors:-outline-offset-2"

type ThemeFace = "light" | "dark"

// The phone's เพิ่มเติม: one bottom sheet with the person, the full permission-filtered menu, the language and theme
// switches, then sign-out (menu B shell, spec §6.6). It replaces the old left drawer, and the focus pages' hamburger
// opens it too.
export function MobileMoreSheet({
  open,
  onOpenChange,
  user,
  account,
  returnFocusRef,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: SessionUser
  account: ShellAccount
  returnFocusRef: RefObject<HTMLElement | null>
}) {
  const t = useTranslations("nav")
  const tAuth = useTranslations("auth")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const { sections, activeHref } = useNavigationMenu(user)
  const isWide = useMediaQuery("(min-width: 64rem)")
  const navRef = useRef<HTMLElement>(null)
  const dragRef = useRef<{ y: number; t: number } | null>(null)
  // Shorthand keys: the guard in tests/ui-overlay-guards.test.ts rejects the text of a Tailwind dark variant.
  const light = useRef<HTMLDivElement>(null)
  const dark = useRef<HTMLDivElement>(null)
  const faces = { light, dark }
  const detailLine = getAccountDetailLine([account.roleLabel, account.departmentLabel])

  // Each face of the theme switch says the theme on screen; globals.css shows the right one, so the sheet never
  // learns the theme (dark mode G6). After a switch, focus follows to the face that is now shown.
  const choose = (shown: ThemeFace) => (value: ThemeFace) => {
    if (value === shown) return
    switchTheme()
    faces[value].current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus()
  }

  const chooseLocale = (next: string) => {
    if (next === locale) return
    onOpenChange(false)
    router.push(switchLocalePath(pathname, locale, next))
  }

  const close = () => onOpenChange(false)

  return (
    <Sheet open={open && !isWide} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        id="mobile-more-sheet"
        aria-describedby={undefined}
        className="max-h-[85dvh] gap-0 rounded-t-xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          navRef.current?.querySelector<HTMLElement>("a[href]")?.focus()
        }}
        onCloseAutoFocus={(event) => {
          const opener = returnFocusRef.current
          const shown = (el: HTMLElement | null | undefined): el is HTMLElement => Boolean(el?.isConnected && el.getClientRects().length > 0)
          const target = shown(opener) ? opener : Array.from(document.querySelectorAll<HTMLElement>('[aria-controls="mobile-more-sheet"]')).find(shown)
          if (!target) return
          event.preventDefault()
          target.focus()
        }}
      >
        <SheetTitle className="sr-only">{t("mobileMore")}</SheetTitle>

        {/* The grab area: a drag or a quick flick down closes the sheet. */}
        <div
          data-more-sheet-grab
          className="shrink-0 touch-none"
          onPointerDown={(event) => {
            dragRef.current = { y: event.clientY, t: event.timeStamp }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerUp={(event) => {
            const start = dragRef.current
            dragRef.current = null
            if (start && isSheetSwipeClose(event.clientY - start.y, event.timeStamp - start.t)) close()
          }}
          onPointerCancel={() => {
            dragRef.current = null
          }}
        >
          <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-control-border" />
          <div data-more-sheet-person className="flex items-center gap-3 px-4 pb-3 pt-2 pr-16">
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground"
            >
              {getUserInitial(user)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-foreground">{getUserDisplayLabel(user)}</p>
              {detailLine ? <p className="truncate text-sm text-muted-foreground">{detailLine}</p> : null}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border-soft">
          <nav ref={navRef} data-more-sheet-nav aria-label={t("mainNavigation")} className="py-2">
            {sections.map((section) => {
              const headingId = `more-nav-section-${section.labelKey}`
              return (
                <div key={section.labelKey} role="group" aria-labelledby={headingId}>
                  <p id={headingId} className="flex h-8 items-end px-4 pb-1 text-xs font-medium text-muted-foreground">
                    {t(section.labelKey)}
                  </p>
                  {section.items.map((item) => (
                    <MoreSheetItem key={item.labelKey} item={item} activeHref={activeHref} pathname={pathname} t={t} onNavigate={close} />
                  ))}
                </div>
              )
            })}
          </nav>

          <div className="flex min-h-14 items-center gap-3 border-t border-border-soft px-4">
            <Globe aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            <span aria-hidden="true">{t("moreLanguage")}</span>
            <Segmented
              aria-label={t("moreLanguage")}
              value={locale}
              options={[
                { value: "th", label: <span lang="th">ภาษาไทย</span> },
                { value: "en", label: <span lang="en">English</span> },
              ]}
              onValueChange={chooseLocale}
              className="ml-auto"
            />
          </div>

          <div className="flex min-h-14 items-center gap-3 border-t border-border-soft px-4">
            <SunMoon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            <span aria-hidden="true">{t("moreTheme")}</span>
            <div className="ml-auto">
              {(["light", "dark"] as const).map((shown) => (
                <div key={shown} ref={faces[shown]} data-when-theme={shown}>
                  <Segmented
                    aria-label={t("moreTheme")}
                    value={shown}
                    options={[
                      { value: "light", label: t("themeLight") },
                      { value: "dark", label: t("themeDark") },
                    ]}
                    onValueChange={choose(shown)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border-soft p-4">
            <Button variant="danger" size="lg" className="w-full" onClick={() => void signOut({ callbackUrl: `/${locale}/login` })}>
              <LogOut aria-hidden="true" />
              {tAuth("logout")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

type MoreSheetItemProps = {
  item: MenuItem
  activeHref: string | null
  pathname: string
  t: (key: string) => string
  onNavigate: () => void
}

function MoreSheetItem(props: MoreSheetItemProps) {
  return props.item.children ? <MoreSheetGroup {...props} /> : <MoreSheetLink {...props} />
}

// A group opens by the desktop menu's rule: open when it holds the current page, and again after a navigation into it.
function MoreSheetGroup({ item, activeHref, pathname, t, onNavigate }: MoreSheetItemProps) {
  const containsActive = containsNavigationHref(item, activeHref)
  const [open, setOpen] = useState(containsActive)
  const [seenActiveHref, setSeenActiveHref] = useState(activeHref)

  if (seenActiveHref !== activeHref) {
    setSeenActiveHref(activeHref)
    if (containsActive) setOpen(true)
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={cn(linkClasses, "w-full text-left")}>
        <span className="shrink-0 text-muted-foreground">{item.icon}</span>
        <span className={cn("min-w-0 flex-1 truncate", open ? "font-semibold" : "font-medium")}>{t(item.labelKey)}</span>
        <span aria-hidden="true" className="shrink-0 text-muted-foreground">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {open ? (
        <div className="ml-6 border-l border-border pl-1">
          {item.children?.map((child) => (
            <MoreSheetItem key={child.labelKey} item={child} activeHref={activeHref} pathname={pathname} t={t} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function MoreSheetLink({ item, activeHref, pathname, t, onNavigate }: MoreSheetItemProps) {
  const isActive = item.href !== undefined && item.href === activeHref
  const ariaCurrent = isActive && item.href !== undefined ? (isExactNavigationMatch(pathname, item.href) ? "page" : "true") : undefined

  return (
    <Link href={item.href || "#"} onClick={onNavigate} aria-current={ariaCurrent} className={cn(linkClasses, isActive && activeLinkClasses)}>
      <span className={cn("shrink-0 text-muted-foreground", isActive && "text-primary")}>{item.icon}</span>
      <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
      {item.attention ? (
        <>
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-warning" />
          <span className="sr-only">{item.attention}</span>
        </>
      ) : null}
    </Link>
  )
}
