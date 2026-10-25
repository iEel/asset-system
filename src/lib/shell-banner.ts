/** What the shell's one banner region shows (menu B shell §6.7, The One Banner Rule). */
export type ShellBannerView<S> = { kind: "offline"; pageLine: string | null } | { kind: "session"; session: S } | null

/**
 * Offline wins and carries the page's line as its second clause; online, the session message shows.
 * A page line never shows alone online.
 */
export function pickShellBanner<S>(input: { online: boolean; session: S | null; pageLine: string | null }): ShellBannerView<S> {
  if (!input.online) return { kind: "offline", pageLine: input.pageLine }
  if (input.session != null) return { kind: "session", session: input.session }
  return null
}
