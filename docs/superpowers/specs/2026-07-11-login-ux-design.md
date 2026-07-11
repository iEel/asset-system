# Login UX Design

## Goal

Refresh the existing Login screen as a restrained Light Modern Enterprise surface while preserving the current Local and AD/LDAP credential flow, eight-hour session policy, role-aware home routing, and generic authentication failure response.

## Visual Direction

- Keep the centered, single-column sign-in layout on desktop and mobile.
- Use the committed design tokens: Light Slate page background, Surface White form, Brand Navy headings, Action Blue primary button, Electric Blue focus, Slate borders, and semantic danger colors.
- Use the real application icon instead of a decorative Lucide package tile. Lucide remains the source for interface icons such as password visibility and directory/security context.
- Keep the form quiet: no split-screen marketing panel, gradients, glass effects, illustration, nested cards, or additional promotional copy.
- Present the Local/AD/LDAP guidance as secondary inline help rather than a warning-like bordered panel.

## Form And Accessibility

- Associate visible labels with stable input `id` values through `htmlFor`.
- Add `name="username"`, `autoComplete="username"`, `name="password"`, and `autoComplete="current-password"`.
- Keep mobile inputs and the primary action at least 44px high and keep input text at 16px on mobile.
- Add an Eye/EyeOff password visibility button inside the password field. It has a localized accessible name, keeps focus in the field, and does not change the submitted value.
- Authentication errors use the shared semantic danger palette, `role="alert"`, and `aria-live="polite"`.
- On authentication failure, keep the username, clear the password, focus the password field, and remove the stale error when the user edits either credential.
- The submit button exposes `aria-busy` and localized loading copy while disabled.

## Redirect And Session State

- Read optional `callbackUrl`, `reason`, and `error` query parameters in the server page and pass normalized presentation state to the client form.
- Accept callback URLs only when they resolve to the same origin and remain under the active locale root. Reject protocol-relative URLs, cross-origin URLs, backslashes, and another locale. Invalid values fall back to `/{locale}` so existing role-aware routing remains authoritative.
- After successful login, navigate to the safe callback URL when present; otherwise navigate to `/{locale}`.
- Show the existing localized `sessionExpired` message when `reason=session-expired` or `error=SessionExpired`. The message is informational and does not replace authentication errors.

## Testing

- Unit tests cover safe callback normalization, rejected external/cross-locale values, and session-expired query parsing.
- Source-level UI regression tests cover label association, autofill metadata, password visibility, semantic error behavior, password reset/focus, loading state, real app icon, and token-based styling.
- Browser QA covers the initial and error states at 390px and desktop, checks for horizontal overflow, accessible labels, 44px targets, callback navigation wiring, and console errors.

## Non-Goals

- No password-reset workflow, remember-me option, MFA, authentication provider split, LDAP configuration change, session-duration change, or API contract change.
- No changes to credential validation, LDAP fallback, RBAC, or the role-aware default home resolver.
