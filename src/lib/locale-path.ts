// Switching the language keeps the page: only the first path segment changes, and only when it is the current locale.
export function switchLocalePath(pathname: string, from: string, to: string): string {
  const [, first, ...rest] = pathname.split("/")
  if (first === from) return ["", to, ...rest].join("/")
  return `/${to}${pathname.startsWith("/") ? pathname : `/${pathname}`}`
}
