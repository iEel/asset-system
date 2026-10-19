// Where the E2E suite keeps what it writes. Every path is relative to the repo root, the working directory of
// `npm run test:e2e`, and every one of them is git-ignored (.gitignore, "E2E suite"). Imports nothing but node:path, so
// tests/e2e-suite.test.ts can load it.
import path from "node:path"

// The app under test: a production build served by next start on its own port (spec §5, "The app under test").
export const DEFAULT_E2E_PORT = 3100
export function e2ePort(env: Record<string, string | undefined> = process.env): number {
  const port = Number(env.E2E_PORT ?? DEFAULT_E2E_PORT)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error(`E2E_PORT must be a port number from 1024 to 65535`)
  return port
}
export function e2eBaseUrl(env: Record<string, string | undefined> = process.env): string {
  return `http://localhost:${e2ePort(env)}`
}

// Playwright's HTML report, its per-test artifacts (traces, screenshots) and the run summary.
export const REPORT_DIR = "e2e-report"
export const RESULTS_DIR = "e2e-results"
export const ARTIFACTS_DIR = `${RESULTS_DIR}/artifacts`
export const SUMMARY_FILE = `${RESULTS_DIR}/summary.json`

// The run's state: the run id (run.json, rewritten by every run), and per run what its setup created (run-data.json,
// with the users' generated passwords) and its browser sessions. Never printed, never committed.
export const STATE_DIR = "e2e/.state"
export const RUN_FILE = `${STATE_DIR}/run.json`
export const ADMIN_STATE_FILE = `${STATE_DIR}/seed-admin.json`
export function runDir(runId: string): string {
  return `${STATE_DIR}/${runId}`
}
export function runDataFile(runId: string): string {
  return `${runDir(runId)}/run-data.json`
}
export function authStateFile(runId: string, userKey: string): string {
  return `${runDir(runId)}/auth/${userKey}.json`
}

// The seed admin's sign-in, written by the controller (never committed: .env* is ignored).
export const SEED_LOGIN_FILE = ".env.e2e"

export function fromRoot(relative: string, root: string = process.cwd()): string {
  return path.resolve(root, relative)
}
