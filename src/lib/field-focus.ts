// Focus the first wrong field (V track, spec docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4.1, §4.2).
// In the dashboard the page itself does not scroll: <main data-dashboard-main> does, the topbar sits above it, and a
// sticky save bar can cover the bottom of it. The browser's own scroll on focus knows none of that, so inside main the
// field is scrolled so that it shows whole, from its label to its error line, clear of the top edge and of the save bar.
// Dialogs and sheets are portalled outside main and keep the browser's own scroll. fieldScrollTop is the pure part, for
// tests; the DOM functions run only in the browser.
export const FIELD_FOCUS_MARGIN = 24

// Viewport coordinates: the scroll area from viewTop to viewBottom, its last coverBottom pixels under the save bar, and
// the field (label to error line) from fieldTop to fieldBottom.
export type FieldScrollBox = {
  scrollTop: number
  viewTop: number
  viewBottom: number
  coverBottom: number
  fieldTop: number
  fieldBottom: number
}

// The scrollTop that shows the field, or null when it already shows. A field taller than the room is aligned by its top.
export function fieldScrollTop(box: FieldScrollBox): number | null {
  const top = box.viewTop + FIELD_FOCUS_MARGIN
  const bottom = box.viewBottom - box.coverBottom - FIELD_FOCUS_MARGIN
  if (box.fieldTop >= top && box.fieldBottom <= bottom) return null
  const tooTall = box.fieldBottom - box.fieldTop > bottom - top
  const next = box.fieldTop < top || tooTall ? box.scrollTop + box.fieldTop - top : box.scrollTop + box.fieldBottom - bottom
  return Math.max(0, next)
}

const CONTROL_SELECTOR =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
const CHECKED_RADIO_SELECTOR = 'input[type="radio"]:checked:not([disabled])'
const WRAPPER_SELECTOR = '[data-slot="field"], [data-slot="field-group"]'

// The target itself when it is a control; for a group, its checked radio, else its first enabled control.
function controlOf(target: HTMLElement): HTMLElement | null {
  if (target.matches(CONTROL_SELECTOR)) return target
  return target.querySelector<HTMLElement>(CHECKED_RADIO_SELECTOR) ?? target.querySelector<HTMLElement>(CONTROL_SELECTOR)
}

// A field inside a closed <details> cannot take focus until it opens.
function openClosedDetails(target: HTMLElement) {
  for (let node: HTMLElement | null = target; node; node = node.parentElement) {
    if (node.tagName === "DETAILS") (node as HTMLDetailsElement).open = true
  }
}

// From the label (or the field's wrapper) to the error line.
function fieldBounds(target: HTMLElement, control: HTMLElement): { top: number; bottom: number } {
  const parts: (Element | null)[] = [target, control, control.closest(WRAPPER_SELECTOR) ?? target.closest(WRAPPER_SELECTOR)]
  if (control.id) {
    parts.push(document.querySelector(`label[for="${CSS.escape(control.id)}"]`))
    parts.push(document.getElementById(`${control.id}-error`))
  }
  if (target !== control && target.id) parts.push(document.getElementById(`${target.id}-error`))
  let top = Infinity
  let bottom = -Infinity
  for (const part of parts) {
    if (!part) continue
    const rect = part.getBoundingClientRect()
    top = Math.min(top, rect.top)
    bottom = Math.max(bottom, rect.bottom)
  }
  return { top, bottom }
}

// Focuses the field's control and scrolls the dashboard scroll area so the field shows. Returns the focused control.
export function focusField(target: HTMLElement): HTMLElement | null {
  openClosedDetails(target)
  const control = controlOf(target)
  if (!control) return null
  // Blur first when it already has focus, so a screen reader reads the new error after Enter in that field.
  if (document.activeElement === control) control.blur()
  const main = control.closest<HTMLElement>("[data-dashboard-main]")
  if (!main) {
    control.focus()
    return control
  }
  control.focus({ preventScroll: true })
  const view = main.getBoundingClientRect()
  const footer = main.querySelector<HTMLElement>('[data-slot="sticky-form-footer"]')
  const field = fieldBounds(target, control)
  const next = fieldScrollTop({
    scrollTop: main.scrollTop,
    viewTop: view.top,
    viewBottom: view.bottom,
    coverBottom: footer ? footer.getBoundingClientRect().height : 0,
    fieldTop: field.top,
    fieldBottom: field.bottom,
  })
  if (next !== null) main.scrollTo({ top: next, behavior: "auto" })
  return control
}

// A field can mount a few frames late (a settings tab switches its panel, a dialog closes first): look once per frame.
export function waitForElement(id: string, frames = 30): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    let left = frames
    const look = () => {
      const element = document.getElementById(id)
      if (element || left <= 0) {
        resolve(element)
        return
      }
      left -= 1
      requestAnimationFrame(look)
    }
    look()
  })
}

// A review dialog closes before the form's field takes focus (spec §4.2): when a refusal comes back, focus is still in
// the dialog. The dialog that holds focus now counts as closed once it has left the page or lost its layout box (in the
// running app it stays connected after it has visibly closed). Radix then hands focus back to the opener, so after the
// close this resolves on the first focusin outside the dialog (in a task after it, so the hand-back finishes first) or
// after 10 more frames, whichever comes first, and the field takes focus last. It resolves at once when focus is in no
// dialog, gives up after `frames` frames in all, like waitForElement, and removes its focusin listener either way.
export function waitForDialogToClose(frames = 60): Promise<void> {
  const dialog = document.activeElement?.closest('[role="dialog"]')
  return new Promise((resolve) => {
    if (!dialog) {
      resolve()
      return
    }
    const closed = () => !dialog.isConnected || dialog.getClientRects().length === 0
    let done = false
    const finish = () => {
      if (done) return
      done = true
      document.removeEventListener("focusin", handBack)
      setTimeout(resolve, 0)
    }
    function handBack(event: FocusEvent) {
      if (closed() && !dialog?.contains(event.target as Node | null)) finish()
    }
    document.addEventListener("focusin", handBack)
    let left = frames
    let afterClose = 10
    const look = () => {
      if (done) return
      if (left <= 0) {
        finish()
        return
      }
      if (closed()) {
        if (afterClose <= 0) {
          finish()
          return
        }
        afterClose -= 1
      }
      left -= 1
      requestAnimationFrame(look)
    }
    look()
  })
}
