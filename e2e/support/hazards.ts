// The hazards of spec §4, §5 and §11, in code: the requests the suite never makes. The dev settings point at the
// company AD and hold the LDAP bind password copied from Production; the dev database is a copy of Production's data on
// the instance Production shares. fixtures.ts stops each of these in every test's browser context (aborted before it
// leaves, and the test fails); tests/e2e-review.test.ts checks that no file of the suite names one, which also covers
// the API calls of page.request and request.newContext that a browser route never sees. Pure: imports nothing.
export type Hazard = {
  id: string
  reason: string
  // The request path it matches (the URL's pathname), and the methods it takes when not all of them.
  path: RegExp
  methods?: readonly string[]
}

export const HAZARDS: readonly Hazard[] = [
  {
    id: "ldap",
    reason: "LDAP sync and the LDAP test bind to the company AD (spec §4, §5)",
    path: /^\/api\/admin\/settings\/ldap-(?:sync|test)(?:\/|$)/,
  },
  {
    id: "settings-save",
    reason: "the settings save writes the LDAP configuration copied from Production, with its bind password (spec §5)",
    path: /^\/api\/admin\/settings\/?$/,
    methods: ["POST", "PUT", "PATCH", "DELETE"],
  },
  {
    id: "excel-import",
    reason: "Excel import is not run on the dev database (spec §4, wiki #36)",
    path: /^\/api\/assets\/import-(?:preview|confirm)(?:\/|$)/,
  },
  {
    id: "notification-digest",
    reason: "the digest posts to a webhook outside the app (spec §5: nothing that sends mail or reaches a company system)",
    path: /^\/api\/notifications\/digest(?:\/|$)/,
  },
  {
    id: "integrations",
    reason: "the integration API and its clients are out of scope (spec §4)",
    path: /^\/api\/(?:integrations|admin\/integration-clients)(?:\/|$)/,
  },
  {
    id: "stored-files",
    reason: "the storage tools move stored files (spec §5: the suite deletes nothing)",
    path: /^\/api\/admin\/storage(?:\/|$)/,
  },
  {
    id: "sign-in",
    reason: "a test never signs in: the run's sessions do, once each, and a failed local sign-in goes on to the company AD (spec §11)",
    path: /^\/api\/auth\/callback\/credentials(?:\/|$)/,
  },
  {
    id: "delete",
    reason: "the suite deletes nothing (spec §5)",
    path: /^\//,
    methods: ["DELETE"],
  },
]

const pathOf = (url: string) => new URL(url, "http://localhost").pathname

// The hazard a request would be, or undefined.
export function hazardOf(method: string, url: string): Hazard | undefined {
  const pathname = pathOf(url)
  const upper = method.toUpperCase()
  return HAZARDS.find((hazard) => hazard.path.test(pathname) && (!hazard.methods || hazard.methods.includes(upper)))
}

// The paths a browser context routes, whatever the method (a GET of the settings goes on). A DELETE can go to any path,
// so it is not routed: routing every request would put every API call through the route, and WebKit cannot resend an
// intercepted request body (rehearsal note N-AU8). fixtures.ts catches a DELETE as it is sent and fails the test.
export function isHazardPath(url: string): boolean {
  const pathname = pathOf(url)
  return HAZARDS.some((hazard) => hazard.id !== "delete" && hazard.path.test(pathname))
}
