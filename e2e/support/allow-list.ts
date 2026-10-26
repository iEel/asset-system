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
    // WebKit's page error for the same cancelled prefetch, as Playwright reports it (E2E-1025H, phone-light and
    // phone-dark): "Fetch API cannot load http: /localhost:3100/th/assets/<id>?_rsc=<key> due to access control checks."
    pageerrorText: /^Fetch API cannot load https?:\s?\/{1,2}\S*[?&]_rsc=\S* due to access control checks\.?$/,
    reason:
      "Next.js prefetches the routes of the links on screen (RSC payloads, ?_rsc=) and cancels the prefetches it no longer needs; Chromium reports each cancelled one as net::ERR_ABORTED. WebKit also raises a page error for it, \"Fetch API cannot load <url>?_rsc=<key> due to access control checks.\", which this entry allows for an _rsc URL only. A cancelled prefetch is the router's choice, not a failed request; a prefetch answered with an error status is still a failure (a response record).",
    reviewed: "2026-10-25",
  },
  {
    id: "foreign-attachment-thumbnail",
    kind: "response",
    url: /\/api\/attachments\/[0-9a-f-]{36}\/thumbnail(?:\?size=card)?$/,
    status: [404],
    reason:
      "An attachment row stores the absolute path of the upload folder that wrote it. The dev database is a copy of Production, so many rows hold Production paths (wiki #15, #25, #43), and rows written by another checkout of the app hold that checkout's folder; the thumbnail route answers 404 Attachment file not found for a path outside this app's UPLOAD_DIR (FX8; it answered 500 before) as for a file that is gone. The asset register shows the newest assets' thumbnails, so a workflow that the app sends there meets them. A test's own photo is checked on its own asset page, not through these thumbnails; a thumbnail that answers 500 is still a failure. The asset page's photo card loads the same route with ?size=card (group 1 asset detail task 4), the only query the entry accepts, so a foreign photo there is the same 404.",
    reviewed: "2026-10-26",
  },
  {
    id: "thumbnail-cancelled-on-leave",
    kind: "requestfailed",
    url: /\/api\/attachments\/[0-9a-f-]{36}\/thumbnail(?:\?size=card)?$/,
    errorText: /^(?:net::ERR_ABORTED|cancelled|Load request cancelled)$/,
    reason:
      "A list page loads its thumbnails as images; when the workflow moves on to the next page, the browser cancels the images still loading (Chromium net::ERR_ABORTED). A cancelled image is the browser leaving the page, not a failed request; a thumbnail answered with an error status is still a response record. The asset page's photo card (?size=card) is the same kind of image.",
    reviewed: "2026-10-26",
  },
  {
    id: "shell-requests-cancelled-by-navigation",
    kind: "requestfailed",
    url: /\/api\/(?:notifications\?locale=[a-z]{2}|session\/(?:status|keep-alive)|search\?q=[^&]*&locale=[a-z]{2})$/,
    errorText: /^(?:net::ERR_ABORTED|cancelled|Load request cancelled)$/,
    reason:
      "The shell makes its own background requests on every dashboard page: the notification summary as the page hydrates, every 2 minutes and when the tab shows again (src/components/layout/shell-notifications.tsx), the session status as the page hydrates and a keep-alive after input (src/components/layout/session-keeper.tsx), and the search, which aborts its own request when the words change (src/components/layout/global-search.tsx). A redirect that arrives as a client navigation, a page.goto or the search's own abort cancels them (Chromium net::ERR_ABORTED). A cancelled request is the navigation's or the component's doing; any of them answered with an error status is still a failure (a response record).",
    reviewed: "2026-10-25",
  },
  {
    id: "static-file-cancelled-on-leave",
    kind: "requestfailed",
    url: /\/_next\/static\/(?:media|chunks)\/[^/?]+\.(?:woff2|js|css)$/,
    errorText: /^(?:net::ERR_ABORTED|cancelled|Load request cancelled)$/,
    reason:
      "A page loads its fonts and script chunks from /_next/static; when the app navigates on before a file finishes, the browser cancels it (Chromium net::ERR_ABORTED). Task 51 saw it on the asset form after a save, and on the bare register, whose view memory restores the person's saved view at once with router.replace. A cancelled static file is the browser leaving the page, not a failed request; a static file answered with an error status is still a response record.",
    reviewed: "2026-10-21",
  },
]
