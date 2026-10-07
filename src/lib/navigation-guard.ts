export type LinkClickLike = {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  defaultPrevented: boolean
}

export type AnchorLike = {
  target: string
  hasAttribute(name: string): boolean
  getAttribute(name: string): string | null
}

export function shouldGuardLinkClick(event: LinkClickLike, anchor: AnchorLike) {
  if (event.defaultPrevented || event.button !== 0) return false
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  if (anchor.target && anchor.target !== "_self") return false
  if (anchor.hasAttribute("download")) return false
  const href = anchor.getAttribute("href")
  return href !== null && href !== "" && !href.startsWith("#")
}
