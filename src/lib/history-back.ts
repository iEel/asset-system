// The access-denied page's "กลับหน้าก่อน" goes back only when the tab has an earlier entry that is a page of this app.
// A new tab, a bookmark, a typed URL or a link from another site (a notification email) has nothing to go back to, so
// the button goes home instead (final review, group 12 plan 1). Tests import this file directly, so it has no imports.
export function canGoBack(historyLength: number, referrer: string, origin: string): boolean {
  if (historyLength <= 1 || !referrer) return false
  try {
    return new URL(referrer).origin === origin
  } catch {
    return false
  }
}
