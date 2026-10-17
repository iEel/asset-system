// The light/dark theme choice: one cookie per browser. No cookie, or any other value, means "follow the OS".
// The root layout reads the cookie and renders it as the data-theme attribute of <html>; ThemeToggle writes it.
// Tests import this module, so it has no path-alias import and touches no browser API.

export const THEME_COOKIE = "theme"

export type ThemeChoice = "light" | "dark"

// The value of <meta name="theme-color">: one color for an explicit choice, a media pair when following the OS.
export type ThemeColor = string | Array<{ media: string; color: string }>

// The chrome color of each theme: its --sidebar token (the sidebar, the topbar and the phone bottom bar).
export const THEME_COLORS = { "light": "#FFFFFF", "dark": "#0D182A" } as const

export function parseThemeChoice(value: string | undefined | null): ThemeChoice | null {
  return value === "light" || value === "dark" ? value : null
}

export function themeCookieString(choice: ThemeChoice): string {
  return `${THEME_COOKIE}=${choice}; Path=/; Max-Age=31536000; SameSite=Lax`
}

export function themeColorFor(choice: ThemeChoice | null): ThemeColor {
  if (choice) return THEME_COLORS[choice]
  return [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ]
}

// The theme a press of the toggle switches to: away from the one on screen, which is the <html> attribute when it
// holds a choice and the OS preference otherwise.
export function nextThemeChoice(current: string | undefined | null, prefersDark: boolean): ThemeChoice {
  const onScreen = parseThemeChoice(current) ?? (prefersDark ? "dark" : "light")
  return onScreen === "dark" ? "light" : "dark"
}
