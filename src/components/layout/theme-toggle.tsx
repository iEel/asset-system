"use client"

import { Moon, Sun } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { THEME_COLORS, nextThemeChoice, themeCookieString } from "@/lib/theme"

// Both faces render and globals.css shows the one for the theme on screen, so the first paint is right and nothing
// changes after hydration. A press switches the page at once, and the cookie keeps the choice for the next visit.
export function ThemeToggle() {
  const t = useTranslations("common")

  const switchTheme = () => {
    const root = document.documentElement
    const next = nextThemeChoice(root.dataset.theme, window.matchMedia("(prefers-color-scheme: dark)").matches)
    root.dataset.theme = next
    document.cookie = themeCookieString(next)
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      meta.content = THEME_COLORS[next]
      meta.removeAttribute("media")
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={switchTheme}>
      <Moon aria-hidden="true" data-when-theme="light" className="size-5" />
      <Sun aria-hidden="true" data-when-theme="dark" className="size-5" />
      <span data-when-theme="light" className="sr-only">{t("switchToDark")}</span>
      <span data-when-theme="dark" className="sr-only">{t("switchToLight")}</span>
    </Button>
  )
}
