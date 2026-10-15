// Where a dialog or sheet puts focus when it opens (spec 2D D18). The close X now comes first in the DOM, so it is
// first in the Tab order, and Radix would focus it on open: Radix starts on the first tabbable element and skips only
// links (@radix-ui/react-focus-scope 1.2.0: getTabbableCandidates, removeLinks, focusFirst). DialogContent and
// SheetContent call focusFirstContentControl from onOpenAutoFocus, after the caller's own handler, unless that handler
// already moved focus (AccessibleDialog initialFocusRef, the scan room picker). It applies Radix's rule to everything
// after the X, so the first focus stays where it was before the X moved. No hooks and no React: tests import it.

// The X of DialogContent and of SheetContent. Radix Close merges its data-slot over Button's own.
export const dialogCloseSelector = '[data-slot="dialog-close"], [data-slot="sheet-close"]'

// The parts of an element the rule reads, so a test can pass a plain object.
export type FocusCandidate = {
  tagName: string
  tabIndex: number
  hidden: boolean
  disabled?: boolean
  type?: string
  matches: (selector: string) => boolean
}

// "reject" leaves out the X and everything inside it; "skip" leaves out the element but still looks inside it.
export function initialFocusVerdict(node: FocusCandidate): "accept" | "skip" | "reject" {
  if (node.matches(dialogCloseSelector)) return "reject"
  if (node.disabled || node.hidden || (node.tagName === "INPUT" && node.type === "hidden")) return "skip"
  if (node.tagName === "A") return "skip"
  return node.tabIndex >= 0 ? "accept" : "skip"
}

// Focuses the first control after the X, as Radix would: no scroll, an input's text selected, the next candidate when
// focus did not move. When nothing qualifies, Radix keeps its default (the X, or the dialog itself).
export function focusFirstContentControl(event: Event) {
  const container = event.target
  if (!(container instanceof HTMLElement)) return
  const previous = document.activeElement
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      const verdict = initialFocusVerdict(node as HTMLElement)
      if (verdict === "accept") return NodeFilter.FILTER_ACCEPT
      return verdict === "reject" ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP
    },
  })
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node as HTMLElement
    element.focus({ preventScroll: true })
    if (document.activeElement === previous) continue
    if (element instanceof HTMLInputElement) element.select()
    event.preventDefault()
    return
  }
}
