# Dialog Focus Stability Design

## Problem

`AccessibleDialog` installs focus management in an effect that depends on `busy` and `onClose`. Callers commonly pass an inline `onClose` function. Controlled form input changes therefore create a new callback, tear down the effect, restore focus, and run initial autofocus again. In the maintenance close dialog this moves focus from the root-cause textarea to the first control, the return-date field, after every keystroke.

## Approved Outcome

- Initial autofocus runs once when the dialog opens.
- Typing, selecting fields, or changing `busy` while the dialog remains open does not move focus.
- Escape and backdrop closing always use the latest `onClose` and `busy` values.
- Focus restoration still runs once when the dialog closes.
- The fix applies centrally to every `AccessibleDialog` consumer without changing caller APIs.

## Approach

Keep the current public props. Store the latest `onClose`, `busy`, and `initialFocusRef` props in internal refs updated by a small synchronization effect. The focus setup, keyboard listener, and focus restoration effect depends only on `open`, and reads the latest values from those refs when events occur.

Alternatives rejected:

- Memoizing `onClose` in each caller leaves other dialogs vulnerable and `busy` still restarts focus management.
- Removing dependencies without refs creates stale Escape/backdrop behavior.

## Testing

Extend the existing source-level accessible-dialog regression test to require latest-value refs, require event handlers to read them, and reject the old effect dependency list. Run the focused test red/green, then ESLint, TypeScript, the full test suite, and a production build.

## Scope

No visual redesign, caller API change, dependency addition, or maintenance workflow change.
