// Picks the menu row for the current page: the longest menu href that equals the path or is a prefix ending at "/".
export type NavigationHrefNode = {
  href?: string
  children?: NavigationHrefNode[]
}

function normalizePath(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0] || "/"
  return path.length > 1 ? path.replace(/\/+$/, "") || "/" : path
}

export function getActiveNavigationHref(pathname: string, hrefs: readonly string[]): string | null {
  const path = normalizePath(pathname)
  let active: string | null = null
  for (const href of hrefs) {
    const matches = path === href || path.startsWith(`${href}/`)
    if (matches && (active === null || href.length > active.length)) active = href
  }
  return active
}

// True only when the current page IS this menu entry (not a detail page under it).
export function isExactNavigationMatch(pathname: string, href: string): boolean {
  return normalizePath(pathname) === href
}

export function collectNavigationHrefs(items: readonly NavigationHrefNode[]): string[] {
  return items.flatMap((item) => [...(item.href ? [item.href] : []), ...collectNavigationHrefs(item.children ?? [])])
}

export function containsNavigationHref(item: NavigationHrefNode, href: string | null): boolean {
  if (href === null) return false
  if (item.href === href) return true
  return (item.children ?? []).some((child) => containsNavigationHref(child, href))
}
