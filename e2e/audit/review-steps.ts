// The findings page (/th/audit/findings, messages/th.json auditFinding) and the refusals the UI never sends: find one
// finding, and send a request from the page as the person's browser would.
import type { Locator, Page } from "@playwright/test"
import type { E2eDevice } from "../support/matrix.ts"

// A finding on the findings page: a card on the phone, a table row on the desktop (both are in the page; one is hidden).
export function findingEntry(page: Page, device: E2eDevice, tag: string, typeLabel: string): Locator {
  const entries = device === "phone" ? page.locator("div.grid.md\\:hidden > div") : page.locator("tbody tr")
  return entries.filter({ hasText: tag }).filter({ hasText: typeLabel })
}

// A request from the page itself (the same session and cookies), for a refusal the UI never sends: the button is not
// offered, so the route's own answer is read this way.
export async function browserFetch(page: Page, url: string, method: string, body: unknown): Promise<{ status: number; body: unknown }> {
  return page.evaluate(
    async ({ url, method, body }) => {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      return { status: response.status, body: (await response.json().catch(() => null)) as unknown }
    },
    { url, method, body },
  )
}
