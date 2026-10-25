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
  {
    id: "foreign-attachment-thumbnail",
    kind: "response",
    url: /\/api\/attachments\/[0-9a-f-]{36}\/thumbnail$/,
    status: [404],
    reason:
      "An attachment row stores the absolute path of the upload folder that wrote it. The dev database is a copy of Production, so many rows hold Production paths (wiki #15, #25, #43), and rows written by another checkout of the app hold that checkout's folder; the thumbnail route answers 404 Attachment file not found for a path outside this app's UPLOAD_DIR (FX8; it answered 500 before) as for a file that is gone. The asset register shows the newest assets' thumbnails, so a workflow that the app sends there meets them. A test's own photo is checked on its own asset page, not through these thumbnails; a thumbnail that answers 500 is still a failure.",
    reviewed: "2026-10-20",
  },
  {
    id: "thumbnail-cancelled-on-leave",
    kind: "requestfailed",
    url: /\/api\/attachments\/[0-9a-f-]{36}\/thumbnail$/,
    errorText: /^(?:net::ERR_ABORTED|cancelled|Load request cancelled)$/,
    reason:
      "A list page loads its thumbnails as images; when the workflow moves on to the next page, the browser cancels the images still loading (Chromium net::ERR_ABORTED). A cancelled image is the browser leaving the page, not a failed request; a thumbnail answered with an error status is still a response record.",
    reviewed: "2026-10-19",
  },
  {
    id: "topbar-notifications-cancelled-by-redirect",
    kind: "requestfailed",
    url: /\/api\/notifications\?locale=[a-z]{2}$/,
    errorText: /^(?:net::ERR_ABORTED|cancelled|Load request cancelled)$/,
    reason:
      "The shell's notification provider (src/components/layout/shell-notifications.tsx) fetches the notifications as soon as a dashboard page hydrates, every 2 minutes while the page is visible, and when the tab becomes visible again; the dashboard's loading.tsx streams every page, so requirePagePermission's redirect to the access-denied page arrives after that, as a client navigation, and the browser cancels the fetch of the page it leaves. A cancelled fetch is the navigation's doing; the notifications answered with an error status are still a failure (a response record).",
    reviewed: "2026-10-21",
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
