// The run's state on disk (e2e/.state, git-ignored): run.json names the current run (the global setup writes it);
// each run keeps what its setup created, with the users' generated passwords (run-data.json), and its sessions in its
// own folder. Nothing here prints a value.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import type { WorkflowApprovalPolicy } from "../../src/lib/workflow-approval.ts"
import { fromRoot, RUN_FILE } from "./paths.ts"

export type RunState = {
  runId: string
  startedAt: string
  baseURL: string
  database: string
  login: string
  approval: { policy: WorkflowApprovalPolicy; storedKeys: string[] }
}

function writeJson(relative: string, value: unknown) {
  const file = fromRoot(relative)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(fromRoot(relative), "utf8")) as T
}

export function writeRunState(state: RunState) {
  writeJson(RUN_FILE, state)
}

export function readRunState(): RunState {
  return readJson<RunState>(RUN_FILE)
}
