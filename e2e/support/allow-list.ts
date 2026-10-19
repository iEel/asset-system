// The reviewed allow-list (spec §8: "none allowed, except a short reviewed allow-list"; §10: each entry reviewed and
// justified). An entry lets one kind of record through when every field it names matches; its reason says why the
// record is not the app failing, and reviewed is the day a person (or the controller) checked it. Keep it short: a new
// entry needs the same review, and tests/e2e-measure.test.ts checks every entry has both.
import type { AllowEntry } from "./measure-core.ts"

export const ALLOW_LIST: readonly AllowEntry[] = [
  {
    id: "next-prefetch-cancelled",
    kind: "requestfailed",
    url: /[?&]_rsc=/,
    errorText: /^(?:net::ERR_ABORTED|cancelled|Load request cancelled)$/,
    reason:
      "Next.js prefetches the routes of the links on screen (RSC payloads, ?_rsc=) and cancels the prefetches it no longer needs; Chromium reports each cancelled one as net::ERR_ABORTED. A cancelled prefetch is the router's choice, not a failed request; a prefetch answered with an error status is still a failure (a response record).",
    reviewed: "2026-10-19",
  },
]
