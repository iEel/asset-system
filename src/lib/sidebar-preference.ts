// The desktop menu's width: one cookie per browser, like the theme. Only an exact "collapsed" collapses the menu to
// its icon rail; no cookie, or any other value, means the expanded menu. The dashboard layout reads the cookie so the
// first paint is right; the shell writes it on every change (menu B shell spec §6.2).
// Tests import this module, so it has no path-alias import and touches no browser API.

export const SIDEBAR_COOKIE = "sidebar"

export type SidebarPreference = "collapsed" | "expanded"

export function parseSidebarPreference(value: string | undefined): SidebarPreference {
  return value === "collapsed" ? "collapsed" : "expanded"
}

export function sidebarCookieString(pref: SidebarPreference): string {
  return `${SIDEBAR_COOKIE}=${pref}; Path=/; Max-Age=31536000; SameSite=Lax`
}
