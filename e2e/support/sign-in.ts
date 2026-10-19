// One sign-in through the login page, with a known account, and never a second try (spec §11 "No failed login
// anywhere"): a local password that fails is passed on to LDAP (src/lib/auth.ts), and the dev settings point at the
// company AD. So this helper submits only once the form is live, only with the whole password in its field, and stops
// the run on a refusal. The password goes into the field through the DOM, so no step title, trace or report holds it.
import type { Page } from "@playwright/test"

export class SignInRefusedError extends Error {
  name = "SignInRefusedError"
}

export async function signInOnce(page: Page, username: string, password: string, locale = "th"): Promise<void> {
  // A submit before hydration would be the browser's own GET of the form, with the password in the URL.
  const leaks: string[] = []
  const watchLeak = (request: { url(): string }) => {
    if (/[?&]password=/i.test(request.url())) leaks.push(request.url().split("?")[0])
  }
  page.on("request", watchLeak)
  try {
    await page.goto(`/${locale}/login`)
    const usernameField = page.locator("#login-username")
    const passwordField = page.locator("#login-password")
    // React marks a hydrated element with its props; the form handles the submit only from then on.
    await page.waitForFunction(() => {
      const input = document.querySelector("#login-username")
      return Boolean(input && Object.keys(input).some((key) => key.startsWith("__reactProps$")))
    })
    await usernameField.fill(username)
    await passwordField.evaluate((input, value) => {
      const field = input as HTMLInputElement
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(field, value)
      field.dispatchEvent(new Event("input", { bubbles: true }))
    }, password)
    const held = await passwordField.evaluate((input) => (input as HTMLInputElement).value.length)
    const heldUsername = await usernameField.inputValue()
    if (held !== password.length || heldUsername !== username) {
      throw new SignInRefusedError(`Sign-in for ${username} not submitted: the form did not hold the account. The run stops here.`)
    }
    await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click()
    const refusal = page.locator("form [role=alert]")
    const outcome = await Promise.race([
      page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 30_000 }).then(() => "signed-in" as const),
      refusal.waitFor({ state: "visible", timeout: 30_000 }).then(() => "refused" as const),
    ]).catch(() => "no-answer" as const)
    if (outcome !== "signed-in") {
      throw new SignInRefusedError(
        `Sign-in for ${username} ${outcome === "refused" ? "was refused" : "had no answer in 30 s"}. The run stops and never tries again: a failed local sign-in goes on to the company AD.`
      )
    }
  } finally {
    page.off("request", watchLeak)
  }
  if (leaks.length > 0) throw new SignInRefusedError(`Sign-in for ${username} sent the password in a URL (${leaks.join(", ")}). The run stops here.`)
}
