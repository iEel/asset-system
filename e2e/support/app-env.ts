// The environment `next start` gives the app under test: Next's own loader (@next/env, production mode) over the
// project's env files (.env.production.local, .env.local, .env.production, .env; the process environment wins), read
// without printing or keeping a value. playwright.config.ts runs the guard on it before anything else starts.
import * as nextEnvModule from "@next/env"
import { assertDevDatabase, assertLocalUploadDir } from "./env-guard.ts"

// @next/env is CommonJS marked __esModule: Playwright's loader sees its named exports, Node's ESM loader only a default.
const nextEnv: typeof nextEnvModule =
  "loadEnvConfig" in nextEnvModule ? nextEnvModule : (nextEnvModule as unknown as { default: typeof nextEnvModule }).default
const silent = { info: () => undefined, error: () => undefined }

export function readAppEnv(root: string): Record<string, string | undefined> {
  const { combinedEnv } = nextEnv.loadEnvConfig(root, false, silent, true)
  const env = { ...combinedEnv }
  // loadEnvConfig writes the files into process.env: put it back, so no value reaches the runner, a worker or the
  // web server through this read (next start loads the same files itself).
  nextEnv.resetEnv()
  return env
}

export function guardAppEnv(root: string) {
  const env = readAppEnv(root)
  return { ...assertDevDatabase(env), uploads: assertLocalUploadDir(env, root) }
}
